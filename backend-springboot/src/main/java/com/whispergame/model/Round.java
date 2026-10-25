package com.whispergame.model;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class Round {
    private List<String> givenWords;
    private int submittedCount;
    private List<QuestionPair> questionPairs;
    private int questionIndex;
    private String currentQuestion;
    private String currentTargetId;
    private String revealedWord;
    private Map<String, String> votes; // voterPlayerId -> "yes" | "no"
    private Map<String, Integer> roundScores; // playerId -> points earned in this round
    private List<QARecord> qaHistory;
    private List<String> winnerIds;

    public Round() {
        this.givenWords = new ArrayList<>();
        this.submittedCount = 0;
        this.questionPairs = new ArrayList<>();
        this.questionIndex = 0;
        this.votes = new ConcurrentHashMap<>();
        this.roundScores = new ConcurrentHashMap<>();
        this.qaHistory = new ArrayList<>();
        this.winnerIds = new ArrayList<>();
    }

    public Round(int playerCount) {
        this.givenWords = new ArrayList<>(Collections.nCopies(playerCount, null));
        this.submittedCount = 0;
        this.questionPairs = buildAnticlockwisePairs(playerCount);
        this.questionIndex = 0;
        this.votes = new ConcurrentHashMap<>();
        this.roundScores = new ConcurrentHashMap<>();
        this.qaHistory = new ArrayList<>();
        this.winnerIds = new ArrayList<>();
    }

    public static List<QuestionPair> buildAnticlockwisePairs(int n) {
        List<QuestionPair> pairs = new ArrayList<>();
        if (n < 2) return pairs;
        // Anticlockwise loop:
        // n-1 asks n-2, n-2 asks n-3, ... 0 asks n-1
        for (int i = n - 1; i >= 0; i--) {
            int target = (i - 1 + n) % n;
            pairs.add(new QuestionPair(i, target));
        }
        return pairs;
    }

    public List<String> getGivenWords() {
        return givenWords;
    }

    public void setGivenWords(List<String> givenWords) {
        this.givenWords = givenWords;
    }

    public int getSubmittedCount() {
        return submittedCount;
    }

    public void setSubmittedCount(int submittedCount) {
        this.submittedCount = submittedCount;
    }

    public void incrementSubmittedCount() {
        this.submittedCount++;
    }

    public List<QuestionPair> getQuestionPairs() {
        return questionPairs;
    }

    public void setQuestionPairs(List<QuestionPair> questionPairs) {
        this.questionPairs = questionPairs;
    }

    public int getQuestionIndex() {
        return questionIndex;
    }

    public void setQuestionIndex(int questionIndex) {
        this.questionIndex = questionIndex;
    }

    public void incrementQuestionIndex() {
        this.questionIndex++;
    }

    public String getCurrentQuestion() {
        return currentQuestion;
    }

    public void setCurrentQuestion(String currentQuestion) {
        this.currentQuestion = currentQuestion;
    }

    public String getCurrentTargetId() {
        return currentTargetId;
    }

    public void setCurrentTargetId(String currentTargetId) {
        this.currentTargetId = currentTargetId;
    }

    public String getRevealedWord() {
        return revealedWord;
    }

    public void setRevealedWord(String revealedWord) {
        this.revealedWord = revealedWord;
    }

    public Map<String, String> getVotes() {
        return votes;
    }

    public void setVotes(Map<String, String> votes) {
        this.votes = votes;
    }

    public Map<String, Integer> getRoundScores() {
        return roundScores;
    }

    public void setRoundScores(Map<String, Integer> roundScores) {
        this.roundScores = roundScores;
    }

    public List<QARecord> getQaHistory() {
        return qaHistory;
    }

    public void setQaHistory(List<QARecord> qaHistory) {
        this.qaHistory = qaHistory;
    }

    public List<String> getWinnerIds() {
        return winnerIds;
    }

    public void setWinnerIds(List<String> winnerIds) {
        this.winnerIds = winnerIds;
    }
}
