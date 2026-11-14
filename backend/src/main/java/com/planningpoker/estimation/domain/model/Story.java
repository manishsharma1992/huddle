package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/** A backlog item the team estimates. An entity inside the {@link PokerSession} aggregate. */
public class Story {

    private final StoryId id;
    private final StoryTitle title;
    private StoryStatus status;
    private int round;
    private Instant roundStartedAt;
    private final Map<ParticipantId, Vote> votes = new LinkedHashMap<>();
    private Card finalEstimate;
    private boolean agreedUnanimously;

    Story(StoryId id, StoryTitle title) {
        this.id = Guard.notNull(id, "Story id");
        this.title = Guard.notNull(title, "Story title");
        this.status = StoryStatus.PENDING;
    }

    /** Reconstitutes a story from storage. */
    public static Story restore(StoryId id, StoryTitle title, StoryStatus status, int round, Instant roundStartedAt,
                                Collection<Vote> votes, Card finalEstimate, boolean agreedUnanimously) {
        Story story = new Story(id, title);
        story.status = Guard.notNull(status, "Story status");
        story.round = round;
        story.roundStartedAt = roundStartedAt;
        votes.forEach(vote -> story.votes.put(vote.voter(), vote));
        story.finalEstimate = finalEstimate;
        story.agreedUnanimously = agreedUnanimously;
        return story;
    }

    void startRound(Instant now) {
        votes.clear();
        round++;
        roundStartedAt = now;
        status = StoryStatus.VOTING;
        finalEstimate = null;
        agreedUnanimously = false;
    }

    void record(Vote vote) {
        Guard.that(status == StoryStatus.VOTING, "Cards can only be played while voting is open");
        votes.put(vote.voter(), vote);
    }

    boolean retract(ParticipantId voter) {
        Guard.that(status == StoryStatus.VOTING, "Votes can only be taken back while voting is open");
        return votes.remove(voter) != null;
    }

    void forget(ParticipantId voter) {
        if (status == StoryStatus.VOTING) {
            votes.remove(voter);
        }
    }

    void reveal() {
        Guard.that(status == StoryStatus.VOTING, "There is no open round to reveal");
        Guard.that(!votes.isEmpty(), "Nobody has played a card yet");
        status = StoryStatus.REVEALED;
    }

    void settle(Card estimate, boolean unanimous) {
        Guard.that(status == StoryStatus.REVEALED, "Reveal the cards before settling on an estimate");
        Guard.that(estimate.isEstimate(), "'" + estimate.label() + "' is not an estimate");
        finalEstimate = estimate;
        agreedUnanimously = unanimous;
        status = StoryStatus.ESTIMATED;
    }

    void returnToBacklog() {
        votes.clear();
        status = StoryStatus.PENDING;
        roundStartedAt = null;
    }

    boolean hasVoteFrom(ParticipantId voter) {
        return votes.containsKey(voter);
    }

    public StoryId id() {
        return id;
    }

    public StoryTitle title() {
        return title;
    }

    public StoryStatus status() {
        return status;
    }

    public int round() {
        return round;
    }

    public Optional<Instant> roundStartedAt() {
        return Optional.ofNullable(roundStartedAt);
    }

    public Collection<Vote> votes() {
        return Collections.unmodifiableCollection(votes.values());
    }

    public Optional<Card> finalEstimate() {
        return Optional.ofNullable(finalEstimate);
    }

    public boolean agreedUnanimously() {
        return agreedUnanimously;
    }
}
