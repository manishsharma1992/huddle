package com.planningpoker.estimation.interfaces.rest;

import com.planningpoker.estimation.application.EffectService;
import com.planningpoker.estimation.application.PokerSessionService;
import com.planningpoker.estimation.application.command.*;
import com.planningpoker.estimation.application.view.*;
import com.planningpoker.estimation.interfaces.rest.Requests.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST facade over the Estimation application services. Commands identify the caller with the
 * {@code X-Participant-Id} and {@code X-Access-Key} headers handed out when they took their seat.
 */
@RestController
@RequestMapping("/api")
class TableController {

    private static final String PARTICIPANT = "X-Participant-Id";
    private static final String KEY = "X-Access-Key";

    private final PokerSessionService tables;
    private final EffectService effects;

    TableController(PokerSessionService tables, EffectService effects) {
        this.tables = tables;
        this.effects = effects;
    }

    @GetMapping("/decks")
    List<DeckView> decks() {
        return tables.decks();
    }

    @GetMapping("/tables")
    List<TableSummaryView> recent() {
        return tables.recentTables();
    }

    @PostMapping("/tables")
    @ResponseStatus(HttpStatus.CREATED)
    SeatView open(@Valid @RequestBody OpenTableRequest request) {
        return tables.openTable(new OpenTable(request.name(), request.deckType(), request.yourName(), request.avatar()));
    }

    @GetMapping("/tables/{code}")
    TableView table(@PathVariable String code) {
        return tables.table(code);
    }

    @PostMapping("/tables/{code}/seats")
    @ResponseStatus(HttpStatus.CREATED)
    SeatView takeSeat(@PathVariable String code, @Valid @RequestBody TakeSeatRequest request) {
        return tables.takeSeat(new TakeSeat(code, request.name(), request.avatar(), request.role()));
    }

    @GetMapping("/tables/{code}/me")
    MySeatView me(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        return tables.mySeat(new Actor(code, participant, key));
    }

    @PostMapping("/tables/{code}/me/welcome-back")
    void welcomeBack(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        tables.welcomeBack(new Actor(code, participant, key));
    }

    @PutMapping("/tables/{code}/me")
    void updateProfile(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant,
                       @RequestHeader(KEY) String key, @Valid @RequestBody ProfileRequest request) {
        tables.updateProfile(new Actor(code, participant, key), new UpdateProfile(request.name(), request.avatar(), request.role()));
    }

    @DeleteMapping("/tables/{code}/me")
    void leave(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        tables.leave(new Actor(code, participant, key));
    }

    @DeleteMapping("/tables/{code}/seats/{participantId}")
    void dismiss(@PathVariable String code, @PathVariable String participantId,
                 @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        tables.dismiss(new Actor(code, participant, key), participantId);
    }

    @PutMapping("/tables/{code}/facilitator")
    void handOver(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant,
                  @RequestHeader(KEY) String key, @Valid @RequestBody ParticipantRequest request) {
        tables.handOverFacilitation(new Actor(code, participant, key), request.participantId());
    }

    @PostMapping("/tables/{code}/facilitator/step-up")
    void stepUp(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        tables.stepUpAsFacilitator(new Actor(code, participant, key));
    }

    @PostMapping("/tables/{code}/stories")
    void addStories(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant,
                    @RequestHeader(KEY) String key, @Valid @RequestBody AddStoriesRequest request) {
        tables.addStories(new Actor(code, participant, key), request.titles());
    }

    @DeleteMapping("/tables/{code}/stories/{storyId}")
    void removeStory(@PathVariable String code, @PathVariable String storyId,
                     @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        tables.removeStory(new Actor(code, participant, key), storyId);
    }

    @PostMapping("/tables/{code}/stories/{storyId}/voting")
    void startVoting(@PathVariable String code, @PathVariable String storyId,
                     @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        tables.startVoting(new Actor(code, participant, key), storyId);
    }

    @PostMapping("/tables/{code}/stories/{storyId}/estimate")
    void settle(@PathVariable String code, @PathVariable String storyId, @RequestHeader(PARTICIPANT) String participant,
                @RequestHeader(KEY) String key, @Valid @RequestBody EstimateRequest request) {
        tables.settleEstimate(new Actor(code, participant, key), storyId, request.card());
    }

    @PutMapping("/tables/{code}/vote")
    void vote(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant,
              @RequestHeader(KEY) String key, @Valid @RequestBody VoteRequest request) {
        tables.castVote(new Actor(code, participant, key), request.card());
    }

    @DeleteMapping("/tables/{code}/vote")
    void retract(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        tables.retractVote(new Actor(code, participant, key));
    }

    @PostMapping("/tables/{code}/reveal")
    void reveal(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        tables.reveal(new Actor(code, participant, key));
    }

    @PostMapping("/tables/{code}/revote")
    void revote(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        tables.revote(new Actor(code, participant, key));
    }

    @PostMapping("/tables/{code}/cancel")
    void cancel(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant, @RequestHeader(KEY) String key) {
        tables.cancelVoting(new Actor(code, participant, key));
    }

    @PostMapping("/tables/{code}/timer")
    void timer(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant,
               @RequestHeader(KEY) String key, @Valid @RequestBody TimerRequest request) {
        tables.startTimer(new Actor(code, participant, key), request.seconds());
    }

    @PostMapping("/tables/{code}/effects")
    @ResponseStatus(HttpStatus.ACCEPTED)
    void effect(@PathVariable String code, @RequestHeader(PARTICIPANT) String participant,
                @RequestHeader(KEY) String key, @Valid @RequestBody EffectRequest request) {
        effects.send(new Actor(code, participant, key), new SendEffect(request.kind(), request.emoji(), request.targetId()));
    }
}
