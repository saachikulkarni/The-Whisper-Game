package com.whispergame.model;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Phase {
    LOBBY("lobby"),
    WORD_PASS("wordPass"),
    QUESTIONS("questions"),
    VOTING("voting"),
    ROUND_RESULTS("roundResults"),
    FINAL_RESULTS("finalResults");

    private final String value;

    Phase(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static Phase fromValue(String value) {
        for (Phase p : values()) {
            if (p.value.equalsIgnoreCase(value)) {
                return p;
            }
        }
        return LOBBY;
    }
}
