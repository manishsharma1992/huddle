package com.planningpoker.estimation.domain;

import com.planningpoker.estimation.domain.event.*;
import com.planningpoker.estimation.domain.model.*;
import com.planningpoker.sharedkernel.domain.DomainRuleViolation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.SplittableRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PokerSessionTest {

    private final SplittableRandom random = new SplittableRandom(42);
    private final Instant t0 = Instant.parse("2026-11-13T09:00:00Z");

    private PokerSession table;
    private ParticipantId ana;
    private ParticipantId bo;
    private ParticipantId cy;
    private StoryId login;

    @BeforeEach
    void setUp() {
        ana = ParticipantId.newId();
        table = PokerSession.open(SessionId.newId(), SessionCode.generate(random), new SessionName("Sprint 42"),
                DeckType.FIBONACCI, ana, AccessKey.generate(random), new DisplayName("Ana"), new Avatar("🦊"), t0);
        bo = seat("Bo");
        cy = seat("Cy");
        login = table.addStories(ana, List.of(new StoryTitle("Login with SSO")), t0).getFirst();
        table.pullEvents();
    }

    private ParticipantId seat(String name) {
        ParticipantId id = ParticipantId.newId();
        table.seat(id, AccessKey.generate(random), new DisplayName(name), new Avatar("🐼"), ParticipantRole.VOTER, t0);
        return id;
    }

    @Test
    void cards_stay_secret_until_the_facilitator_reveals_and_unanimity_is_celebrated() {
        table.startVoting(ana, login, t0);
        table.castVote(ana, "5", t0.plusSeconds(3));
        table.castVote(bo, "5", t0.plusSeconds(1));
        table.castVote(cy, "5", t0.plusSeconds(7));

        List<PokerSessionEvent> events = table.pullEvents();
        assertThat(events).filteredOn(VoteCast.class::isInstance).hasSize(3);
        assertThat(((VoteCast) events.getLast()).everyoneVoted()).isTrue();

        RoundResult result = table.reveal(ana, t0.plusSeconds(10));
        assertThat(result.consensus()).isTrue();
        assertThat(result.fastestVoter()).isEqualTo(bo);
        assertThat(result.fastestVoteAfter()).isEqualTo(Duration.ofSeconds(1));
        assertThat(table.pullEvents()).singleElement().isInstanceOfSatisfying(CardsRevealed.class,
                revealed -> assertThat(revealed.consensus()).isTrue());

        table.settleEstimate(ana, login, "5", t0.plusSeconds(20));
        Story story = table.stories().getFirst();
        assertThat(story.status()).isEqualTo(StoryStatus.ESTIMATED);
        assertThat(story.agreedUnanimously()).isTrue();
    }

    @Test
    void only_the_facilitator_steers_the_game() {
        assertThatThrownBy(() -> table.startVoting(bo, login, t0)).isInstanceOf(NotPermitted.class);
        table.startVoting(ana, login, t0);
        table.castVote(bo, "3", t0);
        assertThatThrownBy(() -> table.reveal(bo, t0)).isInstanceOf(NotPermitted.class);
    }

    @Test
    void votes_require_an_open_round_and_a_card_from_the_deck() {
        assertThatThrownBy(() -> table.castVote(bo, "5", t0)).isInstanceOf(DomainRuleViolation.class);
        table.startVoting(ana, login, t0);
        assertThatThrownBy(() -> table.castVote(bo, "7", t0)).hasMessageContaining("not a card");
        table.castVote(bo, "8", t0);
        table.reveal(ana, t0);
        assertThatThrownBy(() -> table.castVote(cy, "5", t0)).hasMessageContaining("not open");
    }

    @Test
    void observers_cannot_vote_and_do_not_block_everyone_voted() {
        table.updateProfile(cy, new DisplayName("Cy"), new Avatar("🦉"), ParticipantRole.OBSERVER, t0);
        table.startVoting(ana, login, t0);
        assertThatThrownBy(() -> table.castVote(cy, "5", t0)).isInstanceOf(NotPermitted.class);
        table.castVote(ana, "3", t0);
        table.castVote(bo, "5", t0);
        assertThat(table.everyoneVoted(table.activeStory().orElseThrow())).isTrue();
    }

    @Test
    void outliers_are_spotted_so_the_team_can_hear_them_out() {
        ParticipantId dee = seat("Dee");
        table.startVoting(ana, login, t0);
        table.castVote(ana, "3", t0);
        table.castVote(bo, "3", t0);
        table.castVote(cy, "5", t0);
        table.castVote(dee, "21", t0);
        RoundResult result = table.reveal(ana, t0);
        assertThat(result.consensus()).isFalse();
        assertThat(result.outliers()).containsExactly(dee);
        assertThat(result.suggestedEstimate().label()).isEqualTo("3");
        assertThat(result.agreementPercent()).isEqualTo(50);
    }

    @Test
    void facilitation_passes_on_when_the_facilitator_leaves() {
        table.leave(ana, t0);
        assertThat(table.isFacilitator(bo)).isTrue();
        assertThat(table.pullEvents()).hasAtLeastOneElementOfType(FacilitatorChanged.class);
    }

    @Test
    void only_one_story_is_in_play_at_a_time() {
        StoryId search = table.addStories(ana, List.of(new StoryTitle("Search")), t0).getFirst();
        table.startVoting(ana, login, t0);
        table.castVote(bo, "2", t0);
        table.startVoting(ana, search, t0);
        assertThat(table.activeStory()).get().extracting(Story::id).isEqualTo(search);
        assertThat(table.stories().getFirst().status()).isEqualTo(StoryStatus.PENDING);
        assertThat(table.stories().getFirst().votes()).isEmpty();
    }

    @Test
    void a_seat_is_only_yours_with_the_right_key() {
        assertThatThrownBy(() -> table.authenticate(bo, "x".repeat(48))).isInstanceOf(NotPermitted.class);
    }
}
