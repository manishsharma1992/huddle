package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** A new table was opened. */
public record SessionStarted(SessionId sessionId, SessionCode code, ParticipantId facilitator, Instant occurredAt) implements PokerSessionEvent {
}
