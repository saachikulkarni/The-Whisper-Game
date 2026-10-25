package com.whispergame.model.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.List;
import java.util.Map;

@Document(collection = "game_history")
public class GameHistoryDocument {

    @Id
    private String id;
    private String gameCode;
    private String hostName;
    private int rounds;
    private int completedRounds;
    private List<Map<String, Object>> players;
    private List<String> winners;
    private Date completedAt;

    public GameHistoryDocument() {
        this.completedAt = new Date();
    }

    public GameHistoryDocument(String gameCode, String hostName, int rounds, int completedRounds,
                               List<Map<String, Object>> players, List<String> winners) {
        this.gameCode = gameCode;
        this.hostName = hostName;
        this.rounds = rounds;
        this.completedRounds = completedRounds;
        this.players = players;
        this.winners = winners;
        this.completedAt = new Date();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getGameCode() {
        return gameCode;
    }

    public void setGameCode(String gameCode) {
        this.gameCode = gameCode;
    }

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
    }

    public int getRounds() {
        return rounds;
    }

    public void setRounds(int rounds) {
        this.rounds = rounds;
    }

    public int getCompletedRounds() {
        return completedRounds;
    }

    public void setCompletedRounds(int completedRounds) {
        this.completedRounds = completedRounds;
    }

    public List<Map<String, Object>> getPlayers() {
        return players;
    }

    public void setPlayers(List<Map<String, Object>> players) {
        this.players = players;
    }

    public List<String> getWinners() {
        return winners;
    }

    public void setWinners(List<String> winners) {
        this.winners = winners;
    }

    public Date getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Date completedAt) {
        this.completedAt = completedAt;
    }
}
