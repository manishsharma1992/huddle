package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** Facilitation was handed to someone else. */
public record FacilitatorChanged(SessionId sessionId, ParticipantId facilitator, Instant occurredAt) implements PokerSessionEvent {
}
