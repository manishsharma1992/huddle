package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** A round of voting opened on a story. */
public record VotingStarted(SessionId sessionId, StoryId story, int round, Instant occurredAt) implements PokerSessionEvent {
}
