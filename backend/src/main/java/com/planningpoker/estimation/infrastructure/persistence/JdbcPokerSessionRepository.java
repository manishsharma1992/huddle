package com.planningpoker.estimation.infrastructure.persistence;

import com.planningpoker.estimation.domain.model.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Stores a {@link PokerSession} aggregate in plain relational tables with hand-written SQL. The aggregate is
 * always loaded and saved as a whole; the root row carries a version for optimistic concurrency.
 */
@Repository
class JdbcPokerSessionRepository implements PokerSessionRepository {

    private final JdbcClient jdbc;
    private final Clock clock;

    JdbcPokerSessionRepository(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Override
    public Optional<PokerSession> findByCode(SessionCode code) {
        return jdbc.sql("select * from poker_session where code = :code")
                .param("code", code.value())
                .query((rs, row) -> restore(rs))
                .optional();
    }

    @Override
    public boolean codeInUse(SessionCode code) {
        return jdbc.sql("select count(*) from poker_session where code = :code")
                .param("code", code.value())
                .query(Integer.class)
                .single() > 0;
    }

    @Override
    public void save(PokerSession session) {
        UUID id = session.id().value();
        Timestamp now = Timestamp.from(clock.instant());
        int updated = jdbc.sql("""
                        update poker_session
                           set facilitator_id = :facilitator, timer_ends_at = :timer, updated_at = :now,
                               version = version + 1
                         where id = :id and version = :version""")
                .param("facilitator", session.facilitatorId().map(ParticipantId::value).orElse(null))
                .param("timer", session.timerEndsAt().map(Timestamp::from).orElse(null))
                .param("now", now)
                .param("id", id)
                .param("version", session.version())
                .update();
        if (updated == 0) {
            if (session.version() != 0 || exists(id)) {
                throw new ConcurrentModification(session.code());
            }
            jdbc.sql("""
                            insert into poker_session (id, code, name, team, deck_type, facilitator_id, timer_ends_at,
                                                       created_at, updated_at, version)
                            values (:id, :code, :name, :team, :deck, :facilitator, :timer, :created, :now, 1)""")
                    .param("id", id)
                    .param("code", session.code().value())
                    .param("name", session.name().value())
                    .param("team", session.team().map(TeamName::value).orElse(null))
                    .param("deck", session.deckType().name())
                    .param("facilitator", session.facilitatorId().map(ParticipantId::value).orElse(null))
                    .param("timer", session.timerEndsAt().map(Timestamp::from).orElse(null))
                    .param("created", Timestamp.from(session.createdAt()))
                    .param("now", now)
                    .update();
        }

        // Children are owned by the root: replace them wholesale (aggregates are small).
        jdbc.sql("delete from story where session_id = :id").param("id", id).update();
        jdbc.sql("delete from participant where session_id = :id").param("id", id).update();

        int seat = 0;
        for (Participant participant : session.participants()) {
            jdbc.sql("""
                            insert into participant (id, session_id, seat_order, name, avatar, role, access_key, joined_at)
                            values (:id, :session, :seat, :name, :avatar, :role, :key, :joined)""")
                    .param("id", participant.id().value())
                    .param("session", id)
                    .param("seat", seat++)
                    .param("name", participant.name().value())
                    .param("avatar", participant.avatar().value())
                    .param("role", participant.role().name())
                    .param("key", participant.accessKey().value())
                    .param("joined", Timestamp.from(participant.joinedAt()))
                    .update();
        }

        int position = 0;
        for (Story story : session.stories()) {
            jdbc.sql("""
                            insert into story (id, session_id, position, title, status, round, round_started_at,
                                               final_estimate, agreed_unanimously)
                            values (:id, :session, :position, :title, :status, :round, :started, :estimate, :unanimous)""")
                    .param("id", story.id().value())
                    .param("session", id)
                    .param("position", position++)
                    .param("title", story.title().value())
                    .param("status", story.status().name())
                    .param("round", story.round())
                    .param("started", story.roundStartedAt().map(Timestamp::from).orElse(null))
                    .param("estimate", story.finalEstimate().map(Card::label).orElse(null))
                    .param("unanimous", story.agreedUnanimously())
                    .update();
            int order = 0;
            for (Vote vote : story.votes()) {
                jdbc.sql("""
                                insert into vote (story_id, participant_id, card, cast_at, vote_order)
                                values (:story, :participant, :card, :cast, :order)""")
                        .param("story", story.id().value())
                        .param("participant", vote.voter().value())
                        .param("card", vote.card().label())
                        .param("cast", Timestamp.from(vote.castAt()))
                        .param("order", order++)
                        .update();
            }
        }
    }

    private boolean exists(UUID id) {
        return jdbc.sql("select count(*) from poker_session where id = :id").param("id", id)
                .query(Integer.class).single() > 0;
    }

    private PokerSession restore(ResultSet rs) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        DeckType deckType = DeckType.valueOf(rs.getString("deck_type"));
        Deck deck = deckType.deck();

        List<Participant> participants = jdbc.sql("select * from participant where session_id = :id order by seat_order")
                .param("id", id)
                .query((p, row) -> Participant.restore(
                        new ParticipantId(p.getObject("id", UUID.class)),
                        new AccessKey(p.getString("access_key")),
                        new DisplayName(p.getString("name")),
                        new Avatar(p.getString("avatar")),
                        ParticipantRole.valueOf(p.getString("role")),
                        instant(p, "joined_at")))
                .list();

        Map<UUID, List<Vote>> votesByStory = new HashMap<>();
        jdbc.sql("""
                        select v.* from vote v join story s on s.id = v.story_id
                         where s.session_id = :id order by v.vote_order""")
                .param("id", id)
                .query((v, row) -> {
                    votesByStory.computeIfAbsent(v.getObject("story_id", UUID.class), ignored -> new ArrayList<>())
                            .add(new Vote(new ParticipantId(v.getObject("participant_id", UUID.class)),
                                    deck.card(v.getString("card")), instant(v, "cast_at")));
                    return null;
                })
                .list();

        List<Story> stories = jdbc.sql("select * from story where session_id = :id order by position")
                .param("id", id)
                .query((s, row) -> {
                    UUID storyId = s.getObject("id", UUID.class);
                    String estimate = s.getString("final_estimate");
                    return Story.restore(
                            new StoryId(storyId),
                            new StoryTitle(s.getString("title")),
                            StoryStatus.valueOf(s.getString("status")),
                            s.getInt("round"),
                            instant(s, "round_started_at"),
                            votesByStory.getOrDefault(storyId, List.of()),
                            estimate == null ? null : deck.card(estimate),
                            s.getBoolean("agreed_unanimously"));
                })
                .list();

        UUID facilitator = rs.getObject("facilitator_id", UUID.class);
        return PokerSession.restore(
                new SessionId(id),
                new SessionCode(rs.getString("code")),
                new SessionName(rs.getString("name")),
                rs.getString("team") == null ? null : new TeamName(rs.getString("team")),
                deckType,
                instant(rs, "created_at"),
                facilitator == null ? null : new ParticipantId(facilitator),
                instant(rs, "timer_ends_at"),
                participants,
                stories,
                rs.getLong("version"));
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }
}
