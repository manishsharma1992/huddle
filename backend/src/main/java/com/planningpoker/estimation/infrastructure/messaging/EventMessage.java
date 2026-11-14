package com.planningpoker.estimation.infrastructure.messaging;

import com.planningpoker.estimation.domain.event.*;
import com.planningpoker.estimation.domain.model.ParticipantId;
import com.planningpoker.estimation.domain.model.StoryId;

import java.util.LinkedHashMap;
import java.util.Map;

/** Published language: flattens domain events into small JSON-friendly maps the browser animates from. */
final class EventMessage {

    private EventMessage() {
    }

    static Map<String, Object> of(PokerSessionEvent event) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", event.getClass().getSimpleName());
        m.put("at", event.occurredAt().toEpochMilli());
        switch (event) {
            case SessionStarted e -> m.put("participantId", id(e.facilitator()));
            case ParticipantJoined e -> {
                m.put("participantId", id(e.participant()));
                m.put("name", e.name().value());
                m.put("avatar", e.avatar().value());
                m.put("returning", e.returning());
            }
            case ParticipantUpdated e -> m.put("participantId", id(e.participant()));
            case ParticipantLeft e -> {
                m.put("participantId", id(e.participant()));
                m.put("name", e.name().value());
            }
            case FacilitatorChanged e -> m.put("participantId", id(e.facilitator()));
            case StoriesAdded e -> m.put("count", e.stories().size());
            case StoryRemoved e -> m.put("storyId", id(e.story()));
            case VotingStarted e -> {
                m.put("storyId", id(e.story()));
                m.put("round", e.round());
            }
            case VoteCast e -> {
                m.put("storyId", id(e.story()));
                m.put("participantId", id(e.voter()));
                m.put("firstOfRound", e.firstOfRound());
                m.put("everyoneVoted", e.everyoneVoted());
            }
            case VoteRetracted e -> {
                m.put("storyId", id(e.story()));
                m.put("participantId", id(e.voter()));
            }
            case CardsRevealed e -> {
                m.put("storyId", id(e.story()));
                m.put("round", e.round());
                m.put("consensus", e.consensus());
            }
            case StoryEstimated e -> {
                m.put("storyId", id(e.story()));
                m.put("estimate", e.estimate());
                m.put("unanimous", e.unanimous());
            }
            case VotingCancelled e -> m.put("storyId", id(e.story()));
            case TimerStarted e -> m.put("endsAt", e.endsAt().toEpochMilli());
        }
        return m;
    }

    private static String id(ParticipantId id) {
        return id.value().toString();
    }

    private static String id(StoryId id) {
        return id.value().toString();
    }
}
