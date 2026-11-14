package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** Someone left the table. */
public record ParticipantLeft(SessionId sessionId, ParticipantId participant, DisplayName name, Instant occurredAt) implements PokerSessionEvent {
}
