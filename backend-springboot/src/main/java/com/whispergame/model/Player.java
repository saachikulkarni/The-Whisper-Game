package com.whispergame.model;

public class Player {
    private String id;
    private String sessionId;
    private String username;
    private String avatar;
    private int score;
    private boolean connected;
    private String secretWord;
    private String giverName;

    public Player() {
        this.score = 0;
        this.connected = true;
        this.secretWord = "";
        this.giverName = "";
    }

    public Player(String id, String sessionId, String username, String avatar) {
        this.id = id;
        this.sessionId = sessionId;
        this.username = username;
        this.avatar = avatar;
        this.score = 0;
        this.connected = true;
        this.secretWord = "";
        this.giverName = "";
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public void addScore(int points) {
        this.score += points;
    }

    public boolean isConnected() {
        return connected;
    }

    public void setConnected(boolean connected) {
        this.connected = connected;
    }

    public String getSecretWord() {
        return secretWord;
    }

    public void setSecretWord(String secretWord) {
        this.secretWord = secretWord;
    }

    public String getGiverName() {
        return giverName;
    }

    public void setGiverName(String giverName) {
        this.giverName = giverName;
    }
}
