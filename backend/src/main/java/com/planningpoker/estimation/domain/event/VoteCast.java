package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.*;

import java.time.Instant;
import java.util.List;

/** A card was played face down. */
public record VoteCast(SessionId sessionId, StoryId story, ParticipantId voter, boolean firstOfRound, boolean everyoneVoted, Instant occurredAt) implements PokerSessionEvent {
}
