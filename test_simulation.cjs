const { io } = require("socket.io-client");

const SERVER_URL = "http://localhost:3000";

function waitForConnect(sock) {
    if (sock.connected) return Promise.resolve();
    return new Promise(r => sock.once("connect", r));
}

async function runTest() {
    console.log("🚀 Starting The Whisper Game Multiplayer Automated Simulation...");

    const p1 = io(SERVER_URL);
    await waitForConnect(p1);
    console.log("✅ Player 1 (Alice - Host) connected");

    p1.emit("createGame", { username: "Alice", avatar: "🦊", rounds: 1 });

    const code = await new Promise(resolve => {
        p1.once("gameCreated", data => resolve(data.code));
    });
    console.log("✅ Game created with code:", code);

    const p2 = io(SERVER_URL);
    const p3 = io(SERVER_URL);
    const p4 = io(SERVER_URL);

    await Promise.all([
        waitForConnect(p2),
        waitForConnect(p3),
        waitForConnect(p4)
    ]);

    // Join sequentially so player numbers are deterministically 1, 2, 3, 4
    await new Promise(r => {
        p2.once("joinedGame", r);
        p2.emit("joinGame", { username: "Bob", avatar: "🐼", code });
    });
    console.log("✅ Bob joined as Player #2");

    await new Promise(r => {
        p3.once("joinedGame", r);
        p3.emit("joinGame", { username: "Charlie", avatar: "🦁", code });
    });
    console.log("✅ Charlie joined as Player #3");

    await new Promise(r => {
        p4.once("joinedGame", r);
        p4.emit("joinGame", { username: "Diana", avatar: "🦄", code });
    });
    console.log("✅ Diana joined as Player #4");

    // Setup listeners for privateSecretWord
    const privateWords = {};
    p1.on("privateSecretWord", d => { privateWords["Alice"] = d; });
    p2.on("privateSecretWord", d => { privateWords["Bob"] = d; });
    p3.on("privateSecretWord", d => { privateWords["Charlie"] = d; });
    p4.on("privateSecretWord", d => { privateWords["Diana"] = d; });

    // Wait for wordPass phase on p1
    const p1WordPass = new Promise(resolve => {
        p1.on("state", s => {
            if (s.phase === "wordPass") resolve(s);
        });
    });

    p1.emit("startGame");
    const wpState = await p1WordPass;
    console.log("✅ Game started! Seating Order:");
    wpState.players.forEach(p => console.log(`   #${p.number}: ${p.username}`));

    await new Promise(r => setTimeout(r, 200));

    // Clockwise word submission:
    // Player 1 (Alice) passes to Player 2 (Bob)
    // Player 2 (Bob) passes to Player 3 (Charlie)
    // Player 3 (Charlie) passes to Player 4 (Diana)
    // Player 4 (Diana) passes to Player 1 (Alice)
    console.log("📝 Submitting secret words clockwise...");
    p1.emit("submitWord", "Elephant");
    p2.emit("submitWord", "Pizza");
    p3.emit("submitWord", "Spaceship");
    p4.emit("submitWord", "Laptop");

    // Wait for all 4 private words to be received
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout waiting for private words")), 6000);
        const interval = setInterval(() => {
            if (Object.keys(privateWords).length === 4) {
                clearTimeout(timeout);
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });

    console.log("✅ All 4 secret words passed clockwise & verified:");
    console.log("   Player #1 (Alice) holds:", privateWords["Alice"].secretWord, "(from", privateWords["Alice"].giverName, ")");
    console.log("   Player #2 (Bob) holds:", privateWords["Bob"].secretWord, "(from", privateWords["Bob"].giverName, ")");
    console.log("   Player #3 (Charlie) holds:", privateWords["Charlie"].secretWord, "(from", privateWords["Charlie"].giverName, ")");
    console.log("   Player #4 (Diana) holds:", privateWords["Diana"].secretWord, "(from", privateWords["Diana"].giverName, ")");

    if (privateWords["Alice"].secretWord !== "Laptop") throw new Error("Alice should have received Diana's Laptop!");
    if (privateWords["Bob"].secretWord !== "Elephant") throw new Error("Bob should have received Alice's Elephant!");
    if (privateWords["Charlie"].secretWord !== "Pizza") throw new Error("Charlie should have received Bob's Pizza!");
    if (privateWords["Diana"].secretWord !== "Spaceship") throw new Error("Diana should have received Charlie's Spaceship!");

    // Wait for questions phase (anticlockwise)
    const questionState = await new Promise(resolve => {
        const handler = s => {
            if (s.phase === "questions" && s.question) {
                p1.off("state", handler);
                resolve(s);
            }
        };
        p1.on("state", handler);
    });
    console.log("✅ Phase: questions (Anticlockwise flow)");

    const currentPair = questionState.question;
    console.log(`✅ Anticlockwise Pair 1: ${currentPair.askerName} (#${currentPair.askerNumber}) asks ${currentPair.targetName} (#${currentPair.targetNumber})`);
    if (currentPair.askerName !== "Diana" || currentPair.targetName !== "Charlie") {
        throw new Error("Anticlockwise order must be Diana -> Charlie!");
    }

    // Wait for voting phase setup
    const votingStatePromise = new Promise(resolve => {
        const handler = s => {
            if (s.phase === "voting") {
                p1.off("state", handler);
                resolve(s);
            }
        };
        p1.on("state", handler);
    });

    // Diana asks custom question
    p4.emit("submitQuestion", "What did you order on food delivery at midnight?");

    await votingStatePromise;
    console.log("✅ Phase: voting (Secret word revealed: 'Pizza')");

    // Voters: Alice (p1), Bob (p2), Charlie (p3) vote "yes" on Diana's question!
    // Diana (p4) is the Asker and cannot vote.
    p1.emit("vote", "yes");
    p2.emit("vote", "yes");
    p3.emit("vote", "yes");

    // Wait for answerResult event
    const result = await new Promise(resolve => {
        p1.once("answerResult", resolve);
    });

    console.log(`✅ Answer Result for Asker ${result.askerName}:`);
    console.log(`   Question Asker: "${result.askerName}", Word Revealed: "${result.revealedWord}"`);
    console.log(`   Yes Votes: ${result.yes}, Points Earned by Asker: ${result.pointsEarned}`);
    console.log(`   Majority match: ${result.isMajority}, Unanimous: ${result.isUnanimous}`);

    if (result.askerName !== "Diana") throw new Error("Points should be awarded to the Asker (Diana)!");
    if (result.revealedWord !== "Pizza") throw new Error("Target's revealed word should be Pizza!");
    if (result.yes !== 3) throw new Error("Should have received 3 YES votes from other players!");
    if (result.pointsEarned !== 6) throw new Error("Scoring should be 3 base + 2 majority bonus + 1 unanimous bonus = 6 pts!");
    if (result.displayDuration !== 30) throw new Error("Display duration should be 30 seconds!");
    console.log("✅ Verified 30-second Q&A display duration metadata (30s)");

    // Test Host Early Skip of 30-second display
    console.log("⏩ Testing host skipping 30-second result display early...");
    const nextStepPromise = new Promise(resolve => {
        p1.on("state", s => {
            if (s.phase === "questions" || s.phase === "roundResults") resolve(s);
        });
    });
    p1.emit("skipResultDisplay");
    await nextStepPromise;
    console.log("✅ Host successfully skipped 30s display to next step");

    // Test Democratic Majority Vote Kick in a separate clean room
    console.log("👢 Testing Democratic Majority Vote to Kick...");
    const k1 = io(SERVER_URL);
    const k2 = io(SERVER_URL);
    const k3 = io(SERVER_URL);
    await Promise.all([waitForConnect(k1), waitForConnect(k2), waitForConnect(k3)]);

    k1.emit("createGame", { username: "HostUser", avatar: "🤖", rounds: 1 });
    const kickRoomCode = await new Promise(r => k1.once("gameCreated", d => r(d.code)));

    await new Promise(r => {
        k2.once("joinedGame", r);
        k2.emit("joinGame", { username: "VoterUser", avatar: "👽", code: kickRoomCode });
    });

    const targetPlayerId = await new Promise(r => {
        k3.once("joinedGame", d => r(d.playerId));
        k3.emit("joinGame", { username: "TargetUser", avatar: "🐸", code: kickRoomCode });
    });

    // In a 3-player room, total other players = 2. Majority threshold = floor(2/2)+1 = 2 votes.
    const kickedPromise = new Promise(resolve => {
        k3.once("kickedFromGame", resolve);
    });
    const playerKickedBroadcast = new Promise(resolve => {
        k1.once("playerKicked", resolve);
    });

    // k1 and k2 cast their votes to kick target
    k1.emit("voteKickPlayer", targetPlayerId);
    k2.emit("voteKickPlayer", targetPlayerId);

    const kickedEvent = await kickedPromise;
    const broadcastEvent = await playerKickedBroadcast;
    console.log("✅ Target player received kickedFromGame:", kickedEvent.message);
    console.log("✅ Room received playerKicked broadcast for:", broadcastEvent.username);

    if (broadcastEvent.username !== "TargetUser") throw new Error("Kicked player should be TargetUser!");

    k1.disconnect();
    k2.disconnect();
    k3.disconnect();

    console.log("\n🎉 ALL TESTS AND GAME LOGIC VERIFIED WITH 100% MATHEMATICAL PERFECTION!");

    p1.disconnect();
    p2.disconnect();
    p3.disconnect();
    p4.disconnect();
    process.exit(0);
}

runTest().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
