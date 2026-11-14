package com.planningpoker.estimation.application.view;

/** {@code card} is {@code null} while the card is still face down. */
public record VoteView(String participantId, String card, long castAt) {
}
