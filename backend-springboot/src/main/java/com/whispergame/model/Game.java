package com.whispergame.model;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

public class Game {
    private String code;
    private String hostPlayerId;
    private int rounds;
    private int currentRound;
    private Phase phase;
    private List<Player> players;
    private Round round;
    private Map<String, List<String>> kickVotes; // targetPlayerId -> List of voterPlayerIds
    private transient ScheduledFuture<?> resultTimer;
    private long createdAt;

    public Game() {
        this.phase = Phase.LOBBY;
        this.players = new ArrayList<>();
        this.kickVotes = new ConcurrentHashMap<>();
        this.createdAt = System.currentTimeMillis();
    }

    public Game(String code, String hostPlayerId, int rounds) {
        this.code = code;
        this.hostPlayerId = hostPlayerId;
        this.rounds = rounds;
        this.currentRound = 0;
        this.phase = Phase.LOBBY;
        this.players = new ArrayList<>();
        this.round = null;
        this.kickVotes = new ConcurrentHashMap<>();
        this.createdAt = System.currentTimeMillis();
    }

    public Player getPlayer(String playerId) {
        if (playerId == null) return null;
        for (Player p : players) {
            if (playerId.equals(p.getId())) {
                return p;
            }
        }
        return null;
    }

    public Player getPlayerBySession(String sessionId) {
        if (sessionId == null) return null;
        for (Player p : players) {
            if (sessionId.equals(p.getSessionId())) {
                return p;
            }
        }
        return null;
    }

    public int getPlayerIndex(String playerId) {
        if (playerId == null) return -1;
        for (int i = 0; i < players.size(); i++) {
            if (playerId.equals(players.get(i).getId())) {
                return i;
            }
        }
        return -1;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getHostPlayerId() {
        return hostPlayerId;
    }

    public void setHostPlayerId(String hostPlayerId) {
        this.hostPlayerId = hostPlayerId;
    }

    public int getRounds() {
        return rounds;
    }

    public void setRounds(int rounds) {
        this.rounds = rounds;
    }

    public int getCurrentRound() {
        return currentRound;
    }

    public void setCurrentRound(int currentRound) {
        this.currentRound = currentRound;
    }

    public Phase getPhase() {
        return phase;
    }

    public void setPhase(Phase phase) {
        this.phase = phase;
    }

    public List<Player> getPlayers() {
        return players;
    }

    public void setPlayers(List<Player> players) {
        this.players = players;
    }

    public Round getRound() {
        return round;
    }

    public void setRound(Round round) {
        this.round = round;
    }

    public Map<String, List<String>> getKickVotes() {
        return kickVotes;
    }

    public void setKickVotes(Map<String, List<String>> kickVotes) {
        this.kickVotes = kickVotes;
    }

    public ScheduledFuture<?> getResultTimer() {
        return resultTimer;
    }

    public void setResultTimer(ScheduledFuture<?> resultTimer) {
        this.resultTimer = resultTimer;
    }

    public void cancelResultTimer() {
        if (this.resultTimer != null) {
            this.resultTimer.cancel(false);
            this.resultTimer = null;
        }
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(long createdAt) {
        this.createdAt = createdAt;
    }
}
