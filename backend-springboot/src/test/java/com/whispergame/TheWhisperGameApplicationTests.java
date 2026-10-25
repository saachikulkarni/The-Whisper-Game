package com.whispergame;

import com.whispergame.dto.PublicGameState;
import com.whispergame.model.Game;
import com.whispergame.model.Phase;
import com.whispergame.model.Player;
import com.whispergame.service.GameService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class TheWhisperGameApplicationTests {

    @Autowired
    private GameService gameService;

    @Test
    void contextLoads() {
        assertNotNull(gameService);
    }

    @Test
    void testGameLifecycleAndMajorityKick() {
        // 1. Create Game
        Game game = gameService.createGame("Alice", "🦊", 1, "sess-1");
        assertNotNull(game);
        assertEquals(1, game.getPlayers().size());
        assertEquals(Phase.LOBBY, game.getPhase());
        String code = game.getCode();

        // 2. Join 3 Players (Bob, Charlie, Diana)
        Player p2 = gameService.joinGame(code, "Bob", "🐼", "sess-2");
        Player p3 = gameService.joinGame(code, "Charlie", "🦁", "sess-3");
        Player p4 = gameService.joinGame(code, "Diana", "🦄", "sess-4");

        assertEquals(4, game.getPlayers().size());
        Player p1 = game.getPlayers().get(0);

        // 3. Start Game
        gameService.startGame(code, p1.getId());
        assertEquals(Phase.WORD_PASS, game.getPhase());
        assertEquals(1, game.getCurrentRound());

        // 4. Pass Words Clockwise
        gameService.submitWord(code, p1.getId(), "Elephant");
        gameService.submitWord(code, p2.getId(), "Pizza");
        gameService.submitWord(code, p3.getId(), "Spaceship");
        gameService.submitWord(code, p4.getId(), "Laptop");

        assertEquals(4, game.getRound().getSubmittedCount());

        // 5. Test Democratic Majority Vote Kick
        // In 4-player game, other players = 3. Majority = floor(3/2) + 1 = 2 votes.
        gameService.voteKickPlayer(code, p1.getId(), p4.getId()); // 1 vote
        assertEquals(4, game.getPlayers().size()); // Not kicked yet (1/2)

        gameService.voteKickPlayer(code, p2.getId(), p4.getId()); // 2 votes -> Majority reached!
        assertEquals(3, game.getPlayers().size()); // Diana kicked!
        assertNull(game.getPlayer(p4.getId()));

        // 6. Test Public Game State DTO
        PublicGameState state = gameService.buildPublicState(game, p1);
        assertNotNull(state);
        assertEquals(code, state.getGameCode());
        assertEquals(3, state.getPlayers().size());
        assertTrue(state.isIsHost());
    }
}
