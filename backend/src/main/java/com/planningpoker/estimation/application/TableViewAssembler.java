package com.planningpoker.estimation.application;

import com.planningpoker.estimation.application.view.*;
import com.planningpoker.estimation.domain.model.*;

import java.time.Clock;
import java.util.List;
import java.util.Set;

/** Translates the aggregate into the read model, hiding card faces that must stay secret. */
final class TableViewAssembler {

    private final Clock clock;

    TableViewAssembler(Clock clock) {
        this.clock = clock;
    }

    TableView assemble(PokerSession session, Set<ParticipantId> online) {
        String facilitator = session.facilitatorId().map(id -> id.value().toString()).orElse(null);
        List<ParticipantView> participants = session.participants().stream()
                .map(participant -> new ParticipantView(
                        participant.id().value().toString(),
                        participant.name().value(),
                        participant.avatar().value(),
                        participant.role().name(),
                        session.isFacilitator(participant.id()),
                        online.contains(participant.id()),
                        participant.joinedAt().toEpochMilli()))
                .toList();

        List<StoryView> stories = session.stories().stream().map(story -> storyView(session, story)).toList();

        int estimated = 0;
        int unanimous = 0;
        double points = 0;
        for (Story story : session.stories()) {
            if (story.status() == StoryStatus.ESTIMATED) {
                estimated++;
                if (story.agreedUnanimously()) {
                    unanimous++;
                }
                points += story.finalEstimate().flatMap(Card::value).orElse(0.0);
            }
        }

        return new TableView(
                session.id().value().toString(),
                session.code().value(),
                session.name().value(),
                session.deckType().name(),
                session.deckType().displayName(),
                cards(session.deckType()),
                session.createdAt().toEpochMilli(),
                facilitator,
                session.timerEndsAt().map(java.time.Instant::toEpochMilli).orElse(null),
                session.activeStory().map(story -> story.id().value().toString()).orElse(null),
                participants,
                stories,
                new TeamStatsView(session.stories().size(), estimated, points, unanimous),
                clock.millis());
    }

    static List<CardView> cards(DeckType type) {
        return type.deck().cards().stream().map(card -> new CardView(card.label(), card.numericValue())).toList();
    }

    private StoryView storyView(PokerSession session, Story story) {
        boolean faceUp = story.status() == StoryStatus.REVEALED || story.status() == StoryStatus.ESTIMATED;
        List<VoteView> votes = story.votes().stream()
                .map(vote -> new VoteView(vote.voter().value().toString(),
                        faceUp ? vote.card().label() : null,
                        vote.castAt().toEpochMilli()))
                .toList();
        ResultView result = null;
        if (faceUp && !story.votes().isEmpty()) {
            RoundResult r = session.resultOf(story);
            result = new ResultView(r.voteCount(), r.distribution(), r.average(), r.median(), r.consensus(),
                    r.agreementPercent(),
                    r.suggestedEstimate() == null ? null : r.suggestedEstimate().label(),
                    r.outliers().stream().map(id -> id.value().toString()).toList(),
                    r.fastestVoter() == null ? null : r.fastestVoter().value().toString(),
                    r.fastestVoteAfter() == null ? null : r.fastestVoteAfter().toMillis());
        }
        return new StoryView(story.id().value().toString(), story.title().value(), story.status().name(),
                story.round(), story.roundStartedAt().map(java.time.Instant::toEpochMilli).orElse(null),
                votes, story.finalEstimate().map(Card::label).orElse(null), story.agreedUnanimously(), result);
    }
}
