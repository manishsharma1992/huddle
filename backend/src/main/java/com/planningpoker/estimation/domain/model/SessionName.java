package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

public record SessionName(String value) {
    public SessionName {
        value = Guard.text(value, "Session name", 80);
    }
}
