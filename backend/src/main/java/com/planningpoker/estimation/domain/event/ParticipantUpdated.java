package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** Someone changed their name, avatar or role. */
public record ParticipantUpdated(SessionId sessionId, ParticipantId participant, Instant occurredAt) implements PokerSessionEvent {
}
