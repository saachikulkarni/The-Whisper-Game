package com.whispergame;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;

@SpringBootApplication(exclude = {
        MongoAutoConfiguration.class,
        MongoDataAutoConfiguration.class
})
public class TheWhisperGameApplication {

    public static void main(String[] args) {
        SpringApplication.run(TheWhisperGameApplication.class, args);
        System.out.println("\n========================================");
        System.out.println("  🎪 The Whisper Game (Spring Boot)");
        System.out.println("  🌐 Running at http://localhost:8080");
        System.out.println("  ⚡ WebSocket Endpoint: ws://localhost:8080/ws");
        System.out.println("========================================\n");
    }
}
