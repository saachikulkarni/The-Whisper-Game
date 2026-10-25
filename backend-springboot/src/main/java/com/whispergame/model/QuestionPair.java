package com.whispergame.model;

public class QuestionPair {
    private int askerIndex;
    private int targetIndex;

    public QuestionPair() {
    }

    public QuestionPair(int askerIndex, int targetIndex) {
        this.askerIndex = askerIndex;
        this.targetIndex = targetIndex;
    }

    public int getAskerIndex() {
        return askerIndex;
    }

    public void setAskerIndex(int askerIndex) {
        this.askerIndex = askerIndex;
    }

    public int getTargetIndex() {
        return targetIndex;
    }

    public void setTargetIndex(int targetIndex) {
        this.targetIndex = targetIndex;
    }
}
