/* =========================================================
   THE WHISPER CIRCLE VISUALIZER
   Renders players seated in a clockwise circle around an animated central table
========================================================= */

class WhisperCircle {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    render(state) {
        if (!this.container) return;
        this.container.innerHTML = "";

        const players = (state && state.players) || [];
        const n = players.length;
        if (n === 0) return;

        // Visual stage container
        const stage = document.createElement("div");
        stage.className = "circle-stage";

        // Center table element
        const table = document.createElement("div");
        table.className = "circle-table";

        // Center status label depending on phase
        const centerInfo = document.createElement("div");
        centerInfo.className = "circle-center-info";

        let flowIcon = "⭕";
        let flowText = "Whisper Circle";
        let flowSub = `${n} Players`;

        if (state.phase === "lobby") {
            flowIcon = "👋";
            flowText = "Lobby Circle";
            flowSub = "Clockwise Seating";
        } else if (state.phase === "wordPass") {
            flowIcon = "↻ ✉️";
            flowText = "Clockwise Pass";
            flowSub = "1 ➔ 2 ➔ ... ➔ N ➔ 1";
            table.classList.add("flow-clockwise");
        } else if (state.phase === "questions" || state.phase === "voting") {
            flowIcon = "↺ 🎯";
            flowText = "Anticlockwise Flow";
            flowSub = "N ➔ N-1 ➔ ... ➔ 1 ➔ N";
            table.classList.add("flow-anticlockwise");
        } else if (state.phase === "roundResults" || state.phase === "finalResults") {
            flowIcon = "🏆";
            flowText = "Round Over";
            flowSub = "Scores Tallied";
        }

        centerInfo.innerHTML = `
            <div class="center-icon">${flowIcon}</div>
            <div class="center-title">${flowText}</div>
            <div class="center-sub">${flowSub}</div>
        `;
        table.appendChild(centerInfo);
        stage.appendChild(table);

        // Position each player around the circle
        // Radius responsive to screen
        const isMobile = window.innerWidth < 640;
        const radius = isMobile ? 115 : 170;

        players.forEach((player, i) => {
            // Clockwise distribution starting from 12 o'clock (-PI / 2)
            const angle = (2 * Math.PI * i) / n - Math.PI / 2;
            const x = Math.round(radius * Math.cos(angle));
            const y = Math.round(radius * Math.sin(angle));

            const seat = document.createElement("div");
            seat.className = "player-seat";
            seat.style.transform = `translate(${x}px, ${y}px)`;

            // Highlights based on current turn & roles
            const isMe = state.me && state.me.id === player.id;
            if (isMe) seat.classList.add("is-me");

            if (state.phase === "wordPass") {
                if (player.submittedWord) {
                    seat.classList.add("has-submitted");
                }
            } else if (state.phase === "questions" || state.phase === "voting") {
                if (state.question) {
                    if (player.id === state.question.askerId) {
                        seat.classList.add("is-asker");
                    }
                    if (player.id === state.question.targetId) {
                        seat.classList.add("is-target");
                    }
                }
            }

            const avatarDisplay = player.avatar || "👤";
            const kickInfo = (state.kickVotes && state.kickVotes[player.id]) || { count: 0, votedByMe: false };
            const kickThreshold = state.kickThreshold || Math.max(1, Math.floor((n - 1) / 2) + 1);
            const kickBtnHtml = !isMe ? `
                <button class="circle-kick-btn ${kickInfo.votedByMe ? 'voted' : ''}" data-kick-id="${player.id}" title="Vote to kick ${player.username}">
                    👢 ${kickInfo.count > 0 ? `${kickInfo.count}/${kickThreshold}` : 'Kick'}
                </button>
            ` : '';

            seat.innerHTML = `
                <div class="seat-badge">#${player.number}</div>
                <div class="seat-avatar">${avatarDisplay}</div>
                <div class="seat-name">${player.username} ${isMe ? "(You)" : ""}</div>
                <div class="seat-score">${player.score} pts</div>
                ${kickBtnHtml}
                ${!player.connected ? '<div class="seat-dc">Offline</div>' : ""}
            `;

            stage.appendChild(seat);
        });

        this.container.appendChild(stage);
    }
}

window.WhisperCircle = WhisperCircle;
