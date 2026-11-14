package com.planningpoker.estimation.application.view;

import java.util.List;

/** Everything a browser needs to draw the table. Card faces stay hidden until the reveal. */
public record TableView(
        String id,
        String code,
        String name,
        String deckType,
        String deckName,
        List<CardView> deck,
        long createdAt,
        String facilitatorId,
        Long timerEndsAt,
        String activeStoryId,
        List<ParticipantView> participants,
        List<StoryView> stories,
        TeamStatsView stats,
        long serverTime) {
}
