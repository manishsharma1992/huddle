package com.planningpoker.estimation.domain.event;

import com.planningpoker.estimation.domain.model.SessionId;
import com.planningpoker.sharedkernel.domain.DomainEvent;

/** Everything that can happen at a planning poker table. */
public sealed interface PokerSessionEvent extends DomainEvent permits
        SessionStarted, ParticipantJoined, ParticipantUpdated, ParticipantLeft, FacilitatorChanged,
        StoriesAdded, StoryRemoved, VotingStarted, VoteCast, VoteRetracted, CardsRevealed,
        StoryEstimated, VotingCancelled, TimerStarted {

    SessionId sessionId();
}
