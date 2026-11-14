package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** Someone sat down at the table (or came back to their seat). */
public record ParticipantJoined(SessionId sessionId, ParticipantId participant, DisplayName name, Avatar avatar, boolean returning, Instant occurredAt) implements PokerSessionEvent {
}
