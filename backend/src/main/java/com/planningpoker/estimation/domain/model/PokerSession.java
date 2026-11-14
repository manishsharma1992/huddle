package com.planningpoker.estimation.domain.model;

import com.planningpoker.estimation.domain.event.*;
import com.planningpoker.sharedkernel.domain.AggregateRoot;
import com.planningpoker.sharedkernel.domain.DomainRuleViolation;
import com.planningpoker.sharedkernel.domain.Guard;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * A planning poker table: the aggregate root of the Estimation bounded context.
 *
 * <p>Invariants protected here:
 * <ul>
 *     <li>A table always has exactly one facilitator while anyone is seated.</li>
 *     <li>At most one story is "in play" (voting or revealed) at any time.</li>
 *     <li>Only voters play cards, only while voting is open, and only cards from the table's deck.</li>
 *     <li>Only the facilitator steers the flow (open a round, reveal, settle, hand over).</li>
 * </ul>
 */
public class PokerSession extends AggregateRoot<SessionId, PokerSessionEvent> {

    public static final int MAX_PARTICIPANTS = 60;
    public static final int MAX_STORIES = 300;
    private static final Duration MIN_TIMER = Duration.ofSeconds(10);
    private static final Duration MAX_TIMER = Duration.ofMinutes(15);

    private final SessionId id;
    private final SessionCode code;
    private final SessionName name;
    private final TeamName team;
    private final DeckType deckType;
    private final Instant createdAt;
    private final Map<ParticipantId, Participant> participants = new LinkedHashMap<>();
    private final List<Story> stories = new ArrayList<>();
    private ParticipantId facilitatorId;
    private Instant timerEndsAt;
    private final long version;

    private PokerSession(SessionId id, SessionCode code, SessionName name, TeamName team, DeckType deckType,
                         Instant createdAt, long version) {
        this.id = Guard.notNull(id, "Session id");
        this.code = Guard.notNull(code, "Session code");
        this.name = Guard.notNull(name, "Session name");
        this.team = team;
        this.deckType = Guard.notNull(deckType, "Deck");
        this.createdAt = Guard.notNull(createdAt, "Creation time");
        this.version = version;
    }

    // ------------------------------------------------------------------ factories

    /** Opens a new table; the person opening it becomes its facilitator. The team is optional. */
    public static PokerSession open(SessionId id, SessionCode code, SessionName name, TeamName team, DeckType deckType,
                                    ParticipantId facilitatorId, AccessKey facilitatorKey,
                                    DisplayName facilitatorName, Avatar facilitatorAvatar, Instant now) {
        PokerSession session = new PokerSession(id, code, name, team, deckType, now, 0);
        Participant facilitator = new Participant(facilitatorId, facilitatorKey, facilitatorName, facilitatorAvatar,
                ParticipantRole.VOTER, now);
        session.participants.put(facilitatorId, facilitator);
        session.facilitatorId = facilitatorId;
        session.raise(new SessionStarted(id, code, facilitatorId, now));
        return session;
    }

    /** Reconstitutes a table from storage. No events are raised. */
    public static PokerSession restore(SessionId id, SessionCode code, SessionName name, TeamName team,
                                       DeckType deckType, Instant createdAt, ParticipantId facilitatorId,
                                       Instant timerEndsAt, Collection<Participant> participants, List<Story> stories,
                                       long version) {
        PokerSession session = new PokerSession(id, code, name, team, deckType, createdAt, version);
        participants.forEach(participant -> session.participants.put(participant.id(), participant));
        session.stories.addAll(stories);
        session.facilitatorId = facilitatorId;
        session.timerEndsAt = timerEndsAt;
        return session;
    }

    // ------------------------------------------------------------------ seating

    /** Makes sure the caller really owns the seat they claim. */
    public Participant authenticate(ParticipantId participantId, String accessKey) {
        Participant participant = participants.get(participantId);
        if (participant == null || !participant.holds(accessKey)) {
            throw new NotPermitted("You are not seated at this table");
        }
        return participant;
    }

    public void seat(ParticipantId participantId, AccessKey key, DisplayName displayName, Avatar avatar,
                     ParticipantRole role, Instant now) {
        Guard.that(!participants.containsKey(participantId), "That seat is already taken");
        Guard.that(participants.size() < MAX_PARTICIPANTS, "This table is full (" + MAX_PARTICIPANTS + " people)");
        participants.put(participantId, new Participant(participantId, key, displayName, avatar, role, now));
        if (facilitatorId == null || !participants.containsKey(facilitatorId)) {
            facilitatorId = participantId;
            raise(new FacilitatorChanged(id, participantId, now));
        }
        raise(new ParticipantJoined(id, participantId, displayName, avatar, false, now));
    }

    /** A participant reconnects to their seat (e.g. after a page reload). */
    public void welcomeBack(ParticipantId participantId, Instant now) {
        Participant participant = participant(participantId);
        raise(new ParticipantJoined(id, participantId, participant.name(), participant.avatar(), true, now));
    }

    public void updateProfile(ParticipantId participantId, DisplayName displayName, Avatar avatar,
                              ParticipantRole role, Instant now) {
        Participant participant = participant(participantId);
        participant.changeProfile(displayName, avatar, role);
        if (!participant.canVote()) {
            activeStory().ifPresent(story -> story.forget(participantId));
        }
        raise(new ParticipantUpdated(id, participantId, now));
    }

    public void leave(ParticipantId participantId, Instant now) {
        unseat(participantId, now);
    }

    /** The facilitator clears a seat, e.g. someone who closed their laptop and went home. */
    public void dismiss(ParticipantId actor, ParticipantId participantId, Instant now) {
        requireFacilitator(actor);
        Guard.that(!actor.equals(participantId), "Use 'leave' to leave the table yourself");
        unseat(participantId, now);
    }

    private void unseat(ParticipantId participantId, Instant now) {
        Participant leaving = participant(participantId);
        participants.remove(participantId);
        activeStory().ifPresent(story -> story.forget(participantId));
        raise(new ParticipantLeft(id, participantId, leaving.name(), now));
        if (participantId.equals(facilitatorId)) {
            facilitatorId = participants.values().stream()
                    .filter(Participant::canVote)
                    .findFirst()
                    .or(() -> participants.values().stream().findFirst())
                    .map(Participant::id)
                    .orElse(null);
            if (facilitatorId != null) {
                raise(new FacilitatorChanged(id, facilitatorId, now));
            }
        }
    }

    public void handOverFacilitation(ParticipantId actor, ParticipantId newFacilitator, Instant now) {
        requireFacilitator(actor);
        participant(newFacilitator);
        facilitatorId = newFacilitator;
        raise(new FacilitatorChanged(id, newFacilitator, now));
    }

    /** If nobody is facilitating (e.g. the facilitator's seat was emptied), anyone may step up. */
    public void stepUpAsFacilitator(ParticipantId actor, Instant now) {
        participant(actor);
        Guard.that(facilitatorId == null || !participants.containsKey(facilitatorId), "This table already has a facilitator");
        facilitatorId = actor;
        raise(new FacilitatorChanged(id, actor, now));
    }

    // ------------------------------------------------------------------ backlog

    public List<StoryId> addStories(ParticipantId actor, List<StoryTitle> titles, Instant now) {
        requireFacilitator(actor);
        Guard.that(!titles.isEmpty(), "Add at least one story");
        Guard.that(stories.size() + titles.size() <= MAX_STORIES, "A table can hold at most " + MAX_STORIES + " stories");
        List<StoryId> added = new ArrayList<>();
        for (StoryTitle title : titles) {
            Story story = new Story(StoryId.newId(), title);
            stories.add(story);
            added.add(story.id());
        }
        raise(new StoriesAdded(id, List.copyOf(added), now));
        return added;
    }

    public void removeStory(ParticipantId actor, StoryId storyId, Instant now) {
        requireFacilitator(actor);
        Story story = story(storyId);
        stories.remove(story);
        if (story.status().isActive()) {
            timerEndsAt = null;
        }
        raise(new StoryRemoved(id, storyId, now));
    }

    // ------------------------------------------------------------------ playing

    /** Opens (or re-opens) voting on a story. Any other story in play goes back to the backlog. */
    public void startVoting(ParticipantId actor, StoryId storyId, Instant now) {
        requireFacilitator(actor);
        Story story = story(storyId);
        activeStory().filter(other -> other != story).ifPresent(Story::returnToBacklog);
        story.startRound(now);
        timerEndsAt = null;
        raise(new VotingStarted(id, storyId, story.round(), now));
    }

    public void castVote(ParticipantId voterId, String cardLabel, Instant now) {
        Participant voter = participant(voterId);
        if (!voter.canVote()) {
            throw new NotPermitted("Observers watch the game; switch to voter to play cards");
        }
        Story story = activeStory()
                .filter(candidate -> candidate.status() == StoryStatus.VOTING)
                .orElseThrow(() -> new DomainRuleViolation("Voting is not open right now"));
        Card card = deckType.deck().card(cardLabel);
        boolean first = story.votes().isEmpty();
        story.record(new Vote(voterId, card, now));
        raise(new VoteCast(id, story.id(), voterId, first, everyoneVoted(story), now));
    }

    public void retractVote(ParticipantId voterId, Instant now) {
        participant(voterId);
        Story story = activeStory()
                .filter(candidate -> candidate.status() == StoryStatus.VOTING)
                .orElseThrow(() -> new DomainRuleViolation("Voting is not open right now"));
        if (story.retract(voterId)) {
            raise(new VoteRetracted(id, story.id(), voterId, now));
        }
    }

    public RoundResult reveal(ParticipantId actor, Instant now) {
        requireFacilitator(actor);
        Story story = activeStory().orElseThrow(() -> new DomainRuleViolation("There is no story in play"));
        story.reveal();
        timerEndsAt = null;
        RoundResult result = resultOf(story);
        raise(new CardsRevealed(id, story.id(), story.round(), result.consensus(), now));
        return result;
    }

    public void revote(ParticipantId actor, Instant now) {
        requireFacilitator(actor);
        Story story = activeStory().orElseThrow(() -> new DomainRuleViolation("There is no story in play"));
        story.startRound(now);
        timerEndsAt = null;
        raise(new VotingStarted(id, story.id(), story.round(), now));
    }

    public void settleEstimate(ParticipantId actor, StoryId storyId, String cardLabel, Instant now) {
        requireFacilitator(actor);
        Story story = story(storyId);
        Card estimate = deckType.deck().card(cardLabel);
        boolean unanimous = story.status() == StoryStatus.REVEALED && resultOf(story).consensus()
                && story.votes().iterator().next().card().equals(estimate);
        story.settle(estimate, unanimous);
        timerEndsAt = null;
        raise(new StoryEstimated(id, storyId, estimate.label(), unanimous, now));
    }

    public void cancelVoting(ParticipantId actor, Instant now) {
        requireFacilitator(actor);
        Story story = activeStory().orElseThrow(() -> new DomainRuleViolation("There is no story in play"));
        story.returnToBacklog();
        timerEndsAt = null;
        raise(new VotingCancelled(id, story.id(), now));
    }

    public void startTimer(ParticipantId actor, Duration duration, Instant now) {
        requireFacilitator(actor);
        Guard.that(activeStory().isPresent(), "Start a round before starting the timer");
        Guard.that(duration.compareTo(MIN_TIMER) >= 0 && duration.compareTo(MAX_TIMER) <= 0,
                "Timers run between 10 seconds and 15 minutes");
        timerEndsAt = now.plus(duration);
        raise(new TimerStarted(id, timerEndsAt, now));
    }

    // ------------------------------------------------------------------ queries

    public Optional<Story> activeStory() {
        return stories.stream().filter(story -> story.status().isActive()).findFirst();
    }

    public RoundResult resultOf(Story story) {
        return RoundResult.of(deckType.deck(), story.votes(), story.roundStartedAt().orElse(null));
    }

    public boolean everyoneVoted(Story story) {
        List<Participant> voters = participants.values().stream().filter(Participant::canVote).toList();
        return !voters.isEmpty() && voters.stream().allMatch(voter -> story.hasVoteFrom(voter.id()));
    }

    public boolean isFacilitator(ParticipantId participantId) {
        return participantId != null && participantId.equals(facilitatorId);
    }

    private void requireFacilitator(ParticipantId actor) {
        participant(actor);
        if (!isFacilitator(actor)) {
            throw new NotPermitted("Only the facilitator can do that");
        }
    }

    private Participant participant(ParticipantId participantId) {
        Participant participant = participants.get(participantId);
        if (participant == null) {
            throw new DomainRuleViolation("That person is not seated at this table");
        }
        return participant;
    }

    private Story story(StoryId storyId) {
        return stories.stream()
                .filter(story -> story.id().equals(storyId))
                .findFirst()
                .orElseThrow(() -> new DomainRuleViolation("That story is not on this table"));
    }

    @Override
    public SessionId id() {
        return id;
    }

    public SessionCode code() {
        return code;
    }

    public SessionName name() {
        return name;
    }

    public Optional<TeamName> team() {
        return Optional.ofNullable(team);
    }

    public DeckType deckType() {
        return deckType;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Optional<ParticipantId> facilitatorId() {
        return Optional.ofNullable(facilitatorId);
    }

    public Optional<Instant> timerEndsAt() {
        return Optional.ofNullable(timerEndsAt);
    }

    public Collection<Participant> participants() {
        return Collections.unmodifiableCollection(participants.values());
    }

    public Optional<Participant> findParticipant(ParticipantId participantId) {
        return Optional.ofNullable(participants.get(participantId));
    }

    public List<Story> stories() {
        return Collections.unmodifiableList(stories);
    }

    public long version() {
        return version;
    }
}
