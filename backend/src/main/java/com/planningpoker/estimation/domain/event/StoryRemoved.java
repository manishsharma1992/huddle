package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** A backlog item was removed. */
public record StoryRemoved(SessionId sessionId, StoryId story, Instant occurredAt) implements PokerSessionEvent {
}
