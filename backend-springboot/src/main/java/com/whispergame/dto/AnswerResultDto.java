package com.whispergame.dto;

public class AnswerResultDto {
    private String askerId;
    private String askerName;
    private String targetId;
    private String targetName;
    private String revealedWord;
    private String question;
    private int yes;
    private int no;
    private int pointsEarned;
    private boolean isMajority;
    private boolean isUnanimous;
    private int displayDuration;

    public AnswerResultDto() {
        this.displayDuration = 30;
    }

    public String getAskerId() {
        return askerId;
    }

    public void setAskerId(String askerId) {
        this.askerId = askerId;
    }

    public String getAskerName() {
        return askerName;
    }

    public void setAskerName(String askerName) {
        this.askerName = askerName;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public String getTargetName() {
        return targetName;
    }

    public void setTargetName(String targetName) {
        this.targetName = targetName;
    }

    public String getRevealedWord() {
        return revealedWord;
    }

    public void setRevealedWord(String revealedWord) {
        this.revealedWord = revealedWord;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public int getYes() {
        return yes;
    }

    public void setYes(int yes) {
        this.yes = yes;
    }

    public int getNo() {
        return no;
    }

    public void setNo(int no) {
        this.no = no;
    }

    public int getPointsEarned() {
        return pointsEarned;
    }

    public void setPointsEarned(int pointsEarned) {
        this.pointsEarned = pointsEarned;
    }

    public boolean isMajority() {
        return isMajority;
    }

    public void setMajority(boolean majority) {
        isMajority = majority;
    }

    public boolean isUnanimous() {
        return isUnanimous;
    }

    public void setUnanimous(boolean unanimous) {
        isUnanimous = unanimous;
    }

    public int getDisplayDuration() {
        return displayDuration;
    }

    public void setDisplayDuration(int displayDuration) {
        this.displayDuration = displayDuration;
    }
}
