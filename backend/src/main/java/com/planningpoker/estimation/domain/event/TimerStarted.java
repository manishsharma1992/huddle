package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** A countdown to wrap up the discussion was started. */
public record TimerStarted(SessionId sessionId, Instant endsAt, Instant occurredAt) implements PokerSessionEvent {
}
