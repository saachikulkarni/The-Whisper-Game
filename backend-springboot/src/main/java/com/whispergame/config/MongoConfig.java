package com.whispergame.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
public class MongoConfig {

    private static final Logger log = LoggerFactory.getLogger(MongoConfig.class);

    @Value("${spring.data.mongodb.uri:}")
    private String mongoUri;

    @Bean
    public MongoTemplate mongoTemplate() {
        if (mongoUri == null || mongoUri.trim().isEmpty()) {
            log.info("🍃 No MONGODB_URI provided. Running in fast in-memory mode.");
            return null;
        }

        try {
            log.info("🍃 Connecting to MongoDB Atlas / Render: {}", mongoUri.replaceAll("://.*@", "://***@"));
            MongoClient client = MongoClients.create(mongoUri);
            return new MongoTemplate(client, "whisper_game");
        } catch (Exception e) {
            log.warn("⚠️ Could not initialize MongoDB connection: {}. Falling back to in-memory mode.", e.getMessage());
            return null;
        }
    }
}
