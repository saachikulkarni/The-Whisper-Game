# 🎪 The Whisper Game — Spring Boot Backend

High-performance real-time multiplayer backend for **The Whisper Game**, converted to **Java 21 + Spring Boot 3**.

---

## 🚀 Quick Start

### 1. Requirements
- **JDK 21** (already installed on this device at `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot`)
- No global Maven installation needed — the included `mvnw` wrapper handles everything!

### 2. Run the Spring Boot Server
Open terminal in `backend-springboot`:
```powershell
.\mvnw.cmd spring-boot:run
```
The server will start at:
- 🌐 **Web Interface:** [http://localhost:8080](http://localhost:8080)
- ⚡ **WebSocket Endpoint:** `ws://localhost:8080/ws`
- 🩺 **Health Check:** [http://localhost:8080/health](http://localhost:8080/health)

### 3. Run Automated Tests
```powershell
.\mvnw.cmd test
```

---

## 🏛️ Architecture & Project Structure

```text
backend-springboot/
├── pom.xml                                    # Maven configuration & dependencies
├── mvnw / mvnw.cmd                            # Maven Wrapper executables
├── .mvn/                                      # Maven Wrapper binary & settings
├── src/
│   ├── main/
│   │   ├── java/com/whispergame/
│   │   │   ├── TheWhisperGameApplication.java # Spring Boot Main Entry Point
│   │   │   ├── config/
│   │   │   │   ├── WebSocketConfig.java       # WebSocket endpoint registration (/ws)
│   │   │   │   └── WebMvcConfig.java          # Static file & web asset serving
│   │   │   ├── controller/
│   │   │   │   └── GameController.java        # REST API endpoints (/health, /api/game/{code})
│   │   │   ├── dto/
│   │   │   │   ├── WsMessage.java             # JSON WebSocket envelope {event, data}
│   │   │   │   ├── PublicGameState.java       # Sanitized public state sent to clients
│   │   │   │   └── AnswerResultDto.java       # Question, answer, and vote result payload
│   │   │   ├── handler/
│   │   │   │   └── GameWebSocketHandler.java  # Real-time event routing & broadcasting
│   │   │   ├── model/
│   │   │   │   ├── Game.java                  # Room state & players
│   │   │   │   ├── Player.java                # Player state, session, and scores
│   │   │   │   ├── Round.java                 # Word pass & question pairing lifecycle
│   │   │   │   ├── Phase.java                 # Game phases enum
│   │   │   │   ├── QuestionPair.java          # Asker/target indices
│   │   │   │   └── QARecord.java              # Historical Q&A record
│   │   │   └── service/
│   │   │       └── GameService.java           # Core gameplay rules & state machine
│   │   └── resources/
│   │       ├── application.properties         # Server port 8080 & static locations
│   │       └── static/                        # Frontend assets (HTML, CSS, JS, audio)
│   └── test/
│       └── java/com/whispergame/
│           └── TheWhisperGameApplicationTests.java # End-to-end integration tests
└── README.md
```

---

## ⚡ Real-Time WebSocket Protocol

Clients connect to `ws://localhost:8080/ws` and exchange standard JSON envelopes:
```json
{
  "event": "eventName",
  "data": { ... }
}
```

### Client ➔ Server Events:
- `createGame`: `{ username, avatar, rounds }`
- `joinGame`: `{ username, avatar, code }`
- `reconnectPlayer`: `{ code, playerId }`
- `startGame`: `{}`
- `submitWord`: `string`
- `submitQuestion`: `string`
- `vote`: `"yes"` or `"no"`
- `voteKickPlayer`: `targetPlayerId`
- `kickPlayer`: `targetPlayerId` (host lobby kick)
- `skipTurn`: `{}` (host skip idle turn)
- `skipResultDisplay`: `{}` (host early skip of 30-second delay)
- `nextRound`: `{}`
- `restartGame`: `{}`
- `sendReaction`: `emoji`

### Server ➔ Client Events:
- `gameCreated`: `{ code, playerId }`
- `joinedGame`: `{ code, playerId }`
- `reconnectedSuccess`: `{ code }`
- `state`: `PublicGameState` (automatically sanitized; private words hidden)
- `privateSecretWord`: `{ secretWord, giverName }`
- `wordSealed`: `{ giverName, receiverName }`
- `questionRevealed`: `{ askerName, targetName, question, revealedWord }`
- `voteProgress`: `{ votesReceived, totalVoters }`
- `answerResult`: `{ question, revealedWord, yes, no, pointsEarned, isMajority, displayDuration: 30 }`
- `playerKicked`: `{ playerId, username, reason }`
- `kickedFromGame`: `{ message }`
- `soundEffect`: `soundName`
- `errorMessage`: `message`
