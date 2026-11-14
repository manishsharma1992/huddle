package com.planningpoker.estimation.application.view;

/** The caller's private view of their own seat, including the card they hold face down. */
public record MySeatView(String participantId, String myVote, boolean facilitator) {
}
