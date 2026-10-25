package com.whispergame.controller;

import com.whispergame.model.Game;
import com.whispergame.service.GameService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class GameController {

    private final GameService gameService;
    private final com.whispergame.service.MongoHistoryService mongoHistoryService;

    public GameController(GameService gameService, com.whispergame.service.MongoHistoryService mongoHistoryService) {
        this.gameService = gameService;
        this.mongoHistoryService = mongoHistoryService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> res = new HashMap<>();
        res.put("status", "ok");
        res.put("activeGames", gameService.getActiveGamesCount());
        res.put("mongoConnected", mongoHistoryService.isConnected());
        res.put("platform", "Spring Boot (Java 21)");
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/game/{code}")
    public ResponseEntity<?> getGame(@PathVariable String code) {
        Game game = gameService.getGame(code);
        if (game == null) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Game not found");
            return ResponseEntity.status(404).body(err);
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("code", game.getCode());
        summary.put("phase", game.getPhase().getValue());
        summary.put("playerCount", game.getPlayers().size());
        summary.put("rounds", game.getRounds());
        summary.put("currentRound", game.getCurrentRound());
        return ResponseEntity.ok(summary);
    }
}
