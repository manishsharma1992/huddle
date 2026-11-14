package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** The story went back to the backlog without an estimate. */
public record VotingCancelled(SessionId sessionId, StoryId story, Instant occurredAt) implements PokerSessionEvent {
}
