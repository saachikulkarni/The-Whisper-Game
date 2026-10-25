package com.whispergame.service;

import com.whispergame.model.Game;
import com.whispergame.model.Player;
import com.whispergame.model.entity.GameHistoryDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MongoHistoryService {

    private static final Logger log = LoggerFactory.getLogger(MongoHistoryService.class);

    private final MongoTemplate mongoTemplate;

    public MongoHistoryService(@Autowired(required = false) MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
        if (this.mongoTemplate != null) {
            log.info("🍃 MongoDB persistence initialized successfully.");
        } else {
            log.info("🍃 MongoDB not configured. Operating in high-performance in-memory mode.");
        }
    }

    public boolean isConnected() {
        return mongoTemplate != null;
    }

    public void saveCompletedGame(Game game, List<String> winners) {
        if (mongoTemplate == null) return;

        try {
            Player host = game.getPlayer(game.getHostPlayerId());
            String hostName = host != null ? host.getUsername() : "Host";

            List<Map<String, Object>> playersList = new ArrayList<>();
            for (Player p : game.getPlayers()) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", p.getId());
                map.put("username", p.getUsername());
                map.put("avatar", p.getAvatar());
                map.put("score", p.getScore());
                playersList.add(map);
            }

            GameHistoryDocument doc = new GameHistoryDocument(
                    game.getCode(),
                    hostName,
                    game.getRounds(),
                    game.getCurrentRound(),
                    playersList,
                    winners
            );

            mongoTemplate.save(doc);
            log.info("🍃 Saved completed game {} to MongoDB", game.getCode());
        } catch (Exception e) {
            log.warn("Could not save game to MongoDB (running in fallback mode): {}", e.getMessage());
        }
    }
}
