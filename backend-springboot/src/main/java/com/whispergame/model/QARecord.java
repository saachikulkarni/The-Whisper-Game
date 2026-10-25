package com.whispergame.model;

import java.util.Map;

public class QARecord {
    private String askerName;
    private String targetName;
    private String question;
    private String revealedWord;
    private Map<String, Integer> votes;
    private int pointsAwarded;
    private boolean majorityMatch;

    public QARecord() {
    }

    public QARecord(String askerName, String targetName, String question, String revealedWord,
                    Map<String, Integer> votes, int pointsAwarded, boolean majorityMatch) {
        this.askerName = askerName;
        this.targetName = targetName;
        this.question = question;
        this.revealedWord = revealedWord;
        this.votes = votes;
        this.pointsAwarded = pointsAwarded;
        this.majorityMatch = majorityMatch;
    }

    public String getAskerName() {
        return askerName;
    }

    public void setAskerName(String askerName) {
        this.askerName = askerName;
    }

    public String getTargetName() {
        return targetName;
    }

    public void setTargetName(String targetName) {
        this.targetName = targetName;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getRevealedWord() {
        return revealedWord;
    }

    public void setRevealedWord(String revealedWord) {
        this.revealedWord = revealedWord;
    }

    public Map<String, Integer> getVotes() {
        return votes;
    }

    public void setVotes(Map<String, Integer> votes) {
        this.votes = votes;
    }

    public int getPointsAwarded() {
        return pointsAwarded;
    }

    public void setPointsAwarded(int pointsAwarded) {
        this.pointsAwarded = pointsAwarded;
    }

    public boolean isMajorityMatch() {
        return majorityMatch;
    }

    public void setMajorityMatch(boolean majorityMatch) {
        this.majorityMatch = majorityMatch;
    }
}
