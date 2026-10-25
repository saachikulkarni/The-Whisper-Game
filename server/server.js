require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { connectDB, getStatus: isMongoConnected } = require("./db");
const GameModel = require("./models/Game");
const RoundModel = require("./models/Round");
const PlayerModel = require("./models/Player");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Connect to MongoDB with graceful in-memory fallback
connectDB();

app.use(express.static(path.join(__dirname, "..", "client")));

// In-Memory Active Games Store
const games = new Map();

/* =========================================================
   CONSTANTS
========================================================= */

const PHASES = {
    LOBBY: "lobby",
    WORD_PASS: "wordPass",
    QUESTIONS: "questions",
    VOTING: "voting",
    ROUND_RESULTS: "roundResults",
    FINAL_RESULTS: "finalResults"
};

const VOTE_OPTIONS = ["yes", "no"];

const DEFAULT_AVATARS = ["🦊", "🐼", "🦁", "🐯", "🦄", "🐸", "🐙", "🤖", "👽", "🦉", "🐵", "🐧", "🐲", "🐱", "🐶", "🚀"];

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value, maxLength = 100) {
    if (typeof value !== "string") return "";
    return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function generateGameCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code;
    do {
        code = "";
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
    } while (games.has(code));
    return code;
}

function generatePlayerId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function getGame(code) {
    return code ? games.get(String(code).toUpperCase()) : null;
}

function getPlayer(game, playerId) {
    return game.players.find(p => p.id === playerId);
}

function getPlayerBySocket(game, socketId) {
    return game.players.find(p => p.socketId === socketId);
}

function getPlayerIndex(game, playerId) {
    return game.players.findIndex(p => p.id === playerId);
}

function getRoomName(game) {
    return `game:${game.code}`;
}

/* =========================================================
   ROUND MANAGEMENT & QUESTION PAIRS
========================================================= */

/*
  ANTICLOCKWISE QUESTION FLOW:
  For N players (indices 0, 1, 2, ... N-1):
  Pair 0: Player N-1 asks Player N-2
  Pair 1: Player N-2 asks Player N-3
  ...
  Pair N-2: Player 1 asks Player 0
  Pair N-1: Player 0 asks Player N-1
*/
function buildAnticlockwisePairs(numberOfPlayers) {
    const pairs = [];
    for (let target = numberOfPlayers - 2; target >= 0; target--) {
        pairs.push({
            askerIndex: target + 1,
            targetIndex: target
        });
    }
    pairs.push({
        askerIndex: 0,
        targetIndex: numberOfPlayers - 1
    });
    return pairs;
}

function createRound(game) {
    const n = game.players.length;
    // Each player resets their secret word for the new round
    game.players.forEach(p => {
        p.secretWord = "";
        p.giverName = "";
    });

    return {
        // words given by each player to the next clockwise player:
        // givenWords[i] is the secret word chosen by player i for player (i+1)%n
        givenWords: Array(n).fill(null),
        submittedCount: 0,

        questionPairs: buildAnticlockwisePairs(n),
        questionIndex: 0,
        currentQuestion: null,
        currentTargetId: null,
        revealedWord: "",

        votes: {}, // voterId -> "yes" | "no"
        roundScores: {}, // playerId -> points earned in this round
        qaHistory: [],
        winnerIds: []
    };
}

/* =========================================================
   PUBLIC GAME STATE BUILDER
========================================================= */

function buildPublicState(game, socket) {
    const me = socket ? getPlayerBySocket(game, socket.id) : null;

    const players = game.players.map((p, index) => {
        const hasSubmittedWord = Boolean(
            game.round &&
            game.round.givenWords &&
            game.round.givenWords[index] !== null
        );

        return {
            id: p.id,
            username: p.username,
            avatar: p.avatar,
            number: index + 1,
            score: p.score,
            isHost: p.id === game.hostPlayerId,
            connected: p.connected,
            submittedWord: hasSubmittedWord
        };
    });

    const kickThreshold = Math.max(1, Math.floor((game.players.length - 1) / 2) + 1);
    const kickVotesSummary = {};
    for (const p of game.players) {
        const voters = (game.kickVotes && game.kickVotes[p.id]) || [];
        kickVotesSummary[p.id] = {
            count: voters.length,
            votedByMe: me ? voters.includes(me.id) : false
        };
    }

    const state = {
        gameCode: game.code,
        phase: game.phase,
        rounds: game.rounds,
        currentRound: game.currentRound,
        players,
        kickThreshold,
        kickVotes: kickVotesSummary,
        me: me
            ? {
                id: me.id,
                username: me.username,
                avatar: me.avatar,
                number: getPlayerIndex(game, me.id) + 1,
                secretWord: me.secretWord || "",
                giverName: me.giverName || ""
            }
            : null,
        isHost: Boolean(me && me.id === game.hostPlayerId),
        canStart: game.phase === PHASES.LOBBY && game.players.length >= 2,
        wordPass: null,
        question: null,
        voting: null,
        roundResults: null,
        finalResults: null
    };

    if (!game.round) return state;

    /* ---------------- WORD PASS PHASE ---------------- */
    if (game.phase === PHASES.WORD_PASS) {
        const myIndex = me ? getPlayerIndex(game, me.id) : -1;
        const receiverIndex = myIndex >= 0 ? (myIndex + 1) % game.players.length : -1;
        const receiver = receiverIndex >= 0 ? game.players[receiverIndex] : null;

        state.wordPass = {
            submittedCount: game.round.submittedCount,
            totalPlayers: game.players.length,
            receiverName: receiver ? receiver.username : "",
            receiverNumber: receiverIndex >= 0 ? receiverIndex + 1 : null,
            receiverAvatar: receiver ? receiver.avatar : "👤",
            hasSubmitted: myIndex >= 0 && game.round.givenWords[myIndex] !== null
        };
    }

    /* ---------------- QUESTIONS & VOTING PHASE ---------------- */
    if (game.phase === PHASES.QUESTIONS || game.phase === PHASES.VOTING) {
        const pair = game.round.questionPairs[game.round.questionIndex];
        if (pair) {
            const asker = game.players[pair.askerIndex];
            const target = game.players[pair.targetIndex];

            state.question = {
                askerId: asker.id,
                askerName: asker.username,
                askerAvatar: asker.avatar,
                askerNumber: pair.askerIndex + 1,
                targetId: target.id,
                targetName: target.username,
                targetAvatar: target.avatar,
                targetNumber: pair.targetIndex + 1,
                questionNumber: game.round.questionIndex + 1,
                totalQuestions: game.round.questionPairs.length,
                questionText: game.round.currentQuestion || null,
                revealedWord: game.phase === PHASES.VOTING ? game.round.revealedWord : null
            };
        }
    }

    /* ---------------- VOTING PROGRESS ---------------- */
    if (game.phase === PHASES.VOTING) {
        const pair = game.round.questionPairs[game.round.questionIndex];
        const asker = pair ? game.players[pair.askerIndex] : null;
        const totalVoters = Math.max(0, game.players.length - 1);
        state.voting = {
            askerId: asker ? asker.id : null,
            targetId: game.round.currentTargetId,
            votesReceived: Object.keys(game.round.votes).length,
            totalVoters,
            hasVoted: me && Object.prototype.hasOwnProperty.call(game.round.votes, me.id)
        };
    }

    /* ---------------- ROUND RESULTS ---------------- */
    if (game.phase === PHASES.ROUND_RESULTS) {
        state.roundResults = {
            winnerIds: game.round.winnerIds,
            scores: game.players.map(p => ({
                id: p.id,
                username: p.username,
                avatar: p.avatar,
                score: p.score,
                roundScore: game.round.roundScores[p.id] || 0
            })),
            qaHistory: game.round.qaHistory
        };
    }

    /* ---------------- FINAL RESULTS ---------------- */
    if (game.phase === PHASES.FINAL_RESULTS) {
        state.finalResults = {
            winnerIds: game.round.winnerIds,
            scores: game.players
                .map(p => ({
                    id: p.id,
                    username: p.username,
                    avatar: p.avatar,
                    score: p.score
                }))
                .sort((a, b) => b.score - a.score)
        };
    }

    return state;
}

function broadcastState(game) {
    for (const player of game.players) {
        if (!player.socketId) continue;
        const socket = io.sockets.sockets.get(player.socketId);
        if (socket) {
            socket.emit("state", buildPublicState(game, socket));
        }
    }
}

/* =========================================================
   GAME PROGRESSION HANDLERS
========================================================= */

function startGame(game) {
    if (game.players.length < 2) return false;

    game.phase = PHASES.WORD_PASS;
    game.currentRound = 1;
    game.players.forEach(p => (p.score = 0));
    game.round = createRound(game);

    io.to(getRoomName(game)).emit("soundEffect", "gameStart");
    broadcastState(game);
    return true;
}

function startQuestionsPhase(game) {
    game.phase = PHASES.QUESTIONS;
    game.round.questionIndex = 0;
    game.round.currentQuestion = null;
    game.round.currentTargetId = null;
    game.round.votes = {};

    io.to(getRoomName(game)).emit("soundEffect", "gameStart");
    broadcastState(game);
}

function finishVoting(game) {
    const targetId = game.round.currentTargetId;
    const target = getPlayer(game, targetId);
    const totalVoters = Math.max(1, game.players.length - 1);

    let yes = 0;
    let no = 0;

    for (const vote of Object.values(game.round.votes)) {
        if (vote === "yes") yes++;
        else if (vote === "no") no++;
    }

    // Scoring Rules:
    // Base points = number of YES votes
    // Majority Rule: if yes > totalVoters / 2 => +2 Majority Bonus
    // Unanimous Rule: if yes === totalVoters => +3 Perfect Bonus
    const isMajority = yes > totalVoters / 2;
    const isUnanimous = yes === totalVoters && totalVoters > 1;

    let pointsEarned = yes;
    if (isMajority) pointsEarned += 2;
    if (isUnanimous) pointsEarned += 1;

    const pair = game.round.questionPairs[game.round.questionIndex];
    const asker = pair ? game.players[pair.askerIndex] : null;

    // Scoring Rules:
    // The person who is giving the question (ASKER) gets the points!
    if (asker) {
        asker.score += pointsEarned;
        game.round.roundScores[asker.id] = (game.round.roundScores[asker.id] || 0) + pointsEarned;
    }

    const qaRecord = {
        askerName: asker ? asker.username : "",
        targetName: target ? target.username : "",
        question: game.round.currentQuestion,
        revealedWord: game.round.revealedWord,
        votes: { yes, no },
        pointsAwarded: pointsEarned,
        majorityMatch: isMajority
    };
    game.round.qaHistory.push(qaRecord);

    const DISPLAY_DURATION_SECONDS = 30;

    io.to(getRoomName(game)).emit("answerResult", {
        askerId: asker ? asker.id : "",
        askerName: asker ? asker.username : "",
        targetId,
        targetName: target ? target.username : "",
        revealedWord: game.round.revealedWord,
        question: game.round.currentQuestion,
        yes,
        no,
        pointsEarned,
        isMajority,
        isUnanimous,
        displayDuration: DISPLAY_DURATION_SECONDS
    });

    broadcastState(game);

    if (game.resultTimer) {
        clearTimeout(game.resultTimer);
        game.resultTimer = null;
    }

    // Give players 30 seconds to laugh & enjoy the question-answer card before advancing
    game.resultTimer = setTimeout(() => {
        game.resultTimer = null;
        moveToNextQuestionOrFinishRound(game);
    }, DISPLAY_DURATION_SECONDS * 1000);
}

function moveToNextQuestionOrFinishRound(game) {
    if (game.resultTimer) {
        clearTimeout(game.resultTimer);
        game.resultTimer = null;
    }

    game.round.questionIndex++;

    if (game.round.questionIndex < game.round.questionPairs.length) {
        game.phase = PHASES.QUESTIONS;
        game.round.currentQuestion = null;
        game.round.currentTargetId = null;
        game.round.votes = {};
        broadcastState(game);
        return;
    }

    finishRound(game);
}

function finishRound(game) {
    game.phase = PHASES.ROUND_RESULTS;

    const maxScore = Math.max(...game.players.map(p => p.score));
    const winners = game.players.filter(p => p.score === maxScore);
    game.round.winnerIds = winners.map(p => p.id);

    // Save round to MongoDB asynchronously if available
    if (isMongoConnected()) {
        try {
            RoundModel.create({
                gameCode: game.code,
                roundNumber: game.currentRound,
                wordAssignments: game.players.map((p, i) => ({
                    giverName: p.username,
                    receiverName: game.players[(i + 1) % game.players.length].username,
                    secretWord: game.round.givenWords[i]
                })),
                qaHistory: game.round.qaHistory,
                roundScores: game.round.roundScores,
                winners: winners.map(w => w.username)
            }).catch(e => console.warn("Mongo save round err:", e.message));
        } catch (e) {
            // ignore
        }
    }

    io.to(getRoomName(game)).emit("roundFinished", {
        round: game.currentRound,
        winners: winners.map(p => ({ id: p.id, username: p.username, score: p.score }))
    });

    broadcastState(game);
}

function startNextRound(game) {
    if (game.phase !== PHASES.ROUND_RESULTS) return;

    if (game.currentRound >= game.rounds) {
        finishGame(game);
        return;
    }

    game.currentRound++;
    game.phase = PHASES.WORD_PASS;
    game.round = createRound(game);

    io.to(getRoomName(game)).emit("soundEffect", "gameStart");
    broadcastState(game);
}

function finishGame(game) {
    game.phase = PHASES.FINAL_RESULTS;

    const maxScore = Math.max(...game.players.map(p => p.score));
    const winners = game.players.filter(p => p.score === maxScore);
    game.round.winnerIds = winners.map(p => p.id);

    // Save Game completion to MongoDB asynchronously if available
    if (isMongoConnected()) {
        try {
            const host = getPlayer(game, game.hostPlayerId);
            GameModel.findOneAndUpdate(
                { code: game.code },
                {
                    code: game.code,
                    hostName: host ? host.username : "Host",
                    rounds: game.rounds,
                    completedRounds: game.currentRound,
                    players: game.players.map(p => ({ username: p.username, avatar: p.avatar, score: p.score })),
                    winners: winners.map(w => w.username),
                    status: "completed",
                    completedAt: new Date()
                },
                { upsert: true }
            ).catch(e => console.warn("Mongo save game err:", e.message));
        } catch (e) {
            // ignore
        }
    }

    io.to(getRoomName(game)).emit("soundEffect", "celebrate");
    io.to(getRoomName(game)).emit("gameFinished", {
        winners: winners.map(p => ({ id: p.id, username: p.username, score: p.score }))
    });

    broadcastState(game);
}

function executeKick(game, targetPlayerId, reason = "majority") {
    const targetIndex = game.players.findIndex(p => p.id === targetPlayerId);
    if (targetIndex === -1) return;

    const target = game.players[targetIndex];
    const targetSocket = io.sockets.sockets.get(target.socketId);

    // Remove from players array
    game.players.splice(targetIndex, 1);

    // Clean up kickVotes
    if (game.kickVotes) {
        delete game.kickVotes[targetPlayerId];
        for (const tId in game.kickVotes) {
            game.kickVotes[tId] = game.kickVotes[tId].filter(id => id !== targetPlayerId);
        }
    }

    // Notify kicked player
    if (targetSocket) {
        targetSocket.emit("kickedFromGame", {
            message: reason === "majority"
                ? "You were kicked from the game by a majority vote of all players."
                : "You were removed from the room."
        });
        targetSocket.leave(getRoomName(game));
    }

    // If host was kicked, reassign host
    if (game.hostPlayerId === targetPlayerId && game.players.length > 0) {
        game.hostPlayerId = game.players[0].id;
    }

    // Broadcast kick to room
    io.to(getRoomName(game)).emit("playerKicked", {
        playerId: targetPlayerId,
        username: target.username,
        reason
    });

    if (game.phase === PHASES.LOBBY) {
        if (game.players.length === 0) {
            games.delete(game.code);
            return;
        }
        broadcastState(game);
        return;
    }

    // In active game: if less than 2 players remain, return to lobby
    if (game.players.length < 2) {
        if (game.resultTimer) {
            clearTimeout(game.resultTimer);
            game.resultTimer = null;
        }
        game.phase = PHASES.LOBBY;
        game.round = null;
        game.currentRound = 0;
        io.to(getRoomName(game)).emit("errorMessage", "Not enough players remaining. Returning to lobby.");
        broadcastState(game);
        return;
    }

    // If in WORD_PASS phase:
    if (game.phase === PHASES.WORD_PASS) {
        game.round = createRound(game);
        io.to(getRoomName(game)).emit("errorMessage", `${target.username} was kicked. Circle reorganized!`);
        broadcastState(game);
        return;
    }

    // If in QUESTIONS or VOTING phase:
    if (game.phase === PHASES.QUESTIONS || game.phase === PHASES.VOTING) {
        if (game.resultTimer) {
            clearTimeout(game.resultTimer);
            game.resultTimer = null;
        }

        const pair = game.round && game.round.questionPairs ? game.round.questionPairs[game.round.questionIndex] : null;
        const isInvolved = pair && (
            game.round.currentTargetId === targetPlayerId ||
            (game.players[pair.askerIndex] && game.players[pair.askerIndex].id === targetPlayerId) ||
            (game.players[pair.targetIndex] && game.players[pair.targetIndex].id === targetPlayerId)
        );

        game.round.questionPairs = buildAnticlockwisePairs(game.players.length);

        if (isInvolved || game.round.questionIndex >= game.round.questionPairs.length) {
            moveToNextQuestionOrFinishRound(game);
        } else {
            broadcastState(game);
        }
        return;
    }

    broadcastState(game);
}

/* =========================================================
   SOCKET.IO EVENT ROUTERS
========================================================= */

io.on("connection", socket => {
    // 1. CREATE GAME
    socket.on("createGame", data => {
        const username = cleanText(data && data.username, 25);
        const avatar = (data && data.avatar) || DEFAULT_AVATARS[0];
        let rounds = Number(data && data.rounds);

        if (!username) {
            socket.emit("errorMessage", "Please enter your name.");
            return;
        }

        if (!Number.isInteger(rounds) || rounds < 1 || rounds > 10) {
            rounds = 3;
        }

        const code = generateGameCode();
        const playerId = generatePlayerId();

        const player = {
            id: playerId,
            socketId: socket.id,
            username,
            avatar,
            score: 0,
            connected: true,
            secretWord: "",
            giverName: ""
        };

        const game = {
            code,
            hostPlayerId: playerId,
            rounds,
            currentRound: 0,
            phase: PHASES.LOBBY,
            players: [player],
            round: null,
            kickVotes: {},
            resultTimer: null,
            createdAt: Date.now()
        };

        games.set(code, game);

        socket.data.gameCode = code;
        socket.data.playerId = playerId;
        socket.join(getRoomName(game));

        socket.emit("gameCreated", { code, playerId });
        broadcastState(game);
    });

    // 2. JOIN GAME
    socket.on("joinGame", data => {
        const username = cleanText(data && data.username, 25);
        const code = cleanText(data && data.code, 10).toUpperCase();
        const avatar = (data && data.avatar) || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

        if (!username) {
            socket.emit("errorMessage", "Please enter your name.");
            return;
        }
        if (!code) {
            socket.emit("errorMessage", "Please enter the 6-letter game code.");
            return;
        }

        const game = getGame(code);
        if (!game) {
            socket.emit("errorMessage", "Game not found. Please double check the code.");
            return;
        }

        if (game.phase !== PHASES.LOBBY) {
            socket.emit("errorMessage", "This game has already started.");
            return;
        }

        if (game.players.length >= 12) {
            socket.emit("errorMessage", "Lobby is full (maximum 12 players).");
            return;
        }

        const nameExists = game.players.some(p => p.username.toLowerCase() === username.toLowerCase());
        if (nameExists) {
            socket.emit("errorMessage", "That name is already taken in this lobby. Choose another!");
            return;
        }

        const playerId = generatePlayerId();
        const player = {
            id: playerId,
            socketId: socket.id,
            username,
            avatar,
            score: 0,
            connected: true,
            secretWord: "",
            giverName: ""
        };

        game.players.push(player);

        socket.data.gameCode = code;
        socket.data.playerId = playerId;
        socket.join(getRoomName(game));

        socket.emit("joinedGame", { code, playerId });
        io.to(getRoomName(game)).emit("soundEffect", "playerJoin");
        io.to(getRoomName(game)).emit("playerJoined", { username, avatar });
        broadcastState(game);
    });

    // 3. RECONNECT SESSION
    socket.on("reconnectPlayer", data => {
        const code = cleanText(data && data.code, 10).toUpperCase();
        const playerId = data && data.playerId;

        if (!code || !playerId) return;

        const game = getGame(code);
        if (!game) return;

        const player = getPlayer(game, playerId);
        if (!player) return;

        player.socketId = socket.id;
        player.connected = true;

        socket.data.gameCode = code;
        socket.data.playerId = playerId;
        socket.join(getRoomName(game));

        // Send back private secret word if in active round
        if (player.secretWord) {
            socket.emit("privateSecretWord", {
                secretWord: player.secretWord,
                giverName: player.giverName
            });
        }

        socket.emit("reconnectedSuccess", { code });
        broadcastState(game);
    });

    // 4. START GAME
    socket.on("startGame", () => {
        const game = getGame(socket.data.gameCode);
        if (!game) return;

        const player = getPlayer(game, socket.data.playerId);
        if (!player || player.id !== game.hostPlayerId) {
            socket.emit("errorMessage", "Only the room host can start the game.");
            return;
        }

        if (game.players.length < 2) {
            socket.emit("errorMessage", "At least 2 players are needed to play The Whisper Game.");
            return;
        }

        startGame(game);
    });

    // 5. WORD PASS (Clockwise: player i gives to (i+1)%n)
    socket.on("submitWord", wordText => {
        const game = getGame(socket.data.gameCode);
        if (!game || game.phase !== PHASES.WORD_PASS) {
            socket.emit("errorMessage", "It is not the word passing phase.");
            return;
        }

        const player = getPlayerBySocket(game, socket.id);
        if (!player) return;

        const myIndex = getPlayerIndex(game, player.id);
        if (myIndex === -1) return;

        if (game.round.givenWords[myIndex] !== null) {
            socket.emit("errorMessage", "You have already passed your secret word for this round.");
            return;
        }

        const word = cleanText(wordText, 60);
        if (!word) {
            socket.emit("errorMessage", "Please type a word before submitting.");
            return;
        }

        game.round.givenWords[myIndex] = word;
        game.round.submittedCount++;

        const receiverIndex = (myIndex + 1) % game.players.length;
        const receiver = game.players[receiverIndex];

        // Notify room of sealed whisper
        io.to(getRoomName(game)).emit("wordSealed", {
            giverName: player.username,
            receiverName: receiver.username
        });
        socket.emit("soundEffect", "wordPass");

        broadcastState(game);

        // Check if all players have submitted their secret word
        if (game.round.submittedCount >= game.players.length) {
            // Assign words to all receivers
            const n = game.players.length;
            for (let j = 0; j < n; j++) {
                const giverIdx = (j - 1 + n) % n;
                game.players[j].secretWord = game.round.givenWords[giverIdx];
                game.players[j].giverName = game.players[giverIdx].username;

                const targetSocket = io.sockets.sockets.get(game.players[j].socketId);
                if (targetSocket) {
                    targetSocket.emit("privateSecretWord", {
                        secretWord: game.players[j].secretWord,
                        giverName: game.players[j].giverName
                    });
                }
            }

            io.to(getRoomName(game)).emit("allWordsSealed", {
                message: "All words sealed! Ready your questions..."
            });

            // Smooth countdown to question phase
            setTimeout(() => {
                startQuestionsPhase(game);
            }, 2500);
        }
    });

    // 6. QUESTION PHASE (Anticlockwise asking)
    socket.on("submitQuestion", questionText => {
        const game = getGame(socket.data.gameCode);
        if (!game || game.phase !== PHASES.QUESTIONS) {
            socket.emit("errorMessage", "It is not the question phase.");
            return;
        }

        const player = getPlayerBySocket(game, socket.id);
        if (!player) return;

        const pair = game.round.questionPairs[game.round.questionIndex];
        if (!pair) return;

        const asker = game.players[pair.askerIndex];
        const target = game.players[pair.targetIndex];

        if (player.id !== asker.id) {
            socket.emit("errorMessage", "Only the current asker can submit a question.");
            return;
        }

        const question = cleanText(questionText, 180);
        if (!question) {
            socket.emit("errorMessage", "Please type a question.");
            return;
        }

        game.round.currentQuestion = question;
        game.round.currentTargetId = target.id;
        game.round.revealedWord = target.secretWord || "???";
        game.round.votes = {};
        game.phase = PHASES.VOTING;

        io.to(getRoomName(game)).emit("soundEffect", "wordReveal");
        io.to(getRoomName(game)).emit("questionRevealed", {
            askerName: asker.username,
            askerAvatar: asker.avatar,
            targetName: target.username,
            targetAvatar: target.avatar,
            targetId: target.id,
            question,
            revealedWord: game.round.revealedWord
        });

        broadcastState(game);
    });

    // 7. VOTING
    socket.on("vote", voteChoice => {
        const game = getGame(socket.data.gameCode);
        if (!game || game.phase !== PHASES.VOTING) {
            socket.emit("errorMessage", "Voting is not currently active.");
            return;
        }

        if (!VOTE_OPTIONS.includes(voteChoice)) {
            socket.emit("errorMessage", "Invalid vote option.");
            return;
        }

        const voter = getPlayerBySocket(game, socket.id);
        if (!voter) return;

        const pair = game.round.questionPairs[game.round.questionIndex];
        const asker = pair ? game.players[pair.askerIndex] : null;

        if (asker && voter.id === asker.id) {
            socket.emit("errorMessage", "You cannot vote on your own question!");
            return;
        }

        if (Object.prototype.hasOwnProperty.call(game.round.votes, voter.id)) {
            socket.emit("errorMessage", "You have already voted.");
            return;
        }

        game.round.votes[voter.id] = voteChoice;
        socket.emit("soundEffect", "votePop");
        socket.emit("voteSubmitted", { vote: voteChoice });

        const totalVoters = Math.max(1, game.players.length - 1);
        const votesReceived = Object.keys(game.round.votes).length;

        io.to(getRoomName(game)).emit("voteProgress", {
            votesReceived,
            totalVoters
        });

        broadcastState(game);

        if (votesReceived >= totalVoters) {
            finishVoting(game);
        }
    });

    // 8. NEXT ROUND & RESTART
    socket.on("nextRound", () => {
        const game = getGame(socket.data.gameCode);
        if (!game) return;

        const player = getPlayer(game, socket.data.playerId);
        if (!player || player.id !== game.hostPlayerId) {
            socket.emit("errorMessage", "Only the room host can start the next round.");
            return;
        }

        startNextRound(game);
    });

    socket.on("restartGame", () => {
        const game = getGame(socket.data.gameCode);
        if (!game) return;

        const player = getPlayer(game, socket.data.playerId);
        if (!player || player.id !== game.hostPlayerId) {
            socket.emit("errorMessage", "Only the host can restart the game.");
            return;
        }

        if (game.resultTimer) {
            clearTimeout(game.resultTimer);
            game.resultTimer = null;
        }

        game.phase = PHASES.LOBBY;
        game.currentRound = 0;
        game.round = null;
        game.kickVotes = {};
        game.players.forEach(p => {
            p.score = 0;
            p.secretWord = "";
            p.giverName = "";
        });

        broadcastState(game);
    });

    // 9. LIVE FLOATING EMOJI REACTIONS
    socket.on("sendReaction", emoji => {
        const game = getGame(socket.data.gameCode);
        if (!game) return;

        const player = getPlayerBySocket(game, socket.id);
        const username = player ? player.username : "Player";

        io.to(getRoomName(game)).emit("reactionFired", {
            emoji: emoji || "😂",
            username,
            playerId: player ? player.id : ""
        });
    });

    // 10. DEMOCRATIC VOTE-TO-KICK (MAJORITY OF PLAYERS) & HOST KICK
    socket.on("voteKickPlayer", targetPlayerId => {
        const game = getGame(socket.data.gameCode);
        if (!game) return;

        const voter = getPlayerBySocket(game, socket.id);
        if (!voter) return;

        if (voter.id === targetPlayerId) {
            socket.emit("errorMessage", "You cannot vote to kick yourself.");
            return;
        }

        const target = getPlayer(game, targetPlayerId);
        if (!target) {
            socket.emit("errorMessage", "Player not found.");
            return;
        }

        if (!game.kickVotes) {
            game.kickVotes = {};
        }
        if (!Array.isArray(game.kickVotes[targetPlayerId])) {
            game.kickVotes[targetPlayerId] = [];
        }

        const idx = game.kickVotes[targetPlayerId].indexOf(voter.id);
        if (idx >= 0) {
            game.kickVotes[targetPlayerId].splice(idx, 1);
            socket.emit("soundEffect", "click");
        } else {
            game.kickVotes[targetPlayerId].push(voter.id);
            socket.emit("soundEffect", "votePop");
        }

        const eligibleVoters = Math.max(1, game.players.length - 1);
        const requiredVotes = Math.max(1, Math.floor(eligibleVoters / 2) + 1);
        const currentVotes = game.kickVotes[targetPlayerId].length;

        io.to(getRoomName(game)).emit("kickVoteProgress", {
            targetPlayerId,
            targetName: target.username,
            currentVotes,
            requiredVotes
        });

        if (currentVotes >= requiredVotes) {
            executeKick(game, targetPlayerId, "majority");
        } else {
            broadcastState(game);
        }
    });

    socket.on("kickPlayer", targetPlayerId => {
        const game = getGame(socket.data.gameCode);
        if (!game) return;

        const me = getPlayerBySocket(game, socket.id);
        if (!me || me.id !== game.hostPlayerId) return;

        if (game.phase !== PHASES.LOBBY) return;
        executeKick(game, targetPlayerId, "host");
    });

    socket.on("skipResultDisplay", () => {
        const game = getGame(socket.data.gameCode);
        if (!game) return;

        const me = getPlayerBySocket(game, socket.id);
        if (!me || me.id !== game.hostPlayerId) return;

        if (game.resultTimer) {
            clearTimeout(game.resultTimer);
            game.resultTimer = null;
            moveToNextQuestionOrFinishRound(game);
        }
    });

    socket.on("skipTurn", () => {
        const game = getGame(socket.data.gameCode);
        if (!game) return;

        const me = getPlayerBySocket(game, socket.id);
        if (!me || me.id !== game.hostPlayerId) return;

        if (game.phase === PHASES.QUESTIONS) {
            // Auto submit a funny random question on behalf of idle asker
            const autoQuestions = [
                "What is the funniest thing you have ever seen?",
                "What is your secret weapon?",
                "What would you bring to an alien invasion?",
                "What is hidden in your closet?"
            ];
            const q = autoQuestions[Math.floor(Math.random() * autoQuestions.length)];
            const pair = game.round.questionPairs[game.round.questionIndex];
            if (pair) {
                const target = game.players[pair.targetIndex];
                game.round.currentQuestion = q;
                game.round.currentTargetId = target.id;
                game.round.revealedWord = target.secretWord || "???";
                game.round.votes = {};
                game.phase = PHASES.VOTING;
                broadcastState(game);
            }
        } else if (game.phase === PHASES.VOTING) {
            // Force finish voting with current votes
            finishVoting(game);
        }
    });

    // 11. DISCONNECT HANDLER
    socket.on("disconnect", () => {
        const code = socket.data.gameCode;
        const playerId = socket.data.playerId;
        if (!code || !playerId) return;

        const game = getGame(code);
        if (!game) return;

        const player = getPlayer(game, playerId);
        if (!player) return;

        player.connected = false;

        if (game.phase === PHASES.LOBBY) {
            game.players = game.players.filter(p => p.id !== playerId);
            if (game.hostPlayerId === playerId && game.players.length > 0) {
                game.hostPlayerId = game.players[0].id;
            }
            if (game.players.length === 0) {
                games.delete(code);
                return;
            }
            broadcastState(game);
            return;
        }

        // Active game: If host disconnected, transfer host to next connected player
        if (game.hostPlayerId === playerId) {
            const replacement = game.players.find(p => p.connected && p.id !== playerId);
            if (replacement) {
                game.hostPlayerId = replacement.id;
            }
        }

        broadcastState(game);
    });
});

/* =========================================================
   HTTP ROUTES
========================================================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        activeGames: games.size,
        mongoConnected: isMongoConnected()
    });
});

server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  🎪 The Whisper Game Server Running!`);
    console.log(`  🌐 http://localhost:${PORT}`);
    console.log(`  🍃 MongoDB: ${isMongoConnected() ? "Connected" : "In-Memory Mode"}`);
    console.log(`========================================\n`);
});