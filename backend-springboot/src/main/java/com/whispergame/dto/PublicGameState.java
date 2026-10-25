package com.whispergame.dto;

import java.util.List;
import java.util.Map;

public class PublicGameState {
    private String gameCode;
    private String phase;
    private int rounds;
    private int currentRound;
    private List<PlayerSummary> players;
    private int kickThreshold;
    private Map<String, KickVoteSummary> kickVotes;
    private MeSummary me;
    private boolean isHost;
    private boolean canStart;
    private WordPassSummary wordPass;
    private QuestionSummary question;
    private VotingSummary voting;
    private RoundResultsSummary roundResults;
    private FinalResultsSummary finalResults;

    public PublicGameState() {
    }

    public static class PlayerSummary {
        private String id;
        private String username;
        private String avatar;
        private int number;
        private int score;
        private boolean isHost;
        private boolean connected;
        private boolean submittedWord;

        public PlayerSummary() {}

        public PlayerSummary(String id, String username, String avatar, int number, int score,
                             boolean isHost, boolean connected, boolean submittedWord) {
            this.id = id;
            this.username = username;
            this.avatar = avatar;
            this.number = number;
            this.score = score;
            this.isHost = isHost;
            this.connected = connected;
            this.submittedWord = submittedWord;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }
        public int getNumber() { return number; }
        public void setNumber(int number) { this.number = number; }
        public int getScore() { return score; }
        public void setScore(int score) { this.score = score; }
        public boolean isIsHost() { return isHost; }
        public void setIsHost(boolean host) { isHost = host; }
        public boolean isConnected() { return connected; }
        public void setConnected(boolean connected) { this.connected = connected; }
        public boolean isSubmittedWord() { return submittedWord; }
        public void setSubmittedWord(boolean submittedWord) { this.submittedWord = submittedWord; }
    }

    public static class KickVoteSummary {
        private int count;
        private boolean votedByMe;

        public KickVoteSummary() {}
        public KickVoteSummary(int count, boolean votedByMe) {
            this.count = count;
            this.votedByMe = votedByMe;
        }

        public int getCount() { return count; }
        public void setCount(int count) { this.count = count; }
        public boolean isVotedByMe() { return votedByMe; }
        public void setVotedByMe(boolean votedByMe) { this.votedByMe = votedByMe; }
    }

    public static class MeSummary {
        private String id;
        private String username;
        private String avatar;
        private int number;
        private String secretWord;
        private String giverName;

        public MeSummary() {}
        public MeSummary(String id, String username, String avatar, int number, String secretWord, String giverName) {
            this.id = id;
            this.username = username;
            this.avatar = avatar;
            this.number = number;
            this.secretWord = secretWord;
            this.giverName = giverName;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }
        public int getNumber() { return number; }
        public void setNumber(int number) { this.number = number; }
        public String getSecretWord() { return secretWord; }
        public void setSecretWord(String secretWord) { this.secretWord = secretWord; }
        public String getGiverName() { return giverName; }
        public void setGiverName(String giverName) { this.giverName = giverName; }
    }

    public static class WordPassSummary {
        private int submittedCount;
        private int totalPlayers;
        private String receiverName;
        private Integer receiverNumber;
        private String receiverAvatar;
        private boolean hasSubmitted;

        public WordPassSummary() {}
        public WordPassSummary(int submittedCount, int totalPlayers, String receiverName,
                               Integer receiverNumber, String receiverAvatar, boolean hasSubmitted) {
            this.submittedCount = submittedCount;
            this.totalPlayers = totalPlayers;
            this.receiverName = receiverName;
            this.receiverNumber = receiverNumber;
            this.receiverAvatar = receiverAvatar;
            this.hasSubmitted = hasSubmitted;
        }

        public int getSubmittedCount() { return submittedCount; }
        public void setSubmittedCount(int submittedCount) { this.submittedCount = submittedCount; }
        public int getTotalPlayers() { return totalPlayers; }
        public void setTotalPlayers(int totalPlayers) { this.totalPlayers = totalPlayers; }
        public String getReceiverName() { return receiverName; }
        public void setReceiverName(String receiverName) { this.receiverName = receiverName; }
        public Integer getReceiverNumber() { return receiverNumber; }
        public void setReceiverNumber(Integer receiverNumber) { this.receiverNumber = receiverNumber; }
        public String getReceiverAvatar() { return receiverAvatar; }
        public void setReceiverAvatar(String receiverAvatar) { this.receiverAvatar = receiverAvatar; }
        public boolean isHasSubmitted() { return hasSubmitted; }
        public void setHasSubmitted(boolean hasSubmitted) { this.hasSubmitted = hasSubmitted; }
    }

    public static class QuestionSummary {
        private String askerId;
        private String askerName;
        private String askerAvatar;
        private int askerNumber;
        private String targetId;
        private String targetName;
        private String targetAvatar;
        private int targetNumber;
        private int questionNumber;
        private int totalQuestions;
        private String questionText;
        private String revealedWord;

        public QuestionSummary() {}

        public String getAskerId() { return askerId; }
        public void setAskerId(String askerId) { this.askerId = askerId; }
        public String getAskerName() { return askerName; }
        public void setAskerName(String askerName) { this.askerName = askerName; }
        public String getAskerAvatar() { return askerAvatar; }
        public void setAskerAvatar(String askerAvatar) { this.askerAvatar = askerAvatar; }
        public int getAskerNumber() { return askerNumber; }
        public void setAskerNumber(int askerNumber) { this.askerNumber = askerNumber; }
        public String getTargetId() { return targetId; }
        public void setTargetId(String targetId) { this.targetId = targetId; }
        public String getTargetName() { return targetName; }
        public void setTargetName(String targetName) { this.targetName = targetName; }
        public String getTargetAvatar() { return targetAvatar; }
        public void setTargetAvatar(String targetAvatar) { this.targetAvatar = targetAvatar; }
        public int getTargetNumber() { return targetNumber; }
        public void setTargetNumber(int targetNumber) { this.targetNumber = targetNumber; }
        public int getQuestionNumber() { return questionNumber; }
        public void setQuestionNumber(int questionNumber) { this.questionNumber = questionNumber; }
        public int getTotalQuestions() { return totalQuestions; }
        public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }
        public String getQuestionText() { return questionText; }
        public void setQuestionText(String questionText) { this.questionText = questionText; }
        public String getRevealedWord() { return revealedWord; }
        public void setRevealedWord(String revealedWord) { this.revealedWord = revealedWord; }
    }

    public static class VotingSummary {
        private String askerId;
        private String targetId;
        private int votesReceived;
        private int totalVoters;
        private boolean hasVoted;

        public VotingSummary() {}

        public String getAskerId() { return askerId; }
        public void setAskerId(String askerId) { this.askerId = askerId; }
        public String getTargetId() { return targetId; }
        public void setTargetId(String targetId) { this.targetId = targetId; }
        public int getVotesReceived() { return votesReceived; }
        public void setVotesReceived(int votesReceived) { this.votesReceived = votesReceived; }
        public int getTotalVoters() { return totalVoters; }
        public void setTotalVoters(int totalVoters) { this.totalVoters = totalVoters; }
        public boolean isHasVoted() { return hasVoted; }
        public void setHasVoted(boolean hasVoted) { this.hasVoted = hasVoted; }
    }

    public static class ScoreEntry {
        private String id;
        private String username;
        private String avatar;
        private int score;
        private int roundScore;

        public ScoreEntry() {}
        public ScoreEntry(String id, String username, String avatar, int score, int roundScore) {
            this.id = id;
            this.username = username;
            this.avatar = avatar;
            this.score = score;
            this.roundScore = roundScore;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }
        public int getScore() { return score; }
        public void setScore(int score) { this.score = score; }
        public int getRoundScore() { return roundScore; }
        public void setRoundScore(int roundScore) { this.roundScore = roundScore; }
    }

    public static class RoundResultsSummary {
        private List<String> winnerIds;
        private List<ScoreEntry> scores;
        private List<Object> qaHistory;

        public RoundResultsSummary() {}

        public List<String> getWinnerIds() { return winnerIds; }
        public void setWinnerIds(List<String> winnerIds) { this.winnerIds = winnerIds; }
        public List<ScoreEntry> getScores() { return scores; }
        public void setScores(List<ScoreEntry> scores) { this.scores = scores; }
        public List<Object> getQaHistory() { return qaHistory; }
        public void setQaHistory(List<Object> qaHistory) { this.qaHistory = qaHistory; }
    }

    public static class FinalResultsSummary {
        private List<String> winnerIds;
        private List<ScoreEntry> scores;

        public FinalResultsSummary() {}

        public List<String> getWinnerIds() { return winnerIds; }
        public void setWinnerIds(List<String> winnerIds) { this.winnerIds = winnerIds; }
        public List<ScoreEntry> getScores() { return scores; }
        public void setScores(List<ScoreEntry> scores) { this.scores = scores; }
    }

    public String getGameCode() { return gameCode; }
    public void setGameCode(String gameCode) { this.gameCode = gameCode; }
    public String getPhase() { return phase; }
    public void setPhase(String phase) { this.phase = phase; }
    public int getRounds() { return rounds; }
    public void setRounds(int rounds) { this.rounds = rounds; }
    public int getCurrentRound() { return currentRound; }
    public void setCurrentRound(int currentRound) { this.currentRound = currentRound; }
    public List<PlayerSummary> getPlayers() { return players; }
    public void setPlayers(List<PlayerSummary> players) { this.players = players; }
    public int getKickThreshold() { return kickThreshold; }
    public void setKickThreshold(int kickThreshold) { this.kickThreshold = kickThreshold; }
    public Map<String, KickVoteSummary> getKickVotes() { return kickVotes; }
    public void setKickVotes(Map<String, KickVoteSummary> kickVotes) { this.kickVotes = kickVotes; }
    public MeSummary getMe() { return me; }
    public void setMe(MeSummary me) { this.me = me; }
    public boolean isIsHost() { return isHost; }
    public void setIsHost(boolean host) { isHost = host; }
    public boolean isCanStart() { return canStart; }
    public void setCanStart(boolean canStart) { this.canStart = canStart; }
    public WordPassSummary getWordPass() { return wordPass; }
    public void setWordPass(WordPassSummary wordPass) { this.wordPass = wordPass; }
    public QuestionSummary getQuestion() { return question; }
    public void setQuestion(QuestionSummary question) { this.question = question; }
    public VotingSummary getVoting() { return voting; }
    public void setVoting(VotingSummary voting) { this.voting = voting; }
    public RoundResultsSummary getRoundResults() { return roundResults; }
    public void setRoundResults(RoundResultsSummary roundResults) { this.roundResults = roundResults; }
    public FinalResultsSummary getFinalResults() { return finalResults; }
    public void setFinalResults(FinalResultsSummary finalResults) { this.finalResults = finalResults; }
}
