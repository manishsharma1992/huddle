package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** Backlog items were put on the table. */
public record StoriesAdded(SessionId sessionId, List<StoryId> stories, Instant occurredAt) implements PokerSessionEvent {
}
