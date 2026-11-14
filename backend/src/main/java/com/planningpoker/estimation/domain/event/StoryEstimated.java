package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** The team settled on an estimate. */
public record StoryEstimated(SessionId sessionId, StoryId story, String estimate, boolean unanimous, Instant occurredAt) implements PokerSessionEvent {
}
