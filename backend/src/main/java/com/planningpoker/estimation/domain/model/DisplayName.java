package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

public record DisplayName(String value) {
    public DisplayName {
        value = Guard.text(value, "Name", 30);
    }
}
