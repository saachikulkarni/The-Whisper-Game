# 🗣️ The Whisper Game — Multiplayer Circle Party Game

A real-time multiplayer online party web game based on **The Whisper Game (Secret Word & Logic Match)** party rules.

Players sit in a **clockwise circle**, pass secret words **clockwise** (`1 ➔ 2 ➔ ... ➔ N ➔ 1`), and then ask custom questions **anticlockwise** (`N ➔ N-1 ➔ ... ➔ 1 ➔ N`). Players reveal their secret word as their answer, and all players vote on whether the answer makes sense to the question! Points are awarded based on **majority votes** with bonus multipliers for clever matches.

---

## 🎮 How the Game Works

### 1. Seating Order (Clockwise ↻)
- Players join via a 6-letter room code or direct invite link.
- Players pick an avatar (🦊, 🐼, 🦁, 🐯, 🦄, 🐸, 🐙, 🤖, etc.).
- All players are seated around **The Whisper Circle** in clockwise order (#1, #2, #3, ... #N).
- Democratic kick feature: Players can vote to kick any player by majority vote at any time.

### 2. Phase 1: Clockwise Secret Word Pass (↻)
- Every player secretly chooses a unique word for their clockwise neighbor:
  - **Player 1** gives a secret word to **Player 2**
  - **Player 2** gives a secret word to **Player 3**
  - ...
  - **Player N** gives a secret word to **Player 1**
- Words can be names, places, animals, things, or absurd concepts (with built-in category prompts & "🎲 Random Idea" spark).
- Words are kept strictly secret on the server — only the recipient holds their private secret word!

### 3. Phase 2: Anticlockwise Question Flow (↺)
- The direction reverses!
  - **Player N** asks **Player N-1**
  - **Player N-1** asks **Player N-2**
  - ...
  - **Player 2** asks **Player 1**
  - **Player 1** asks **Player N**
- The asker can type any question or pick from categorized funny prompts (Hilarious, Awkward, Survival, Wild).
- Once asked, the target's secret word is **revealed out loud** on screen as their answer!

### 4. Phase 3: Reveal & Majority Vote 🗳️
- The **Question Asker** is in the **Hot Seat** and cannot vote on their own question.
- All other players (including the target whose word was revealed) vote binary:
  - ✅ **YES!** — Makes perfect sense
  - ❌ **NO!** — Complete hilarious nonsense
- **Scoring (Awarded to the Question Asker)**:
  - `Base Points`: Number of YES votes.
  - `Majority Bonus`: +2 bonus points if YES votes exceed 50% of voters.
  - `Unanimous Bonus`: +1 bonus point if 100% of voters voted YES.
- **30-Second Showcase**: The question, revealed word, verdict, and point breakdown remain displayed for a full 30 seconds (with live countdown and host early skip).

### 5. Phase 4 & 5: Round Summaries & 3D Podium 🏆
- Round highlights showing the best question/answer pairings and round winners.
- Grand Final Results with a **3D animated podium** (1st 🥇, 2nd 🥈, 3rd 🥉), total scoreboard, and celebratory confetti shower!

---

## ⚡ Features & Technology Stack

| Feature | Details |
|---|---|
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | MongoDB with Mongoose (with automatic in-memory fallback if MongoDB is offline) |
| **Frontend** | Vanilla HTML5, CSS3, modern JavaScript (no heavy bundler needed!) |
| **Audio Engine** | Zero-asset Web Audio API polyphonic synth (join chimes, whooshes, drumrolls, celebration fanfares) |
| **Interactive Table** | Dynamic SVG/CSS Whisper Circle showing seating order, flow arrows, and active spotlights |
| **Reactions** | Real-time floating emoji reaction dock (😂 👏 🤯 🔥 💀 🍕 🏆) |
| **Reconnection** | Session storage token restoration so refreshing does not drop your seat or word |
| **Sharing** | One-click copy room code & direct join link (`?code=ABCXYZ`) |

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Server
```bash
npm start
```
The server will start at **http://localhost:3000**!

### 3. Run Automated Simulation Test
Run the automated 4-player multiplayer simulation to verify all game rules, socket events, and scoring:
```bash
npm test
```

---

## 📁 Project Structure

```text
Chinese-Whisper/
├── client/
│   ├── index.html            # Main UI & Stage Panels
│   ├── css/
│   │   └── style.css         # Modern glassmorphism theme & animations
│   └── js/
│       ├── app.js            # Client application controller
│       ├── audio.js          # Web Audio API sound synthesizer
│       └── circle.js         # The Whisper Circle visualizer component
├── server/
│   ├── server.js             # Express + Socket.IO server & game logic
│   ├── db.js                 # MongoDB connection with in-memory fallback
│   └── models/
│       ├── Game.js           # Mongoose Game schema
│       ├── Round.js          # Mongoose Round & Q/A schema
│       └── Player.js         # Mongoose Player schema
├── test_simulation.cjs       # Automated multiplayer test suite
├── package.json
└── README.md
```
