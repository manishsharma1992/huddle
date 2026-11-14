package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.DomainRuleViolation;
import com.planningpoker.sharedkernel.domain.Guard;

import java.util.UUID;

public record StoryId(UUID value) {
    public StoryId {
        Guard.notNull(value, "Story id");
    }

    public static StoryId newId() {
        return new StoryId(UUID.randomUUID());
    }

    public static StoryId of(String raw) {
        try {
            return new StoryId(UUID.fromString(raw));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new DomainRuleViolation("Unknown story");
        }
    }
}
