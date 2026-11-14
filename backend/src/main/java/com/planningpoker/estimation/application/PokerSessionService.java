package com.planningpoker.estimation.application;

import com.planningpoker.estimation.application.command.*;
import com.planningpoker.estimation.application.port.PresenceRegistry;
import com.planningpoker.estimation.application.port.TableBroadcaster;
import com.planningpoker.estimation.application.port.TableDirectory;
import com.planningpoker.estimation.application.port.TransactionBoundary;
import com.planningpoker.estimation.application.view.*;
import com.planningpoker.estimation.domain.event.PokerSessionEvent;
import com.planningpoker.estimation.domain.model.*;
import com.planningpoker.sharedkernel.domain.DomainRuleViolation;

import java.time.Clock;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.BiFunction;
import java.util.random.RandomGenerator;

/**
 * Application service for the Estimation context: one method per use case. It holds no business rules;
 * it loads the aggregate, tells it what to do, saves it, and lets everyone at the table know.
 */
public class PokerSessionService {

    private static final int MAX_ATTEMPTS = 3;

    private final PokerSessionRepository sessions;
    private final TransactionBoundary transactions;
    private final TableBroadcaster broadcaster;
    private final PresenceRegistry presence;
    private final TableDirectory directory;
    private final Clock clock;
    private final RandomGenerator random;
    private final TableViewAssembler assembler;
    private final ConcurrentHashMap<SessionCode, ReentrantLock> locks = new ConcurrentHashMap<>();

    public PokerSessionService(PokerSessionRepository sessions, TransactionBoundary transactions,
                               TableBroadcaster broadcaster, PresenceRegistry presence, TableDirectory directory,
                               Clock clock, RandomGenerator random) {
        this.sessions = sessions;
        this.transactions = transactions;
        this.broadcaster = broadcaster;
        this.presence = presence;
        this.directory = directory;
        this.clock = clock;
        this.random = random;
        this.assembler = new TableViewAssembler(clock);
    }

    // ------------------------------------------------------------------ use cases: seating

    public SeatView openTable(OpenTable command) {
        DeckType deck = deckType(command.deckType());
        SessionCode code;
        do {
            code = SessionCode.generate(random);
        } while (sessions.codeInUse(code));

        ParticipantId facilitator = ParticipantId.newId();
        AccessKey key = AccessKey.generate(random);
        TeamName team = command.team() == null || command.team().isBlank() ? null : new TeamName(command.team());
        PokerSession session = PokerSession.open(SessionId.newId(), code, new SessionName(command.name()), team, deck,
                facilitator, key, new DisplayName(command.facilitatorName()), avatar(command.facilitatorAvatar()),
                clock.instant());
        transactions.inTransaction(() -> {
            sessions.save(session);
            return null;
        });
        session.pullEvents();
        return seat(code, facilitator, key);
    }

    public SeatView takeSeat(TakeSeat command) {
        SessionCode code = new SessionCode(command.code());
        ParticipantId participantId = ParticipantId.newId();
        AccessKey key = AccessKey.generate(random);
        change(code, (session, now) -> {
            session.seat(participantId, key, new DisplayName(command.name()), avatar(command.avatar()),
                    role(command.role()), now);
            return null;
        });
        return seat(code, participantId, key);
    }

    public void welcomeBack(Actor actor) {
        act(actor, (session, me, now) -> session.welcomeBack(me, now));
    }

    public void updateProfile(Actor actor, UpdateProfile command) {
        act(actor, (session, me, now) -> session.updateProfile(me, new DisplayName(command.name()),
                avatar(command.avatar()), role(command.role()), now));
    }

    public void leave(Actor actor) {
        act(actor, (session, me, now) -> session.leave(me, now));
    }

    public void dismiss(Actor actor, String participantId) {
        act(actor, (session, me, now) -> session.dismiss(me, ParticipantId.of(participantId), now));
    }

    public void handOverFacilitation(Actor actor, String participantId) {
        act(actor, (session, me, now) -> session.handOverFacilitation(me, ParticipantId.of(participantId), now));
    }

    public void stepUpAsFacilitator(Actor actor) {
        act(actor, (session, me, now) -> session.stepUpAsFacilitator(me, now));
    }

    // ------------------------------------------------------------------ use cases: backlog & play

    public void addStories(Actor actor, List<String> titles) {
        List<StoryTitle> storyTitles = titles.stream()
                .flatMap(title -> Arrays.stream(title.split("\\R")))
                .map(String::strip)
                .map(line -> line.replaceFirst("^([-*•]|\\d+[.)])\\s+", ""))
                .filter(line -> !line.isBlank())
                .map(StoryTitle::new)
                .toList();
        act(actor, (session, me, now) -> session.addStories(me, storyTitles, now));
    }

    public void removeStory(Actor actor, String storyId) {
        act(actor, (session, me, now) -> session.removeStory(me, StoryId.of(storyId), now));
    }

    public void startVoting(Actor actor, String storyId) {
        act(actor, (session, me, now) -> session.startVoting(me, StoryId.of(storyId), now));
    }

    public void castVote(Actor actor, String card) {
        act(actor, (session, me, now) -> session.castVote(me, card, now));
    }

    public void retractVote(Actor actor) {
        act(actor, (session, me, now) -> session.retractVote(me, now));
    }

    public void reveal(Actor actor) {
        act(actor, (session, me, now) -> session.reveal(me, now));
    }

    public void revote(Actor actor) {
        act(actor, (session, me, now) -> session.revote(me, now));
    }

    public void settleEstimate(Actor actor, String storyId, String card) {
        act(actor, (session, me, now) -> session.settleEstimate(me, StoryId.of(storyId), card, now));
    }

    public void cancelVoting(Actor actor) {
        act(actor, (session, me, now) -> session.cancelVoting(me, now));
    }

    public void startTimer(Actor actor, int seconds) {
        act(actor, (session, me, now) -> session.startTimer(me, Duration.ofSeconds(seconds), now));
    }

    // ------------------------------------------------------------------ queries

    public TableView table(String rawCode) {
        SessionCode code = new SessionCode(rawCode);
        PokerSession session = load(code);
        return assembler.assemble(session, presence.onlineAt(code));
    }

    public MySeatView mySeat(Actor actor) {
        PokerSession session = load(new SessionCode(actor.code()));
        Participant me = session.authenticate(ParticipantId.of(actor.participantId()), actor.accessKey());
        String myVote = session.activeStory()
                .flatMap(story -> story.votes().stream().filter(vote -> vote.voter().equals(me.id())).findFirst())
                .map(vote -> vote.card().label())
                .orElse(null);
        return new MySeatView(me.id().value().toString(), myVote, session.isFacilitator(me.id()));
    }

    public List<TableSummaryView> recentTables() {
        return directory.activeSince(clock.instant().minus(Duration.ofHours(12)), 12);
    }

    public List<DeckView> decks() {
        return Arrays.stream(DeckType.values())
                .map(type -> new DeckView(type.name(), type.displayName(), TableViewAssembler.cards(type)))
                .toList();
    }

    // ------------------------------------------------------------------ plumbing

    @FunctionalInterface
    private interface SeatedAction {
        void apply(PokerSession session, ParticipantId me, java.time.Instant now);
    }

    private void act(Actor actor, SeatedAction action) {
        SessionCode code = new SessionCode(actor.code());
        change(code, (session, now) -> {
            Participant me = session.authenticate(ParticipantId.of(actor.participantId()), actor.accessKey());
            action.apply(session, me.id(), now);
            return null;
        });
    }

    /**
     * Executes a change against one table. Commands on the same table are serialized (a lock per table
     * code) so the facilitator's "reveal" and a last-second vote never trample each other; optimistic
     * locking in the repository is the safety net, with a short retry.
     */
    private <T> T change(SessionCode code, BiFunction<PokerSession, java.time.Instant, T> command) {
        ReentrantLock lock = locks.computeIfAbsent(code, ignored -> new ReentrantLock());
        lock.lock();
        try {
            for (int attempt = 1; ; attempt++) {
                try {
                    record Outcome<T>(T value, PokerSession session, List<PokerSessionEvent> events) {
                    }
                    Outcome<T> outcome = transactions.inTransaction(() -> {
                        PokerSession session = load(code);
                        T value = command.apply(session, clock.instant());
                        List<PokerSessionEvent> events = session.pullEvents();
                        if (!events.isEmpty()) {
                            sessions.save(session);
                        }
                        return new Outcome<>(value, session, events);
                    });
                    if (!outcome.events().isEmpty()) {
                        broadcaster.tableChanged(assembler.assemble(outcome.session(), presence.onlineAt(code)),
                                outcome.events());
                    }
                    return outcome.value();
                } catch (ConcurrentModification conflict) {
                    if (attempt >= MAX_ATTEMPTS) {
                        throw conflict;
                    }
                }
            }
        } finally {
            lock.unlock();
        }
    }

    private PokerSession load(SessionCode code) {
        return sessions.findByCode(code).orElseThrow(() -> new TableNotFound(code.value()));
    }

    private static SeatView seat(SessionCode code, ParticipantId participantId, AccessKey key) {
        return new SeatView(code.value(), participantId.value().toString(), key.value());
    }

    private static DeckType deckType(String raw) {
        if (raw == null || raw.isBlank()) {
            return DeckType.FIBONACCI;
        }
        try {
            return DeckType.valueOf(raw.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new DomainRuleViolation("Unknown deck '" + raw + "'");
        }
    }

    private static ParticipantRole role(String raw) {
        if (raw == null || raw.isBlank()) {
            return ParticipantRole.VOTER;
        }
        try {
            return ParticipantRole.valueOf(raw.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new DomainRuleViolation("Unknown role '" + raw + "'");
        }
    }

    private static Avatar avatar(String raw) {
        return raw == null || raw.isBlank() ? Avatar.DEFAULT : new Avatar(raw);
    }
}
