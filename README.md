# 🗣️ The Whisper Game — Real-Time Multiplayer Circle Party Game

A real-time multiplayer online party web game based on **The Whisper Game (Secret Word & Logic Match)** party rules.

Players sit in a **clockwise circle**, pass secret words **clockwise** (`1 ➔ 2 ➔ ... ➔ N ➔ 1`), and then ask custom questions **anticlockwise** (`N ➔ N-1 ➔ ... ➔ 1 ➔ N`). Players reveal their secret word as their answer, and all players vote on whether the answer makes sense to the question! Points are awarded based on **majority votes** with bonus multipliers for clever matches.

---

## 🎮 How the Game Works

### 1. Seating Order (Clockwise ↻)
- Players join via a 6-letter room code or direct invite link.
- Players pick an avatar (🦊, 🐼, 🦁, 🐯, 🦄, 🐸, 🐙, 🤖, etc.).
- All players are seated around **The Whisper Circle** in clockwise order (#1, #2, #3, ... #N).
- **Democratic Vote-to-Kick:** Any player can initiate or vote to kick another player by strict majority ($\lfloor (N-1)/2 \rfloor + 1$).

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

### 4. Phase 3: Reveal & Binary Majority Vote 🗳️
- The **Question Asker** is in the **Hot Seat** and cannot vote on their own question.
- All other players (including the target whose word was revealed) vote binary:
  - ✅ **YES!** — Makes perfect sense
  - ❌ **NO!** — Complete hilarious nonsense
- **Scoring (Awarded to the Question Asker)**:
  - `Base Points`: Number of YES votes.
  - `Majority Bonus`: +2 bonus points if YES votes exceed 50% of voters.
  - `Unanimous Bonus`: +1 bonus point if 100% of voters voted YES.
- **30-Second Showcase**: The question, revealed word, verdict, and score breakdown remain displayed for a full 30 seconds with animated countdown and host early skip.

### 5. Phase 4 & 5: Round Summaries & 3D Podium 🏆
- Round highlights showing the best question/answer pairings and round winners.
- Grand Final Results with an animated podium (1st 🥇, 2nd 🥈, 3rd 🥉), total scoreboard, and celebratory confetti shower!

---

## ⚡ Features & Technology Stack

| Feature | Details |
|---|---|
| **Backend** | Spring Boot 3.3.4, Java 21, Spring WebSocket |
| **Frontend** | Vanilla HTML5, CSS3, modern JavaScript (no heavy bundler needed!) |
| **Audio Engine** | Zero-asset Web Audio API polyphonic synth (join chimes, whooshes, drumrolls, fanfares) |
| **Interactive Table** | Dynamic SVG/CSS Whisper Circle showing seating order, flow arrows, and active spotlights |
| **Reactions** | Real-time floating emoji reaction dock (😂 👏 🤯 🔥 💀 🍕 🏆) |
| **Reconnection** | Session storage token restoration so refreshing does not drop your seat or word |
| **Sharing** | One-click copy room code & direct join link (`?code=ABCXYZ`) |

---

## 🚀 Quick Start

### 1. Requirements
- **JDK 21** (Temurin / Adoptium OpenJDK 21)
- Included self-contained Maven Wrapper (`mvnw` / `mvnw.cmd`)

### 2. Run the Spring Boot Server
```powershell
cd backend-springboot
.\mvnw.cmd spring-boot:run
```
The server will start at:
- 🌐 **Web Interface:** [http://localhost:8080](http://localhost:8080)
- ⚡ **WebSocket Endpoint:** `ws://localhost:8080/ws`
- 🩺 **Health Check:** [http://localhost:8080/health](http://localhost:8080/health)

### 3. Run Automated Tests
```powershell
cd backend-springboot
.\mvnw.cmd test
```

---

## 📁 Project Structure

```text
The-Whisper-Game/
├── backend-springboot/                                # ☕ Spring Boot 3 + Java 21 Backend
│   ├── pom.xml                                        # Maven dependencies & build configuration
│   ├── mvnw / mvnw.cmd                                # Self-contained Maven Wrapper scripts
│   ├── .mvn/                                          # Maven wrapper binary & settings
│   ├── README.md                                      # Spring Boot quickstart & API docs
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/whispergame/
│   │   │   │   ├── TheWhisperGameApplication.java     # Spring Boot Application Entry Point
│   │   │   │   ├── config/                            # WebSocket & Web MVC configurations
│   │   │   │   ├── controller/                        # REST Controllers (/health, /api/game/{code})
│   │   │   │   ├── dto/                               # WsMessage, PublicGameState, AnswerResultDto
│   │   │   │   ├── handler/                           # GameWebSocketHandler (Real-time event router)
│   │   │   │   ├── model/                             # Game, Player, Round, Phase, QuestionPair, QARecord
│   │   │   │   └── service/                           # GameService (Game mechanics & state machine)
│   │   │   └── resources/
│   │   │       ├── application.properties             # Server configuration
│   │   │       └── static/                            # Static frontend bundle
│   │   └── test/java/com/whispergame/
│   │       └── TheWhisperGameApplicationTests.java    # End-to-end integration tests
│   └── target/
│       └── the-whisper-game-1.0.0.jar                 # Standalone executable JAR
│
├── client/                                            # 🌐 Web Client Frontend
│   ├── index.html                                     # Game UI & Stage panels
│   ├── css/style.css                                  # Stylesheet
│   ├── js/                                            # Client JavaScript (app.js, audio.js, circle.js)
│   └── socket.io/socket.io.js                         # Native WebSocket bridge
│
└── README.md                                          # Master documentation
```
