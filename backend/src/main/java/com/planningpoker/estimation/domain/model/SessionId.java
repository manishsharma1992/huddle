package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

import java.util.UUID;

public record SessionId(UUID value) {
    public SessionId {
        Guard.notNull(value, "Session id");
    }

    public static SessionId newId() {
        return new SessionId(UUID.randomUUID());
    }
}
