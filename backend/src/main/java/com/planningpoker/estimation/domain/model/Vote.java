package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

import java.time.Instant;

/** A card played face down by a participant during a round. */
public record Vote(ParticipantId voter, Card card, Instant castAt) {
    public Vote {
        Guard.notNull(voter, "Voter");
        Guard.notNull(card, "Card");
        Guard.notNull(castAt, "Vote time");
    }
}
