package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.DomainRuleViolation;
import com.planningpoker.sharedkernel.domain.Guard;

import java.util.UUID;

public record ParticipantId(UUID value) {
    public ParticipantId {
        Guard.notNull(value, "Participant id");
    }

    public static ParticipantId newId() {
        return new ParticipantId(UUID.randomUUID());
    }

    public static ParticipantId of(String raw) {
        try {
            return new ParticipantId(UUID.fromString(raw));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new DomainRuleViolation("Unknown participant");
        }
    }
}
