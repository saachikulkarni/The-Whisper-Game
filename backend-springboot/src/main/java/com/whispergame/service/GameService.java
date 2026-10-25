package com.whispergame.service;

import com.whispergame.dto.AnswerResultDto;
import com.whispergame.dto.PublicGameState;
import com.whispergame.model.*;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.BiConsumer;

@Service
public class GameService {

    public static final List<String> DEFAULT_AVATARS = List.of(
            "🦊", "🐼", "🦁", "🐯", "🦄", "🐸", "🐙", "🤖", "👽", "🦉", "🐵", "🐧", "🐲", "🐱", "🐶", "🚀"
    );

    private final Map<String, Game> games = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final SecureRandom random = new SecureRandom();
    private final MongoHistoryService mongoHistoryService;

    public GameService(@org.springframework.beans.factory.annotation.Autowired(required = false) MongoHistoryService mongoHistoryService) {
        this.mongoHistoryService = mongoHistoryService;
    }

    // Broadcast callbacks to handler
    private BiConsumer<String, PublicGameState> stateBroadcaster;
    private EventBroadcaster eventBroadcaster;

    public interface EventBroadcaster {
        void broadcastToGame(String gameCode, String event, Object payload);
        void sendToSession(String sessionId, String event, Object payload);
    }

    public void setBroadcasters(BiConsumer<String, PublicGameState> stateBroadcaster, EventBroadcaster eventBroadcaster) {
        this.stateBroadcaster = stateBroadcaster;
        this.eventBroadcaster = eventBroadcaster;
    }

    public Game getGame(String code) {
        if (code == null) return null;
        return games.get(code.toUpperCase());
    }

    public int getActiveGamesCount() {
        return games.size();
    }

    /* =========================================================
       GAME ACTIONS
    ========================================================= */

    public synchronized Game createGame(String username, String avatar, int rounds, String sessionId) {
        String cleanUser = cleanText(username, 25);
        if (cleanUser.isEmpty()) cleanUser = "Host";

        String cleanAvatar = (avatar != null && !avatar.isEmpty()) ? avatar : DEFAULT_AVATARS.get(0);
        int cleanRounds = (rounds >= 1 && rounds <= 10) ? rounds : 3;

        String code = generateGameCode();
        String playerId = generatePlayerId();

        Player host = new Player(playerId, sessionId, cleanUser, cleanAvatar);
        Game game = new Game(code, playerId, cleanRounds);
        game.getPlayers().add(host);

        games.put(code, game);
        return game;
    }

    public synchronized Player joinGame(String code, String username, String avatar, String sessionId) {
        Game game = getGame(code);
        if (game == null) {
            throw new IllegalArgumentException("Game not found. Please double check the code.");
        }

        if (game.getPhase() != Phase.LOBBY) {
            throw new IllegalStateException("This game has already started.");
        }

        if (game.getPlayers().size() >= 12) {
            throw new IllegalStateException("Lobby is full (maximum 12 players).");
        }

        String cleanUser = cleanText(username, 25);
        if (cleanUser.isEmpty()) {
            throw new IllegalArgumentException("Please enter your name.");
        }

        for (Player p : game.getPlayers()) {
            if (p.getUsername().equalsIgnoreCase(cleanUser)) {
                throw new IllegalArgumentException("That name is already taken in this lobby. Choose another!");
            }
        }

        String cleanAvatar = (avatar != null && !avatar.isEmpty()) ? avatar : DEFAULT_AVATARS.get(random.nextInt(DEFAULT_AVATARS.size()));
        String playerId = generatePlayerId();
        Player newPlayer = new Player(playerId, sessionId, cleanUser, cleanAvatar);

        game.getPlayers().add(newPlayer);
        return newPlayer;
    }

    public synchronized Player reconnectPlayer(String code, String playerId, String sessionId) {
        Game game = getGame(code);
        if (game == null) return null;

        Player player = game.getPlayer(playerId);
        if (player == null) return null;

        player.setSessionId(sessionId);
        player.setConnected(true);
        return player;
    }

    public synchronized void startGame(String code, String hostPlayerId) {
        Game game = getGame(code);
        if (game == null) return;

        if (!hostPlayerId.equals(game.getHostPlayerId())) {
            throw new IllegalStateException("Only the room host can start the game.");
        }

        if (game.getPlayers().size() < 2) {
            throw new IllegalStateException("At least 2 players are needed to play The Whisper Game.");
        }

        game.setPhase(Phase.WORD_PASS);
        game.setCurrentRound(1);
        for (Player p : game.getPlayers()) {
            p.setScore(0);
            p.setSecretWord("");
            p.setGiverName("");
        }

        game.setRound(new Round(game.getPlayers().size()));
        if (eventBroadcaster != null) {
            eventBroadcaster.broadcastToGame(game.getCode(), "soundEffect", "gameStart");
        }
        broadcastState(game);
    }

    public synchronized void submitWord(String code, String playerId, String wordText) {
        Game game = getGame(code);
        if (game == null || game.getPhase() != Phase.WORD_PASS) return;

        int myIndex = game.getPlayerIndex(playerId);
        if (myIndex == -1) return;

        Round round = game.getRound();
        if (round == null) return;

        if (round.getGivenWords().get(myIndex) != null) {
            throw new IllegalStateException("You have already passed your secret word for this round.");
        }

        String cleanWord = cleanText(wordText, 60);
        if (cleanWord.isEmpty()) {
            throw new IllegalArgumentException("Please type a word before submitting.");
        }

        round.getGivenWords().set(myIndex, cleanWord);
        round.incrementSubmittedCount();

        int receiverIndex = (myIndex + 1) % game.getPlayers().size();
        Player receiver = game.getPlayers().get(receiverIndex);
        Player giver = game.getPlayers().get(myIndex);

        if (eventBroadcaster != null) {
            Map<String, String> sealInfo = new HashMap<>();
            sealInfo.put("giverName", giver.getUsername());
            sealInfo.put("receiverName", receiver.getUsername());
            eventBroadcaster.broadcastToGame(game.getCode(), "wordSealed", sealInfo);
            eventBroadcaster.sendToSession(giver.getSessionId(), "soundEffect", "wordPass");
        }

        broadcastState(game);

        // Check if all players submitted their word
        if (round.getSubmittedCount() >= game.getPlayers().size()) {
            int n = game.getPlayers().size();
            for (int j = 0; j < n; j++) {
                int giverIdx = (j - 1 + n) % n;
                Player target = game.getPlayers().get(j);
                target.setSecretWord(round.getGivenWords().get(giverIdx));
                target.setGiverName(game.getPlayers().get(giverIdx).getUsername());

                if (eventBroadcaster != null) {
                    Map<String, String> privateWordMap = new HashMap<>();
                    privateWordMap.put("secretWord", target.getSecretWord());
                    privateWordMap.put("giverName", target.getGiverName());
                    eventBroadcaster.sendToSession(target.getSessionId(), "privateSecretWord", privateWordMap);
                }
            }

            if (eventBroadcaster != null) {
                Map<String, String> notice = new HashMap<>();
                notice.put("message", "All words sealed! Ready your questions...");
                eventBroadcaster.broadcastToGame(game.getCode(), "allWordsSealed", notice);
            }

            scheduler.schedule(() -> {
                startQuestionsPhase(game);
            }, 2500, TimeUnit.MILLISECONDS);
        }
    }

    public synchronized void startQuestionsPhase(Game game) {
        game.setPhase(Phase.QUESTIONS);
        Round round = game.getRound();
        if (round != null) {
            round.setQuestionIndex(0);
            round.setCurrentQuestion(null);
            round.setCurrentTargetId(null);
            round.getVotes().clear();
        }

        if (eventBroadcaster != null) {
            eventBroadcaster.broadcastToGame(game.getCode(), "soundEffect", "gameStart");
        }
        broadcastState(game);
    }

    public synchronized void submitQuestion(String code, String playerId, String questionText) {
        Game game = getGame(code);
        if (game == null || game.getPhase() != Phase.QUESTIONS) return;

        Round round = game.getRound();
        if (round == null) return;

        List<QuestionPair> pairs = round.getQuestionPairs();
        if (round.getQuestionIndex() >= pairs.size()) return;

        QuestionPair pair = pairs.get(round.getQuestionIndex());
        Player asker = game.getPlayers().get(pair.getAskerIndex());
        Player target = game.getPlayers().get(pair.getTargetIndex());

        if (!asker.getId().equals(playerId)) {
            throw new IllegalStateException("Only the current asker can submit a question.");
        }

        String cleanQuestion = cleanText(questionText, 180);
        if (cleanQuestion.isEmpty()) {
            throw new IllegalArgumentException("Please type a question.");
        }

        round.setCurrentQuestion(cleanQuestion);
        round.setCurrentTargetId(target.getId());
        round.setRevealedWord(target.getSecretWord() != null ? target.getSecretWord() : "???");
        round.getVotes().clear();
        game.setPhase(Phase.VOTING);

        if (eventBroadcaster != null) {
            eventBroadcaster.broadcastToGame(game.getCode(), "soundEffect", "wordReveal");
            Map<String, Object> payload = new HashMap<>();
            payload.put("askerName", asker.getUsername());
            payload.put("askerAvatar", asker.getAvatar());
            payload.put("targetName", target.getUsername());
            payload.put("targetAvatar", target.getAvatar());
            payload.put("targetId", target.getId());
            payload.put("question", cleanQuestion);
            payload.put("revealedWord", round.getRevealedWord());
            eventBroadcaster.broadcastToGame(game.getCode(), "questionRevealed", payload);
        }

        broadcastState(game);
    }

    public synchronized void submitVote(String code, String voterPlayerId, String voteChoice) {
        Game game = getGame(code);
        if (game == null || game.getPhase() != Phase.VOTING) return;

        if (!"yes".equalsIgnoreCase(voteChoice) && !"no".equalsIgnoreCase(voteChoice)) {
            throw new IllegalArgumentException("Invalid vote option. Only 'yes' or 'no' accepted.");
        }

        Round round = game.getRound();
        if (round == null) return;

        QuestionPair pair = round.getQuestionPairs().get(round.getQuestionIndex());
        Player asker = game.getPlayers().get(pair.getAskerIndex());

        if (asker.getId().equals(voterPlayerId)) {
            throw new IllegalStateException("You cannot vote on your own question!");
        }

        if (round.getVotes().containsKey(voterPlayerId)) {
            throw new IllegalStateException("You have already voted.");
        }

        round.getVotes().put(voterPlayerId, voteChoice.toLowerCase());

        Player voter = game.getPlayer(voterPlayerId);
        if (voter != null && eventBroadcaster != null) {
            eventBroadcaster.sendToSession(voter.getSessionId(), "soundEffect", "votePop");
            Map<String, String> ack = new HashMap<>();
            ack.put("vote", voteChoice.toLowerCase());
            eventBroadcaster.sendToSession(voter.getSessionId(), "voteSubmitted", ack);
        }

        int totalVoters = Math.max(1, game.getPlayers().size() - 1);
        int votesReceived = round.getVotes().size();

        if (eventBroadcaster != null) {
            Map<String, Integer> progress = new HashMap<>();
            progress.put("votesReceived", votesReceived);
            progress.put("totalVoters", totalVoters);
            eventBroadcaster.broadcastToGame(game.getCode(), "voteProgress", progress);
        }

        broadcastState(game);

        if (votesReceived >= totalVoters) {
            finishVoting(game);
        }
    }

    public synchronized void finishVoting(Game game) {
        Round round = game.getRound();
        if (round == null) return;

        String targetId = round.getCurrentTargetId();
        Player target = game.getPlayer(targetId);
        int totalVoters = Math.max(1, game.getPlayers().size() - 1);

        int yes = 0;
        int no = 0;
        for (String vote : round.getVotes().values()) {
            if ("yes".equalsIgnoreCase(vote)) yes++;
            else if ("no".equalsIgnoreCase(vote)) no++;
        }

        boolean isMajority = yes > totalVoters / 2;
        boolean isUnanimous = yes == totalVoters && totalVoters > 1;

        int pointsEarned = yes;
        if (isMajority) pointsEarned += 2;
        if (isUnanimous) pointsEarned += 1;

        QuestionPair pair = round.getQuestionPairs().get(round.getQuestionIndex());
        Player asker = game.getPlayers().get(pair.getAskerIndex());

        // Points awarded to ASKER
        if (asker != null) {
            asker.addScore(pointsEarned);
            int current = round.getRoundScores().getOrDefault(asker.getId(), 0);
            round.getRoundScores().put(asker.getId(), current + pointsEarned);
        }

        Map<String, Integer> votesMap = new HashMap<>();
        votesMap.put("yes", yes);
        votesMap.put("no", no);

        QARecord record = new QARecord(
                asker != null ? asker.getUsername() : "",
                target != null ? target.getUsername() : "",
                round.getCurrentQuestion(),
                round.getRevealedWord(),
                votesMap,
                pointsEarned,
                isMajority
        );
        round.getQaHistory().add(record);

        int displayDurationSeconds = 30;

        AnswerResultDto resultDto = new AnswerResultDto();
        resultDto.setAskerId(asker != null ? asker.getId() : "");
        resultDto.setAskerName(asker != null ? asker.getUsername() : "");
        resultDto.setTargetId(targetId);
        resultDto.setTargetName(target != null ? target.getUsername() : "");
        resultDto.setRevealedWord(round.getRevealedWord());
        resultDto.setQuestion(round.getCurrentQuestion());
        resultDto.setYes(yes);
        resultDto.setNo(no);
        resultDto.setPointsEarned(pointsEarned);
        resultDto.setMajority(isMajority);
        resultDto.setUnanimous(isUnanimous);
        resultDto.setDisplayDuration(displayDurationSeconds);

        if (eventBroadcaster != null) {
            eventBroadcaster.broadcastToGame(game.getCode(), "answerResult", resultDto);
        }

        broadcastState(game);

        game.cancelResultTimer();

        // 30-second display delay with host skip capability
        ScheduledFuture<?> timer = scheduler.schedule(() -> {
            synchronized (GameService.this) {
                game.setResultTimer(null);
                moveToNextQuestionOrFinishRound(game);
            }
        }, displayDurationSeconds, TimeUnit.SECONDS);

        game.setResultTimer(timer);
    }

    public synchronized void skipResultDisplay(String code, String hostPlayerId) {
        Game game = getGame(code);
        if (game == null) return;

        if (!hostPlayerId.equals(game.getHostPlayerId())) return;

        if (game.getResultTimer() != null) {
            game.cancelResultTimer();
            moveToNextQuestionOrFinishRound(game);
        }
    }

    public synchronized void moveToNextQuestionOrFinishRound(Game game) {
        game.cancelResultTimer();
        Round round = game.getRound();
        if (round == null) return;

        round.incrementQuestionIndex();

        if (round.getQuestionIndex() < round.getQuestionPairs().size()) {
            game.setPhase(Phase.QUESTIONS);
            round.setCurrentQuestion(null);
            round.setCurrentTargetId(null);
            round.getVotes().clear();
            broadcastState(game);
            return;
        }

        finishRound(game);
    }

    public synchronized void finishRound(Game game) {
        game.setPhase(Phase.ROUND_RESULTS);
        Round round = game.getRound();

        int maxScore = 0;
        for (Player p : game.getPlayers()) {
            if (p.getScore() > maxScore) maxScore = p.getScore();
        }

        List<String> winnerIds = new ArrayList<>();
        List<Map<String, Object>> winnerDtos = new ArrayList<>();
        for (Player p : game.getPlayers()) {
            if (p.getScore() == maxScore) {
                winnerIds.add(p.getId());
                Map<String, Object> w = new HashMap<>();
                w.put("id", p.getId());
                w.put("username", p.getUsername());
                w.put("score", p.getScore());
                winnerDtos.add(w);
            }
        }
        if (round != null) {
            round.setWinnerIds(winnerIds);
        }

        if (eventBroadcaster != null) {
            Map<String, Object> roundFinishedPayload = new HashMap<>();
            roundFinishedPayload.put("round", game.getCurrentRound());
            roundFinishedPayload.put("winners", winnerDtos);
            eventBroadcaster.broadcastToGame(game.getCode(), "roundFinished", roundFinishedPayload);
        }

        broadcastState(game);
    }

    public synchronized void nextRound(String code, String hostPlayerId) {
        Game game = getGame(code);
        if (game == null || game.getPhase() != Phase.ROUND_RESULTS) return;

        if (!hostPlayerId.equals(game.getHostPlayerId())) {
            throw new IllegalStateException("Only the room host can start the next round.");
        }

        if (game.getCurrentRound() >= game.getRounds()) {
            finishGame(game);
            return;
        }

        game.setCurrentRound(game.getCurrentRound() + 1);
        game.setPhase(Phase.WORD_PASS);
        game.setRound(new Round(game.getPlayers().size()));

        if (eventBroadcaster != null) {
            eventBroadcaster.broadcastToGame(game.getCode(), "soundEffect", "gameStart");
        }
        broadcastState(game);
    }

    public synchronized void finishGame(Game game) {
        game.setPhase(Phase.FINAL_RESULTS);
        int maxScore = 0;
        for (Player p : game.getPlayers()) {
            if (p.getScore() > maxScore) maxScore = p.getScore();
        }

        List<String> winnerIds = new ArrayList<>();
        List<Map<String, Object>> winnerDtos = new ArrayList<>();
        for (Player p : game.getPlayers()) {
            if (p.getScore() == maxScore) {
                winnerIds.add(p.getId());
                Map<String, Object> w = new HashMap<>();
                w.put("id", p.getId());
                w.put("username", p.getUsername());
                w.put("score", p.getScore());
                winnerDtos.add(w);
            }
        }
        if (game.getRound() != null) {
            game.getRound().setWinnerIds(winnerIds);
        }

        if (eventBroadcaster != null) {
            eventBroadcaster.broadcastToGame(game.getCode(), "soundEffect", "celebrate");
            Map<String, Object> gameFinishedPayload = new HashMap<>();
            gameFinishedPayload.put("winners", winnerDtos);
            eventBroadcaster.broadcastToGame(game.getCode(), "gameFinished", gameFinishedPayload);
        }

        if (mongoHistoryService != null) {
            List<String> winnerNames = new ArrayList<>();
            for (Map<String, Object> w : winnerDtos) {
                winnerNames.add((String) w.get("username"));
            }
            mongoHistoryService.saveCompletedGame(game, winnerNames);
        }

        broadcastState(game);
    }

    public synchronized void restartGame(String code, String hostPlayerId) {
        Game game = getGame(code);
        if (game == null) return;

        if (!hostPlayerId.equals(game.getHostPlayerId())) {
            throw new IllegalStateException("Only the host can restart the game.");
        }

        game.cancelResultTimer();
        game.setPhase(Phase.LOBBY);
        game.setCurrentRound(0);
        game.setRound(null);
        game.getKickVotes().clear();
        for (Player p : game.getPlayers()) {
            p.setScore(0);
            p.setSecretWord("");
            p.setGiverName("");
        }

        broadcastState(game);
    }

    public synchronized void voteKickPlayer(String code, String voterPlayerId, String targetPlayerId) {
        Game game = getGame(code);
        if (game == null) return;

        Player voter = game.getPlayer(voterPlayerId);
        if (voter == null) return;

        if (voterPlayerId.equals(targetPlayerId)) {
            throw new IllegalArgumentException("You cannot vote to kick yourself.");
        }

        Player target = game.getPlayer(targetPlayerId);
        if (target == null) {
            throw new IllegalArgumentException("Player not found.");
        }

        List<String> voters = game.getKickVotes().computeIfAbsent(targetPlayerId, k -> new CopyOnWriteArrayList<>());
        if (voters.contains(voterPlayerId)) {
            voters.remove(voterPlayerId);
            if (eventBroadcaster != null) {
                eventBroadcaster.sendToSession(voter.getSessionId(), "soundEffect", "click");
            }
        } else {
            voters.add(voterPlayerId);
            if (eventBroadcaster != null) {
                eventBroadcaster.sendToSession(voter.getSessionId(), "soundEffect", "votePop");
            }
        }

        int eligibleVoters = Math.max(1, game.getPlayers().size() - 1);
        int requiredVotes = Math.max(1, (eligibleVoters / 2) + 1);
        int currentVotes = voters.size();

        if (eventBroadcaster != null) {
            Map<String, Object> progress = new HashMap<>();
            progress.put("targetPlayerId", targetPlayerId);
            progress.put("targetName", target.getUsername());
            progress.put("currentVotes", currentVotes);
            progress.put("requiredVotes", requiredVotes);
            eventBroadcaster.broadcastToGame(game.getCode(), "kickVoteProgress", progress);
        }

        if (currentVotes >= requiredVotes) {
            executeKick(game, targetPlayerId, "majority");
        } else {
            broadcastState(game);
        }
    }

    public synchronized void executeKick(Game game, String targetPlayerId, String reason) {
        int targetIndex = game.getPlayerIndex(targetPlayerId);
        if (targetIndex == -1) return;

        Player target = game.getPlayers().remove(targetIndex);
        game.getKickVotes().remove(targetPlayerId);
        for (List<String> voters : game.getKickVotes().values()) {
            voters.remove(targetPlayerId);
        }

        if (eventBroadcaster != null) {
            Map<String, String> kickedPayload = new HashMap<>();
            kickedPayload.put("message", "majority".equals(reason)
                    ? "You were kicked from the game by a majority vote of all players."
                    : "You were removed from the room.");
            eventBroadcaster.sendToSession(target.getSessionId(), "kickedFromGame", kickedPayload);

            Map<String, Object> roomNotification = new HashMap<>();
            roomNotification.put("playerId", targetPlayerId);
            roomNotification.put("username", target.getUsername());
            roomNotification.put("reason", reason);
            eventBroadcaster.broadcastToGame(game.getCode(), "playerKicked", roomNotification);
        }

        if (targetPlayerId.equals(game.getHostPlayerId()) && !game.getPlayers().isEmpty()) {
            game.setHostPlayerId(game.getPlayers().get(0).getId());
        }

        if (game.getPhase() == Phase.LOBBY) {
            if (game.getPlayers().isEmpty()) {
                games.remove(game.getCode());
                return;
            }
            broadcastState(game);
            return;
        }

        if (game.getPlayers().size() < 2) {
            game.cancelResultTimer();
            game.setPhase(Phase.LOBBY);
            game.setRound(null);
            game.setCurrentRound(0);
            if (eventBroadcaster != null) {
                eventBroadcaster.broadcastToGame(game.getCode(), "errorMessage", "Not enough players remaining. Returning to lobby.");
            }
            broadcastState(game);
            return;
        }

        if (game.getPhase() == Phase.WORD_PASS) {
            game.setRound(new Round(game.getPlayers().size()));
            if (eventBroadcaster != null) {
                eventBroadcaster.broadcastToGame(game.getCode(), "errorMessage", target.getUsername() + " was kicked. Circle reorganized!");
            }
            broadcastState(game);
            return;
        }

        if (game.getPhase() == Phase.QUESTIONS || game.getPhase() == Phase.VOTING) {
            game.cancelResultTimer();
            Round round = game.getRound();
            boolean isInvolved = false;
            if (round != null && round.getQuestionIndex() < round.getQuestionPairs().size()) {
                QuestionPair pair = round.getQuestionPairs().get(round.getQuestionIndex());
                isInvolved = targetPlayerId.equals(round.getCurrentTargetId()) ||
                        pair.getAskerIndex() == targetIndex || pair.getTargetIndex() == targetIndex;
            }

            if (round != null) {
                round.setQuestionPairs(Round.buildAnticlockwisePairs(game.getPlayers().size()));
                if (isInvolved || round.getQuestionIndex() >= round.getQuestionPairs().size()) {
                    moveToNextQuestionOrFinishRound(game);
                } else {
                    broadcastState(game);
                }
            }
            return;
        }

        broadcastState(game);
    }

    public synchronized void skipTurn(String code, String hostPlayerId) {
        Game game = getGame(code);
        if (game == null) return;

        if (!hostPlayerId.equals(game.getHostPlayerId())) return;

        if (game.getPhase() == Phase.QUESTIONS) {
            List<String> autoQuestions = List.of(
                    "What is the funniest thing you have ever seen?",
                    "What is your secret weapon?",
                    "What would you bring to an alien invasion?",
                    "What is hidden in your closet?"
            );
            String q = autoQuestions.get(random.nextInt(autoQuestions.size()));
            Round round = game.getRound();
            if (round != null && round.getQuestionIndex() < round.getQuestionPairs().size()) {
                QuestionPair pair = round.getQuestionPairs().get(round.getQuestionIndex());
                Player target = game.getPlayers().get(pair.getTargetIndex());
                round.setCurrentQuestion(q);
                round.setCurrentTargetId(target.getId());
                round.setRevealedWord(target.getSecretWord() != null ? target.getSecretWord() : "???");
                round.getVotes().clear();
                game.setPhase(Phase.VOTING);
                broadcastState(game);
            }
        } else if (game.getPhase() == Phase.VOTING) {
            finishVoting(game);
        }
    }

    public synchronized void handleDisconnect(String sessionId) {
        for (Game game : games.values()) {
            Player p = game.getPlayerBySession(sessionId);
            if (p != null) {
                p.setConnected(false);
                if (game.getPhase() == Phase.LOBBY) {
                    game.getPlayers().remove(p);
                    if (p.getId().equals(game.getHostPlayerId()) && !game.getPlayers().isEmpty()) {
                        game.setHostPlayerId(game.getPlayers().get(0).getId());
                    }
                    if (game.getPlayers().isEmpty()) {
                        games.remove(game.getCode());
                        return;
                    }
                } else {
                    if (p.getId().equals(game.getHostPlayerId())) {
                        for (Player other : game.getPlayers()) {
                            if (other.isConnected() && !other.getId().equals(p.getId())) {
                                game.setHostPlayerId(other.getId());
                                break;
                            }
                        }
                    }
                }
                broadcastState(game);
                break;
            }
        }
    }

    /* =========================================================
       PUBLIC STATE BUILDER
    ========================================================= */

    public PublicGameState buildPublicState(Game game, Player me) {
        PublicGameState state = new PublicGameState();
        state.setGameCode(game.getCode());
        state.setPhase(game.getPhase().getValue());
        state.setRounds(game.getRounds());
        state.setCurrentRound(game.getCurrentRound());

        int kickThreshold = Math.max(1, (game.getPlayers().size() - 1) / 2 + 1);
        state.setKickThreshold(kickThreshold);

        Map<String, PublicGameState.KickVoteSummary> kickVotesMap = new HashMap<>();
        List<PublicGameState.PlayerSummary> playerSummaries = new ArrayList<>();

        for (int i = 0; i < game.getPlayers().size(); i++) {
            Player p = game.getPlayers().get(i);
            boolean submitted = game.getRound() != null &&
                    game.getRound().getGivenWords() != null &&
                    i < game.getRound().getGivenWords().size() &&
                    game.getRound().getGivenWords().get(i) != null;

            playerSummaries.add(new PublicGameState.PlayerSummary(
                    p.getId(), p.getUsername(), p.getAvatar(), i + 1, p.getScore(),
                    p.getId().equals(game.getHostPlayerId()), p.isConnected(), submitted
            ));

            List<String> voters = game.getKickVotes().getOrDefault(p.getId(), Collections.emptyList());
            kickVotesMap.put(p.getId(), new PublicGameState.KickVoteSummary(
                    voters.size(), me != null && voters.contains(me.getId())
            ));
        }
        state.setPlayers(playerSummaries);
        state.setKickVotes(kickVotesMap);

        if (me != null) {
            int myIndex = game.getPlayerIndex(me.getId());
            state.setMe(new PublicGameState.MeSummary(
                    me.getId(), me.getUsername(), me.getAvatar(), myIndex + 1,
                    me.getSecretWord() != null ? me.getSecretWord() : "",
                    me.getGiverName() != null ? me.getGiverName() : ""
            ));
            state.setIsHost(me.getId().equals(game.getHostPlayerId()));
        } else {
            state.setIsHost(false);
        }

        state.setCanStart(game.getPhase() == Phase.LOBBY && game.getPlayers().size() >= 2);

        Round round = game.getRound();
        if (round == null) return state;

        // Word pass summary
        if (game.getPhase() == Phase.WORD_PASS) {
            int myIndex = me != null ? game.getPlayerIndex(me.getId()) : -1;
            int receiverIndex = myIndex >= 0 ? (myIndex + 1) % game.getPlayers().size() : -1;
            Player receiver = receiverIndex >= 0 ? game.getPlayers().get(receiverIndex) : null;
            boolean hasSubmitted = myIndex >= 0 &&
                    myIndex < round.getGivenWords().size() &&
                    round.getGivenWords().get(myIndex) != null;

            state.setWordPass(new PublicGameState.WordPassSummary(
                    round.getSubmittedCount(), game.getPlayers().size(),
                    receiver != null ? receiver.getUsername() : "",
                    receiverIndex >= 0 ? receiverIndex + 1 : null,
                    receiver != null ? receiver.getAvatar() : "👤",
                    hasSubmitted
            ));
        }

        // Question summary
        if ((game.getPhase() == Phase.QUESTIONS || game.getPhase() == Phase.VOTING) &&
                round.getQuestionIndex() < round.getQuestionPairs().size()) {
            QuestionPair pair = round.getQuestionPairs().get(round.getQuestionIndex());
            Player asker = game.getPlayers().get(pair.getAskerIndex());
            Player target = game.getPlayers().get(pair.getTargetIndex());

            PublicGameState.QuestionSummary qSummary = new PublicGameState.QuestionSummary();
            qSummary.setAskerId(asker.getId());
            qSummary.setAskerName(asker.getUsername());
            qSummary.setAskerAvatar(asker.getAvatar());
            qSummary.setAskerNumber(pair.getAskerIndex() + 1);
            qSummary.setTargetId(target.getId());
            qSummary.setTargetName(target.getUsername());
            qSummary.setTargetAvatar(target.getAvatar());
            qSummary.setTargetNumber(pair.getTargetIndex() + 1);
            qSummary.setQuestionNumber(round.getQuestionIndex() + 1);
            qSummary.setTotalQuestions(round.getQuestionPairs().size());
            qSummary.setQuestionText(round.getCurrentQuestion());
            qSummary.setRevealedWord(game.getPhase() == Phase.VOTING ? round.getRevealedWord() : null);
            state.setQuestion(qSummary);
        }

        // Voting summary
        if (game.getPhase() == Phase.VOTING) {
            QuestionPair pair = round.getQuestionPairs().get(round.getQuestionIndex());
            Player asker = game.getPlayers().get(pair.getAskerIndex());
            int totalVoters = Math.max(0, game.getPlayers().size() - 1);

            PublicGameState.VotingSummary vSummary = new PublicGameState.VotingSummary();
            vSummary.setAskerId(asker != null ? asker.getId() : null);
            vSummary.setTargetId(round.getCurrentTargetId());
            vSummary.setVotesReceived(round.getVotes().size());
            vSummary.setTotalVoters(totalVoters);
            vSummary.setHasVoted(me != null && round.getVotes().containsKey(me.getId()));
            state.setVoting(vSummary);
        }

        // Round results summary
        if (game.getPhase() == Phase.ROUND_RESULTS) {
            PublicGameState.RoundResultsSummary rrSummary = new PublicGameState.RoundResultsSummary();
            rrSummary.setWinnerIds(round.getWinnerIds());
            List<PublicGameState.ScoreEntry> scores = new ArrayList<>();
            for (Player p : game.getPlayers()) {
                scores.add(new PublicGameState.ScoreEntry(
                        p.getId(), p.getUsername(), p.getAvatar(), p.getScore(),
                        round.getRoundScores().getOrDefault(p.getId(), 0)
                ));
            }
            rrSummary.setScores(scores);
            rrSummary.setQaHistory(new ArrayList<>(round.getQaHistory()));
            state.setRoundResults(rrSummary);
        }

        // Final results summary
        if (game.getPhase() == Phase.FINAL_RESULTS) {
            PublicGameState.FinalResultsSummary frSummary = new PublicGameState.FinalResultsSummary();
            frSummary.setWinnerIds(round.getWinnerIds());
            List<PublicGameState.ScoreEntry> scores = new ArrayList<>();
            for (Player p : game.getPlayers()) {
                scores.add(new PublicGameState.ScoreEntry(
                        p.getId(), p.getUsername(), p.getAvatar(), p.getScore(), 0
                ));
            }
            scores.sort((a, b) -> Integer.compare(b.getScore(), a.getScore()));
            frSummary.setScores(scores);
            state.setFinalResults(frSummary);
        }

        return state;
    }

    private void broadcastState(Game game) {
        if (stateBroadcaster != null) {
            stateBroadcaster.accept(game.getCode(), null);
        }
    }

    private String cleanText(String value, int maxLength) {
        if (value == null) return "";
        String trimmed = value.trim().replaceAll("\\s+", " ");
        if (trimmed.length() > maxLength) {
            return trimmed.substring(0, maxLength);
        }
        return trimmed;
    }

    private String generateGameCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        String code;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            code = sb.toString();
        } while (games.containsKey(code));
        return code;
    }

    private String generatePlayerId() {
        return "p_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
