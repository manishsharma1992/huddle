package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** A card was taken back. */
public record VoteRetracted(SessionId sessionId, StoryId story, ParticipantId voter, Instant occurredAt) implements PokerSessionEvent {
}
