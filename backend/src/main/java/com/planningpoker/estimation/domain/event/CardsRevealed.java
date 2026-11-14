package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** All cards were turned face up. */
public record CardsRevealed(SessionId sessionId, StoryId story, int round, boolean consensus, Instant occurredAt) implements PokerSessionEvent {
}
