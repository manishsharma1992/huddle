package com.planningpoker.estimation.interfaces.rest;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** JSON request bodies accepted by the REST API. */
final class Requests {
    private Requests() {
    }

    record OpenTableRequest(@NotBlank @Size(max = 80) String name, String deckType,
                            @NotBlank @Size(max = 30) String yourName, String avatar) {
    }

    record TakeSeatRequest(@NotBlank @Size(max = 30) String name, String avatar, String role) {
    }

    record ProfileRequest(@NotBlank @Size(max = 30) String name, String avatar, String role) {
    }

    record AddStoriesRequest(@NotEmpty @Size(max = 300) List<@NotBlank String> titles) {
    }

    record VoteRequest(@NotBlank String card) {
    }

    record EstimateRequest(@NotBlank String card) {
    }

    record TimerRequest(@Min(10) @Max(900) int seconds) {
    }

    record ParticipantRequest(@NotBlank String participantId) {
    }

    record EffectRequest(@NotBlank String kind, @NotBlank String emoji, String targetId) {
    }
}
