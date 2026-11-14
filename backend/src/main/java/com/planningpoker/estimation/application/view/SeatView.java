package com.planningpoker.estimation.application.view;

/** What a participant gets back when they sit down: proof the seat is theirs. Keep the key secret. */
public record SeatView(String code, String participantId, String accessKey) {
}
