/* =========================================================
   THE WHISPER GAME — CLIENT APPLICATION LOGIC
   Multiplayer Real-time Circle Party Game
========================================================= */

const socket = io();

// State
let currentState = null;
let selectedAvatar = "🦊";
let selectedRounds = 3;
let currentVote = null;
let isWordHidden = false;
let toastTimeout = null;
let resultCountdownTimer = null;

const AVATARS = ["🦊", "🐼", "🦁", "🐯", "🦄", "🐸", "🐙", "🤖", "👽", "🦉", "🐵", "🐧", "🐲", "🐱", "🐶", "🚀"];

// Categorized Word Inspiration Database
const WORD_LIBRARY = {
    animal: ["Kangaroo", "Penguin", "Platypus", "Chameleon", "Gorilla", "Flamingo", "Octopus", "Sloth", "Hamster", "Honey Badger"],
    food: ["Pineapple Pizza", "Wasabi Taco", "Chocolate Burrito", "Sushi Roll", "Spaghetti", "Avocado Toast", "Pickle Ice Cream", "Pancakes"],
    place: ["Antarctica", "The Bermuda Triangle", "Times Square", "Area 51", "The Sahara Desert", "Mount Everest", "The Moon", "Secret Bunker"],
    object: ["Toaster", "Lightsaber", "Rubber Duck", "Boomerang", "Lawnmower", "Microscope", "Skateboard", "Grandfather Clock"],
    absurd: ["Time Machine", "Invisible Cloak", "Teleportation Pod", "Alien Blaster", "Magic Wand", "Laser Sword", "Flying Carpet"]
};

// Categorized Hilarious Question Prompts Database
const QUESTION_PROMPTS = {
    hilarious: [
        "What would you bring to a deserted island to survive?",
        "What was the most embarrassing thing you hid in your backpack?",
        "What is your secret weapon against an alien invasion?",
        "What would you never want to find inside your bowl of soup?",
        "What is the strangest thing to give someone as a birthday gift?"
    ],
    awkward: [
        "What is your excuse when you get caught sneaking into the fridge at 2 AM?",
        "What is hidden under your bed right now?",
        "What is the weirdest thing you have bought online?",
        "If you were arrested with no explanation, what would your friends assume it was for?",
        "What do you pretend to love even though you secretly hate it?"
    ],
    survival: [
        "If zombies attacked right now, what is your primary weapon?",
        "What one item would you rescue from a burning building?",
        "What is the worst thing to forget before a 10-hour flight?",
        "What would you use to escape from a high-security prison?"
    ],
    wild: [
        "What is your true superpower when nobody is looking?",
        "What will be the first item discovered on Mars?",
        "If you could replace all cars in the city with one object, what would it be?",
        "What is the magic ingredient in the secret formula?"
    ]
};

// DOM Helper
const $ = id => document.getElementById(id);

// Visualizer instance
let circleVisualizer = null;

/* =========================================================
   INITIALIZATION
========================================================= */

window.addEventListener("DOMContentLoaded", () => {
    circleVisualizer = new WhisperCircle("whisperCircleMount");

    initAvatarPicker();
    initHomeTabs();
    initRoundChips();
    initWordSparkButtons();
    initQuestionPromptButtons();
    initReactionButtons();
    initActionButtons();
    checkUrlJoinCode();
    attemptSessionReconnect();
});

/* =========================================================
   AVATAR PICKER
========================================================= */

function initAvatarPicker() {
    const container = $("avatarPicker");
    if (!container) return;

    // Check saved avatar
    const saved = sessionStorage.getItem("cw_avatar");
    if (saved && AVATARS.includes(saved)) {
        selectedAvatar = saved;
    }

    container.innerHTML = "";
    AVATARS.forEach(av => {
        const item = document.createElement("div");
        item.className = "avatar-item" + (av === selectedAvatar ? " selected" : "");
        item.textContent = av;
        item.addEventListener("click", () => {
            selectedAvatar = av;
            sessionStorage.setItem("cw_avatar", av);
            container.querySelectorAll(".avatar-item").forEach(el => el.classList.remove("selected"));
            item.classList.add("selected");
            if (window.sounds) window.sounds.click();
        });
        container.appendChild(item);
    });
}

/* =========================================================
   HOME TABS & ROUND CHIPS
========================================================= */

function initHomeTabs() {
    const tabCreate = $("tabCreateBtn");
    const tabJoin = $("tabJoinBtn");
    const panelCreate = $("panelCreate");
    const panelJoin = $("panelJoin");

    tabCreate.addEventListener("click", () => {
        tabCreate.classList.add("active");
        tabJoin.classList.remove("active");
        panelCreate.classList.remove("hidden");
        panelJoin.classList.add("hidden");
        if (window.sounds) window.sounds.click();
    });

    tabJoin.addEventListener("click", () => {
        tabJoin.classList.add("active");
        tabCreate.classList.remove("active");
        panelJoin.classList.remove("hidden");
        panelCreate.classList.add("hidden");
        if (window.sounds) window.sounds.click();
    });
}

function initRoundChips() {
    document.querySelectorAll(".chip-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedRounds = Number(btn.dataset.rounds) || 3;
            $("customRoundsInput").value = selectedRounds;
            if (window.sounds) window.sounds.click();
        });
    });
}

function checkUrlJoinCode() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") || params.get("join");
    if (code) {
        $("joinGameCode").value = code.toUpperCase();
        $("tabJoinBtn").click();
    }
}

/* =========================================================
   WORD SPARK & QUESTION PROMPT BUTTONS
========================================================= */

function initWordSparkButtons() {
    document.querySelectorAll(".word-chip[data-cat]").forEach(btn => {
        btn.addEventListener("click", () => {
            const cat = btn.dataset.cat;
            const words = WORD_LIBRARY[cat] || [];
            if (words.length) {
                const randomWord = words[Math.floor(Math.random() * words.length)];
                $("secretWordInput").value = randomWord;
                $("secretWordInput").focus();
                if (window.sounds) window.sounds.click();
            }
        });
    });

    $("btnRandomWordSpark").addEventListener("click", () => {
        const allCats = Object.keys(WORD_LIBRARY);
        const cat = allCats[Math.floor(Math.random() * allCats.length)];
        const words = WORD_LIBRARY[cat];
        const randomWord = words[Math.floor(Math.random() * words.length)];
        $("secretWordInput").value = randomWord;
        $("secretWordInput").focus();
        if (window.sounds) window.sounds.click();
    });
}

function initQuestionPromptButtons() {
    document.querySelectorAll(".q-chip[data-qcat]").forEach(btn => {
        btn.addEventListener("click", () => {
            const cat = btn.dataset.qcat;
            const prompts = QUESTION_PROMPTS[cat] || [];
            if (prompts.length) {
                const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
                $("questionInputText").value = randomPrompt;
                $("questionInputText").focus();
                if (window.sounds) window.sounds.click();
            }
        });
    });

    $("btnRandomQuestion").addEventListener("click", () => {
        const allCats = Object.keys(QUESTION_PROMPTS);
        const cat = allCats[Math.floor(Math.random() * allCats.length)];
        const prompts = QUESTION_PROMPTS[cat];
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        $("questionInputText").value = randomPrompt;
        $("questionInputText").focus();
        if (window.sounds) window.sounds.click();
    });
}

/* =========================================================
   ACTION BUTTONS & SOCKET EMITS
========================================================= */

function initActionButtons() {
    // Sound Toggle
    $("soundToggleBtn").addEventListener("click", () => {
        const enabled = window.sounds.toggle();
        $("soundIcon").textContent = enabled ? "🔊" : "🔇";
        showToast(enabled ? "Sound effects enabled" : "Sound muted", "success");
    });

    // Create Game
    $("btnCreateGame").addEventListener("click", () => {
        const username = $("createUsername").value.trim();
        if (!username) {
            showToast("Please enter your name!", "error");
            return;
        }
        socket.emit("createGame", {
            username,
            avatar: selectedAvatar,
            rounds: selectedRounds
        });
        if (window.sounds) window.sounds.click();
    });

    // Join Game
    $("btnJoinGame").addEventListener("click", () => {
        const username = $("joinUsername").value.trim();
        const code = $("joinGameCode").value.trim().toUpperCase();
        if (!username) {
            showToast("Please enter your name!", "error");
            return;
        }
        if (code.length < 4) {
            showToast("Please enter the room code!", "error");
            return;
        }
        socket.emit("joinGame", {
            username,
            avatar: selectedAvatar,
            code
        });
        if (window.sounds) window.sounds.click();
    });

    // Start Game (Host)
    $("btnStartGame").addEventListener("click", () => {
        socket.emit("startGame");
        if (window.sounds) window.sounds.click();
    });

    // Submit Secret Word
    $("btnSubmitWord").addEventListener("click", () => {
        const word = $("secretWordInput").value.trim();
        if (!word) {
            showToast("Please type a secret word first!", "error");
            return;
        }
        socket.emit("submitWord", word);
        $("secretWordInput").value = "";
    });

    $("secretWordInput").addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            $("btnSubmitWord").click();
        }
    });

    // Submit Question
    $("btnSubmitQuestion").addEventListener("click", () => {
        const q = $("questionInputText").value.trim();
        if (!q) {
            showToast("Please type a question!", "error");
            return;
        }
        socket.emit("submitQuestion", q);
        $("questionInputText").value = "";
    });

    $("questionInputText").addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            $("btnSubmitQuestion").click();
        }
    });

    // Host Skip Turn
    $("btnHostSkipQuestion").addEventListener("click", () => {
        socket.emit("skipTurn");
    });

    // Voting Buttons
    document.querySelectorAll(".vote-card").forEach(btn => {
        btn.addEventListener("click", () => {
            if (!currentState || currentState.phase !== "voting") return;
            if (currentState.voting && currentState.voting.hasVoted) return;

            const vote = btn.dataset.vote;
            currentVote = vote;

            document.querySelectorAll(".vote-card").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");

            socket.emit("vote", vote);
        });
    });

    // Toggle Hide/Show My Secret Word (Stage Vault)
    $("btnToggleHideWord").addEventListener("click", () => {
        isWordHidden = !isWordHidden;
        updateSecretWordDisplays();
    });

    // Toggle Hide/Show My Secret Word (Arena Top Pill)
    const arenaToggle = $("btnArenaToggleWord");
    if (arenaToggle) {
        arenaToggle.addEventListener("click", () => {
            isWordHidden = !isWordHidden;
            updateSecretWordDisplays();
        });
    }

    // Next Round (Host)
    $("btnNextRound").addEventListener("click", () => {
        socket.emit("nextRound");
        if (window.sounds) window.sounds.click();
    });

    // Restart Game (Host)
    $("btnRestartGame").addEventListener("click", () => {
        socket.emit("restartGame");
        if (window.sounds) window.sounds.click();
    });

    // Copy Room Code & Link
    $("btnCopyCode").addEventListener("click", () => {
        if (!currentState || !currentState.gameCode) return;
        navigator.clipboard.writeText(currentState.gameCode);
        showToast(`Room code ${currentState.gameCode} copied!`, "success");
    });

    $("btnShareLink").addEventListener("click", () => {
        if (!currentState || !currentState.gameCode) return;
        const url = `${window.location.origin}/?code=${currentState.gameCode}`;
        navigator.clipboard.writeText(url);
        showToast("Invite link copied to clipboard!", "success");
    });

    // Host Skip 30s Result Countdown Early
    const btnSkipResult = $("btnHostSkipResult");
    if (btnSkipResult) {
        btnSkipResult.addEventListener("click", () => {
            socket.emit("skipResultDisplay");
        });
    }

    // Delegated click for Kick buttons (Circle and Lobby)
    document.addEventListener("click", e => {
        const kickBtn = e.target.closest("[data-kick-id]");
        if (kickBtn) {
            e.stopPropagation();
            const id = kickBtn.dataset.kickId;
            socket.emit("voteKickPlayer", id);
            if (window.sounds) window.sounds.click();
        }
    });
}

/* =========================================================
   FLOATING EMOJI REACTIONS
========================================================= */

function initReactionButtons() {
    document.querySelectorAll(".reaction-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const emoji = btn.dataset.emoji;
            socket.emit("sendReaction", emoji);
            spawnFloatingEmoji(emoji);
            if (window.sounds) window.sounds.reactionPop();
        });
    });
}

function spawnFloatingEmoji(emoji) {
    const container = $("reactionsContainer");
    if (!container) return;

    const el = document.createElement("div");
    el.className = "floating-emoji";
    el.textContent = emoji;

    // Random horizontal start position
    const x = Math.floor(Math.random() * (window.innerWidth - 60)) + 20;
    el.style.left = `${x}px`;

    container.appendChild(el);

    setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
    }, 3000);
}

/* =========================================================
   SESSION RECONNECT
========================================================= */

function attemptSessionReconnect() {
    const code = sessionStorage.getItem("cw_gameCode");
    const playerId = sessionStorage.getItem("cw_playerId");
    if (code && playerId) {
        socket.emit("reconnectPlayer", { code, playerId });
    }
}

/* =========================================================
   SOCKET EVENT LISTENERS
========================================================= */

socket.on("connect", () => {
    $("connectionPill").className = "connection-pill connected";
    $("connectionText").textContent = "Connected";
});

socket.on("disconnect", () => {
    $("connectionPill").className = "connection-pill disconnected";
    $("connectionText").textContent = "Disconnected";
    showToast("Connection to server lost. Reconnecting...", "error");
});

socket.on("errorMessage", msg => {
    showToast(msg, "error");
});

socket.on("soundEffect", sfxName => {
    if (window.sounds && typeof window.sounds[sfxName] === "function") {
        window.sounds[sfxName]();
    }
});

socket.on("gameCreated", data => {
    sessionStorage.setItem("cw_gameCode", data.code);
    sessionStorage.setItem("cw_playerId", data.playerId);
    showToast(`Party room ${data.code} created!`, "success");
    if (window.sounds) window.sounds.playerJoin();
});

socket.on("joinedGame", data => {
    sessionStorage.setItem("cw_gameCode", data.code);
    sessionStorage.setItem("cw_playerId", data.playerId);
    showToast("Welcome to the Whisper Circle!", "success");
});

socket.on("playerJoined", data => {
    showToast(`${data.avatar || "👤"} ${data.username} sat down in the circle!`, "success");
});

socket.on("reactionFired", data => {
    spawnFloatingEmoji(data.emoji);
    if (window.sounds) window.sounds.reactionPop();
});

socket.on("wordSealed", data => {
    showToast(`✉️ ${data.giverName} sealed a secret word for ${data.receiverName}!`, "success");
});

socket.on("allWordsSealed", data => {
    showToast(data.message || "All words sealed! Ready your questions...", "success");
    if (window.sounds) window.sounds.gameStart();
});

socket.on("privateSecretWord", data => {
    if (currentState && currentState.me) {
        currentState.me.secretWord = data.secretWord;
        currentState.me.giverName = data.giverName;
    }
    $("myGiverName").textContent = data.giverName || "Previous Player";
    $("myPrivateWordText").textContent = data.secretWord;
    $("mySecretWordDisplayCard").classList.remove("hidden");
    showToast(`🤫 Secret word received from ${data.giverName}! Keep it safe!`, "success");
    if (window.sounds) window.sounds.yourTurn();
});

socket.on("questionRevealed", data => {
    // When question is asked, reveal word to everyone!
    showToast(`${data.askerName} asked ${data.targetName}!`, "success");
});

socket.on("voteProgress", data => {
    $("voteProgressText").textContent = `Votes Received: ${data.votesReceived} / ${data.totalVoters}`;
});

socket.on("answerResult", data => {
    // Voting finished! Display the breakdown
    const resultCard = $("votingResultCard");
    resultCard.classList.remove("hidden");

    let verdictText = "Verdict";
    if (data.isUnanimous) {
        verdictText = "👑 UNANIMOUS GENIUS! Perfect Match!";
        triggerConfetti(60);
        if (window.sounds) window.sounds.celebrate();
    } else if (data.isMajority) {
        verdictText = "🎉 MAJORITY MATCH! Makes Total Sense!";
        triggerConfetti(35);
        if (window.sounds) window.sounds.celebrate();
    } else {
        verdictText = "🤣 CHAOS DETECTED! Does Not Make Sense!";
    }

    $("votingVerdictBanner").textContent = verdictText;
    $("tallyYes").textContent = data.yes;
    $("tallyNo").textContent = data.no;
    $("pointsAwardedToast").textContent = `+${data.pointsEarned} Points for ${data.askerName} (Question Asker)!`;

    // 30-Second Countdown Animation & Timer
    if (resultCountdownTimer) {
        clearInterval(resultCountdownTimer);
        resultCountdownTimer = null;
    }

    const totalSeconds = data.displayDuration || 30;
    let secondsLeft = totalSeconds;

    const progressEl = $("resultCountdownProgress");
    const labelEl = $("resultTimerCountdown");
    const hostSkipBtn = $("btnHostSkipResult");

    if (progressEl) progressEl.style.width = "100%";
    if (labelEl) labelEl.textContent = `Next question in ${secondsLeft}s...`;

    if (hostSkipBtn) {
        if (currentState && currentState.isHost) {
            hostSkipBtn.classList.remove("hidden");
        } else {
            hostSkipBtn.classList.add("hidden");
        }
    }

    resultCountdownTimer = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(resultCountdownTimer);
            resultCountdownTimer = null;
            if (labelEl) labelEl.textContent = "Loading next question...";
            if (progressEl) progressEl.style.width = "0%";
            return;
        }
        if (labelEl) labelEl.textContent = `Next question in ${secondsLeft}s...`;
        if (progressEl) {
            const pct = Math.max(0, (secondsLeft / totalSeconds) * 100);
            progressEl.style.width = `${pct}%`;
        }
    }, 1000);
});

socket.on("kickedFromGame", data => {
    alert(data && data.message ? data.message : "You have been kicked from the game.");
    window.location.href = "/";
});

socket.on("playerKicked", data => {
    showToast(`👢 ${data.username} was kicked by majority vote!`, "error");
    if (window.sounds) window.sounds.reactionPop();
});

socket.on("kickVoteProgress", data => {
    showToast(`👢 Kick vote for ${data.targetName}: ${data.currentVotes}/${data.requiredVotes}`, "info");
});

socket.on("roundFinished", data => {
    triggerConfetti(100);
    if (window.sounds) window.sounds.celebrate();
});

socket.on("gameFinished", data => {
    triggerConfetti(200);
    if (window.sounds) window.sounds.celebrate();
});

/* =========================================================
   MAIN STATE RENDER DISPATCHER
========================================================= */

socket.on("state", state => {
    currentState = state;

    // Switch screen from Home to Arena
    $("homeScreen").classList.add("hidden");
    $("gameScreen").classList.remove("hidden");

    // Update Top Arena Bar
    $("displayRoomCode").textContent = state.gameCode;
    $("displayRoundNum").textContent = state.currentRound || 1;
    $("displayTotalRounds").textContent = state.rounds;

    const myScore = state.me ? (state.players.find(p => p.id === state.me.id)?.score || 0) : 0;
    $("displayMyScore").textContent = myScore;

    // Update Secret Word Peek Pill in Top Arena Bar
    if (state.me && state.me.secretWord) {
        $("arenaMyWordPill").classList.remove("hidden");
        updateSecretWordDisplays();
    } else {
        $("arenaMyWordPill").classList.add("hidden");
    }

    // Render Circle Visualizer
    if (circleVisualizer) {
        circleVisualizer.render(state);
    }

    // Hide all panels, then reveal current
    hideAllStagePanels();

    switch (state.phase) {
        case "lobby":
            $("panelLobby").classList.remove("hidden");
            renderLobby(state);
            break;
        case "wordPass":
            $("panelWordPass").classList.remove("hidden");
            renderWordPass(state);
            break;
        case "questions":
            $("panelQuestion").classList.remove("hidden");
            renderQuestion(state);
            break;
        case "voting":
            $("panelVoting").classList.remove("hidden");
            renderVoting(state);
            break;
        case "roundResults":
            $("panelRoundResults").classList.remove("hidden");
            renderRoundResults(state);
            break;
        case "finalResults":
            $("panelFinalResults").classList.remove("hidden");
            renderFinalResults(state);
            break;
    }
});

function hideAllStagePanels() {
    $("panelLobby").classList.add("hidden");
    $("panelWordPass").classList.add("hidden");
    $("panelQuestion").classList.add("hidden");
    $("panelVoting").classList.add("hidden");
    $("panelRoundResults").classList.add("hidden");
    $("panelFinalResults").classList.add("hidden");
}

function updateSecretWordDisplays() {
    const word = (currentState && currentState.me && currentState.me.secretWord) || "";
    const masked = isWordHidden ? "••••••••" : word;
    if ($("myPrivateWordText")) $("myPrivateWordText").textContent = masked;
    if ($("arenaMyWordText")) $("arenaMyWordText").textContent = masked;
    if ($("btnToggleHideWord")) $("btnToggleHideWord").textContent = isWordHidden ? "👁️ Show" : "👁️ Hide";
    if ($("btnArenaToggleWord")) $("btnArenaToggleWord").textContent = isWordHidden ? "👁️ Show" : "👁️ Hide";
}

/* =========================================================
   STAGE RENDERERS
========================================================= */

// 1. LOBBY
function renderLobby(state) {
    if (resultCountdownTimer) {
        clearInterval(resultCountdownTimer);
        resultCountdownTimer = null;
    }

    $("rosterCount").textContent = state.players.length;

    const list = $("lobbyRosterList");
    list.innerHTML = "";

    const threshold = state.kickThreshold || Math.max(1, Math.floor((state.players.length - 1) / 2) + 1);

    state.players.forEach(p => {
        const item = document.createElement("div");
        item.className = "roster-item";
        const isMe = state.me && state.me.id === p.id;
        const kickInfo = (state.kickVotes && state.kickVotes[p.id]) || { count: 0, votedByMe: false };

        const kickBtn = !isMe
            ? `<button class="btn-kick-vote ${kickInfo.votedByMe ? 'voted' : ''}" data-kick-id="${p.id}" title="Vote to kick ${p.username}">👢 ${kickInfo.votedByMe ? 'Voted' : 'Kick'} (${kickInfo.count}/${threshold})</button>`
            : "";

        item.innerHTML = `
            <div class="roster-seat">#${p.number}</div>
            <span class="roster-avatar">${p.avatar || "👤"}</span>
            <span class="roster-name">${p.username}</span>
            ${p.isHost ? '<span class="roster-host-tag">HOST</span>' : ""}
            ${kickBtn}
        `;
        list.appendChild(item);
    });

    if (state.isHost) {
        $("lobbyHostArea").classList.remove("hidden");
        $("lobbyWaitingArea").classList.add("hidden");
        $("btnStartGame").disabled = state.players.length < 2;
    } else {
        $("lobbyHostArea").classList.add("hidden");
        $("lobbyWaitingArea").classList.remove("hidden");
    }
}

// 2. WORD PASS (CLOCKWISE)
function renderWordPass(state) {
    const wp = state.wordPass;
    if (!wp) return;

    // Progress bar
    $("sealedCountText").textContent = `${wp.submittedCount} / ${wp.totalPlayers}`;
    const pct = Math.round((wp.submittedCount / wp.totalPlayers) * 100);
    $("sealedProgressBar").style.width = `${pct}%`;

    // Receiver Banner
    $("targetReceiverAvatar").textContent = wp.receiverAvatar || "👤";
    $("targetReceiverName").textContent = wp.receiverName || "Next Player";
    $("targetReceiverNum").textContent = `Player #${wp.receiverNumber}`;

    if (wp.hasSubmitted) {
        $("wordInputSection").classList.add("hidden");
        $("wordSealedSection").classList.remove("hidden");
    } else {
        $("wordInputSection").classList.remove("hidden");
        $("wordSealedSection").classList.add("hidden");
    }

    // If private word already arrived (e.g. state refresh)
    if (state.me && state.me.secretWord) {
        $("myGiverName").textContent = state.me.giverName || "Previous Player";
        $("mySecretWordDisplayCard").classList.remove("hidden");
        updateSecretWordDisplays();
    }
}

// 3. QUESTION STAGE (ANTICLOCKWISE)
function renderQuestion(state) {
    if (resultCountdownTimer) {
        clearInterval(resultCountdownTimer);
        resultCountdownTimer = null;
    }

    const q = state.question;
    if (!q) return;

    // Fresh question: reset voting buttons and previous results
    currentVote = null;
    document.querySelectorAll(".vote-card").forEach(btn => {
        btn.disabled = false;
        btn.classList.remove("selected");
    });
    $("votingResultCard").classList.add("hidden");

    $("questionProgressBadge").textContent = `Question ${q.questionNumber} of ${q.totalQuestions}`;

    // Asker & Target Showcase
    $("qaAskerAvatar").textContent = q.askerAvatar || "👤";
    $("qaAskerName").textContent = q.askerName;
    $("qaAskerNum").textContent = `Player #${q.askerNumber}`;

    $("qaTargetAvatar").textContent = q.targetAvatar || "👤";
    $("qaTargetName").textContent = q.targetName;
    $("qaTargetNum").textContent = `Player #${q.targetNumber}`;

    const isAsker = state.me && state.me.id === q.askerId;

    if (isAsker) {
        $("askerInputArea").classList.remove("hidden");
        $("askerWaitingArea").classList.add("hidden");
        $("askerTargetPromptName").textContent = q.targetName;
        $("questionInputText").focus();
        if (window.sounds) window.sounds.yourTurn();
    } else {
        $("askerInputArea").classList.add("hidden");
        $("askerWaitingArea").classList.remove("hidden");
        $("waitingForAskerText").textContent = `Waiting for ${q.askerName} to ask a question...`;
    }

    // Host Skip Turn
    if (state.isHost) {
        $("hostSkipTurnArea").classList.remove("hidden");
    } else {
        $("hostSkipTurnArea").classList.add("hidden");
    }
}

// 4. VOTING & REVEAL
function renderVoting(state) {
    const q = state.question;
    const v = state.voting;
    if (!q || !v) return;

    $("voteAskerHeader").textContent = `${q.askerName} asks:`;
    $("voteQuestionText").textContent = `"${q.questionText || "..."}"`;
    $("revealedWordText").textContent = q.revealedWord || "???";
    $("revealedTargetName").textContent = q.targetName;

    $("voteProgressText").textContent = `Votes Received: ${v.votesReceived} / ${v.totalVoters}`;

    const isAsker = state.me && state.me.id === (v.askerId || q.askerId);

    if (isAsker) {
        // Asker cannot vote on their own question!
        $("voteButtonsSection").classList.add("hidden");
        $("targetHotSeatNotice").classList.remove("hidden");
    } else {
        $("voteButtonsSection").classList.remove("hidden");
        $("targetHotSeatNotice").classList.add("hidden");

        // Disable voting buttons if already voted
        document.querySelectorAll(".vote-card").forEach(btn => {
            btn.disabled = v.hasVoted;
            if (v.hasVoted && btn.dataset.vote === currentVote) {
                btn.classList.add("selected");
            } else if (!v.hasVoted) {
                btn.classList.remove("selected");
            }
        });
    }

    // Clear previous verdict breakdown on fresh question
    if (v.votesReceived < v.totalVoters) {
        $("votingResultCard").classList.add("hidden");
    }
}

// 5. ROUND RESULTS
function renderRoundResults(state) {
    const res = state.roundResults;
    if (!res) return;

    const winners = res.winnerIds.map(id => state.players.find(p => p.id === id)).filter(Boolean);
    if (winners.length === 1) {
        $("roundWinnerBanner").textContent = `🏆 ${winners[0].username} takes the round!`;
    } else {
        $("roundWinnerBanner").textContent = `🏆 Tie: ${winners.map(w => w.username).join(" & ")}!`;
    }

    // Scores
    const scoreList = $("roundScoreList");
    scoreList.innerHTML = "";
    res.scores.sort((a, b) => b.score - a.score).forEach((p, idx) => {
        const item = document.createElement("div");
        item.className = "score-row-item";
        item.innerHTML = `
            <span class="score-rank">#${idx + 1}</span>
            <div class="score-player-info">
                <span class="score-avatar">${p.avatar || "👤"}</span>
                <span class="score-username">${p.username}</span>
            </div>
            <div class="score-values">
                <span class="round-pts-added">+${p.roundScore || 0}</span>
                <span class="score-total">${p.score} pts</span>
            </div>
        `;
        scoreList.appendChild(item);
    });

    // Highlights recap
    const recapList = $("roundRecapList");
    recapList.innerHTML = "";
    if (res.qaHistory && res.qaHistory.length) {
        res.qaHistory.forEach(qa => {
            const el = document.createElement("div");
            el.className = "score-row-item";
            el.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-size: 0.85rem; color: #cbd5e1;">Q by <strong>${qa.askerName}</strong>: "${qa.question}"</div>
                    <div style="font-size: 1rem; font-weight: 800; color: #fde047;">A (${qa.targetName}): ${qa.revealedWord}</div>
                </div>
                <div style="font-weight: 800; color: ${qa.majorityMatch ? '#34d399' : '#f87171'};">
                    ${qa.majorityMatch ? '✅ Majority Match' : '❌ Nonsense'} (+${qa.pointsAwarded} pts to ${qa.askerName})
                </div>
            `;
            recapList.appendChild(el);
        });
    }

    if (state.isHost) {
        $("hostNextRoundArea").classList.remove("hidden");
        $("waitingNextRoundArea").classList.add("hidden");
        $("nextRoundBtnText").textContent = state.currentRound >= state.rounds ? "View Final Champions 🏆" : "Next Round ➔";
    } else {
        $("hostNextRoundArea").classList.add("hidden");
        $("waitingNextRoundArea").classList.remove("hidden");
    }
}

// 6. FINAL RESULTS & 3D PODIUM
function renderFinalResults(state) {
    const res = state.finalResults;
    if (!res) return;

    const winners = res.winnerIds.map(id => state.players.find(p => p.id === id)).filter(Boolean);
    if (winners.length === 1) {
        $("finalWinnerBanner").textContent = `👑 ${winners[0].username} is the Grand Whisper Champion!`;
    } else {
        $("finalWinnerBanner").textContent = `👑 Grand Tie between ${winners.map(w => w.username).join(" & ")}!`;
    }

    // Podium rendering for top 3
    const podiumMount = $("podiumMount");
    podiumMount.innerHTML = "";

    const sorted = [...res.scores].sort((a, b) => b.score - a.score);

    if (sorted[1]) {
        // 2nd Place
        podiumMount.appendChild(createPodiumPillar(sorted[1], "second", "2", "🥈"));
    }
    if (sorted[0]) {
        // 1st Place
        podiumMount.appendChild(createPodiumPillar(sorted[0], "first", "1", "🥇"));
    }
    if (sorted[2]) {
        // 3rd Place
        podiumMount.appendChild(createPodiumPillar(sorted[2], "third", "3", "🥉"));
    }

    // Complete Leaderboard
    const finalScoreList = $("finalScoreList");
    finalScoreList.innerHTML = "";
    sorted.forEach((p, idx) => {
        const item = document.createElement("div");
        item.className = "score-row-item";
        item.innerHTML = `
            <span class="score-rank">#${idx + 1}</span>
            <div class="score-player-info">
                <span class="score-avatar">${p.avatar || "👤"}</span>
                <span class="score-username">${p.username}</span>
            </div>
            <div class="score-values">
                <span class="score-total">${p.score} pts</span>
            </div>
        `;
        finalScoreList.appendChild(item);
    });

    if (state.isHost) {
        $("hostRestartArea").classList.remove("hidden");
    } else {
        $("hostRestartArea").classList.add("hidden");
    }
}

function createPodiumPillar(player, orderClass, rankNum, medal) {
    const pillar = document.createElement("div");
    pillar.className = `podium-pillar ${orderClass}`;
    pillar.innerHTML = `
        <div class="podium-avatar-wrap">${player.avatar || "👤"}</div>
        <div class="podium-player-name">${player.username}</div>
        <div class="podium-block">
            <span class="podium-rank-num">${medal}</span>
            <span class="podium-pts">${player.score} pts</span>
        </div>
    `;
    return pillar;
}

/* =========================================================
   TOAST MESSAGE
========================================================= */

function showToast(msg, type = "info") {
    const box = $("toastBox");
    box.textContent = msg;
    box.className = `toast-box ${type}`;

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        box.className = "toast-box hidden";
    }, 3800);
}

/* =========================================================
   LIGHTWEIGHT PHYSICS PARTICLES CONFETTI
========================================================= */

function triggerConfetti(particleCount = 100) {
    const canvas = $("confettiCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#7c3aed", "#06b6d4", "#ec4899", "#f59e0b", "#10b981", "#ffffff"];

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height * 0.5,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 5,
            vy: Math.random() * 5 + 3,
            rot: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 10
        });
    }

    let frames = 0;
    function anim() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vRot;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rot * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });
        frames++;
        if (frames < 140) {
            requestAnimationFrame(anim);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    requestAnimationFrame(anim);
}