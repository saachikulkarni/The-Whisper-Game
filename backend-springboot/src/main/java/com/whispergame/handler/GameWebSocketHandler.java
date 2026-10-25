package com.whispergame.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.whispergame.dto.PublicGameState;
import com.whispergame.dto.WsMessage;
import com.whispergame.model.Game;
import com.whispergame.model.Player;
import com.whispergame.service.GameService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler implements GameService.EventBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(GameWebSocketHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final GameService gameService;

    // session ID -> WebSocketSession
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    // session ID -> gameCode
    private final Map<String, String> sessionGameCode = new ConcurrentHashMap<>();
    // session ID -> playerId
    private final Map<String, String> sessionPlayerId = new ConcurrentHashMap<>();

    public GameWebSocketHandler(GameService gameService) {
        this.gameService = gameService;
        this.gameService.setBroadcasters(this::broadcastGameState, this);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), session);
        log.info("WebSocket connected: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            String payload = message.getPayload();
            WsMessage wsMsg = objectMapper.readValue(payload, WsMessage.class);
            String event = wsMsg.getEvent();
            JsonNode data = wsMsg.getData();

            if (event == null) return;

            switch (event) {
                case "createGame" -> handleCreateGame(session, data);
                case "joinGame" -> handleJoinGame(session, data);
                case "reconnectPlayer" -> handleReconnect(session, data);
                case "startGame" -> handleStartGame(session);
                case "submitWord" -> handleSubmitWord(session, data);
                case "submitQuestion" -> handleSubmitQuestion(session, data);
                case "vote" -> handleVote(session, data);
                case "voteKickPlayer" -> handleVoteKick(session, data);
                case "kickPlayer" -> handleHostKick(session, data);
                case "skipTurn" -> handleSkipTurn(session);
                case "skipResultDisplay" -> handleSkipResultDisplay(session);
                case "nextRound" -> handleNextRound(session);
                case "restartGame" -> handleRestartGame(session);
                case "sendReaction" -> handleReaction(session, data);
                default -> log.warn("Unknown event: {}", event);
            }
        } catch (Exception e) {
            log.error("Error processing websocket message: {}", e.getMessage());
            sendErrorMessage(session, e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String sid = session.getId();
        sessions.remove(sid);
        sessionGameCode.remove(sid);
        sessionPlayerId.remove(sid);
        gameService.handleDisconnect(sid);
        log.info("WebSocket disconnected: {}", sid);
    }

    /* =========================================================
       EVENT HANDLERS
    ========================================================= */

    private void handleCreateGame(WebSocketSession session, JsonNode data) throws IOException {
        String username = data != null && data.has("username") ? data.get("username").asText() : "";
        String avatar = data != null && data.has("avatar") ? data.get("avatar").asText() : "🦊";
        int rounds = data != null && data.has("rounds") ? data.get("rounds").asInt(3) : 3;

        Game game = gameService.createGame(username, avatar, rounds, session.getId());
        Player host = game.getPlayers().get(0);

        sessionGameCode.put(session.getId(), game.getCode());
        sessionPlayerId.put(session.getId(), host.getId());

        Map<String, String> ack = new HashMap<>();
        ack.put("code", game.getCode());
        ack.put("playerId", host.getId());
        sendMessage(session, "gameCreated", ack);

        broadcastGameState(game.getCode(), null);
    }

    private void handleJoinGame(WebSocketSession session, JsonNode data) throws IOException {
        String code = data != null && data.has("code") ? data.get("code").asText() : "";
        String username = data != null && data.has("username") ? data.get("username").asText() : "";
        String avatar = data != null && data.has("avatar") ? data.get("avatar").asText() : "👤";

        Player player = gameService.joinGame(code, username, avatar, session.getId());
        sessionGameCode.put(session.getId(), code.toUpperCase());
        sessionPlayerId.put(session.getId(), player.getId());

        Map<String, String> ack = new HashMap<>();
        ack.put("code", code.toUpperCase());
        ack.put("playerId", player.getId());
        sendMessage(session, "joinedGame", ack);

        broadcastToGame(code.toUpperCase(), "soundEffect", "playerJoin");
        Map<String, String> joinedNotice = new HashMap<>();
        joinedNotice.put("username", player.getUsername());
        joinedNotice.put("avatar", player.getAvatar());
        broadcastToGame(code.toUpperCase(), "playerJoined", joinedNotice);

        broadcastGameState(code.toUpperCase(), null);
    }

    private void handleReconnect(WebSocketSession session, JsonNode data) throws IOException {
        String code = data != null && data.has("code") ? data.get("code").asText() : "";
        String playerId = data != null && data.has("playerId") ? data.get("playerId").asText() : "";

        Player player = gameService.reconnectPlayer(code, playerId, session.getId());
        if (player != null) {
            sessionGameCode.put(session.getId(), code.toUpperCase());
            sessionPlayerId.put(session.getId(), player.getId());

            if (player.getSecretWord() != null && !player.getSecretWord().isEmpty()) {
                Map<String, String> privateWordMap = new HashMap<>();
                privateWordMap.put("secretWord", player.getSecretWord());
                privateWordMap.put("giverName", player.getGiverName());
                sendMessage(session, "privateSecretWord", privateWordMap);
            }

            Map<String, String> ack = new HashMap<>();
            ack.put("code", code.toUpperCase());
            sendMessage(session, "reconnectedSuccess", ack);

            broadcastGameState(code.toUpperCase(), null);
        }
    }

    private void handleStartGame(WebSocketSession session) {
        String code = sessionGameCode.get(session.getId());
        String playerId = sessionPlayerId.get(session.getId());
        if (code != null && playerId != null) {
            gameService.startGame(code, playerId);
        }
    }

    private void handleSubmitWord(WebSocketSession session, JsonNode data) {
        String code = sessionGameCode.get(session.getId());
        String playerId = sessionPlayerId.get(session.getId());
        String word = data != null ? (data.isTextual() ? data.asText() : data.path("word").asText("")) : "";
        if (code != null && playerId != null) {
            gameService.submitWord(code, playerId, word);
        }
    }

    private void handleSubmitQuestion(WebSocketSession session, JsonNode data) {
        String code = sessionGameCode.get(session.getId());
        String playerId = sessionPlayerId.get(session.getId());
        String question = data != null ? (data.isTextual() ? data.asText() : data.path("question").asText("")) : "";
        if (code != null && playerId != null) {
            gameService.submitQuestion(code, playerId, question);
        }
    }

    private void handleVote(WebSocketSession session, JsonNode data) {
        String code = sessionGameCode.get(session.getId());
        String playerId = sessionPlayerId.get(session.getId());
        String vote = data != null ? (data.isTextual() ? data.asText() : data.path("vote").asText("")) : "";
        if (code != null && playerId != null) {
            gameService.submitVote(code, playerId, vote);
        }
    }

    private void handleVoteKick(WebSocketSession session, JsonNode data) {
        String code = sessionGameCode.get(session.getId());
        String voterId = sessionPlayerId.get(session.getId());
        String targetId = data != null ? (data.isTextual() ? data.asText() : data.path("targetPlayerId").asText("")) : "";
        if (code != null && voterId != null && !targetId.isEmpty()) {
            gameService.voteKickPlayer(code, voterId, targetId);
        }
    }

    private void handleHostKick(WebSocketSession session, JsonNode data) {
        String code = sessionGameCode.get(session.getId());
        String hostId = sessionPlayerId.get(session.getId());
        String targetId = data != null ? (data.isTextual() ? data.asText() : data.path("targetPlayerId").asText("")) : "";
        if (code != null && hostId != null && !targetId.isEmpty()) {
            Game game = gameService.getGame(code);
            if (game != null) {
                gameService.executeKick(game, targetId, "host");
            }
        }
    }

    private void handleSkipTurn(WebSocketSession session) {
        String code = sessionGameCode.get(session.getId());
        String hostId = sessionPlayerId.get(session.getId());
        if (code != null && hostId != null) {
            gameService.skipTurn(code, hostId);
        }
    }

    private void handleSkipResultDisplay(WebSocketSession session) {
        String code = sessionGameCode.get(session.getId());
        String hostId = sessionPlayerId.get(session.getId());
        if (code != null && hostId != null) {
            gameService.skipResultDisplay(code, hostId);
        }
    }

    private void handleNextRound(WebSocketSession session) {
        String code = sessionGameCode.get(session.getId());
        String hostId = sessionPlayerId.get(session.getId());
        if (code != null && hostId != null) {
            gameService.nextRound(code, hostId);
        }
    }

    private void handleRestartGame(WebSocketSession session) {
        String code = sessionGameCode.get(session.getId());
        String hostId = sessionPlayerId.get(session.getId());
        if (code != null && hostId != null) {
            gameService.restartGame(code, hostId);
        }
    }

    private void handleReaction(WebSocketSession session, JsonNode data) {
        String code = sessionGameCode.get(session.getId());
        String emoji = data != null ? (data.isTextual() ? data.asText() : data.path("emoji").asText("😂")) : "😂";
        String playerId = sessionPlayerId.get(session.getId());
        Game game = gameService.getGame(code);
        if (game != null) {
            Player p = game.getPlayer(playerId);
            Map<String, String> payload = new HashMap<>();
            payload.put("emoji", emoji);
            payload.put("username", p != null ? p.getUsername() : "Player");
            payload.put("playerId", playerId != null ? playerId : "");
            broadcastToGame(code, "reactionFired", payload);
        }
    }

    /* =========================================================
       SEND & BROADCAST HELPERS
    ========================================================= */

    public void broadcastGameState(String gameCode, PublicGameState ignore) {
        Game game = gameService.getGame(gameCode);
        if (game == null) return;

        for (Player p : game.getPlayers()) {
            WebSocketSession session = sessions.get(p.getSessionId());
            if (session != null && session.isOpen()) {
                PublicGameState state = gameService.buildPublicState(game, p);
                try {
                    sendMessage(session, "state", state);
                } catch (IOException e) {
                    log.error("Error sending state to player {}: {}", p.getUsername(), e.getMessage());
                }
            }
        }
    }

    @Override
    public void broadcastToGame(String gameCode, String event, Object payload) {
        Game game = gameService.getGame(gameCode);
        if (game == null) return;

        for (Player p : game.getPlayers()) {
            WebSocketSession session = sessions.get(p.getSessionId());
            if (session != null && session.isOpen()) {
                try {
                    sendMessage(session, event, payload);
                } catch (IOException e) {
                    log.error("Error broadcasting to player {}: {}", p.getUsername(), e.getMessage());
                }
            }
        }
    }

    @Override
    public void sendToSession(String sessionId, String event, Object payload) {
        WebSocketSession session = sessions.get(sessionId);
        if (session != null && session.isOpen()) {
            try {
                sendMessage(session, event, payload);
            } catch (IOException e) {
                log.error("Error sending event {} to session {}: {}", event, sessionId, e.getMessage());
            }
        }
    }

    private void sendErrorMessage(WebSocketSession session, String errorMsg) {
        if (session != null && session.isOpen()) {
            try {
                sendMessage(session, "errorMessage", errorMsg);
            } catch (IOException ignored) {}
        }
    }

    private void sendMessage(WebSocketSession session, String event, Object data) throws IOException {
        Map<String, Object> packet = new HashMap<>();
        packet.put("event", event);
        packet.put("data", data);
        String json = objectMapper.writeValueAsString(packet);
        synchronized (session) {
            session.sendMessage(new TextMessage(json));
        }
    }
}
