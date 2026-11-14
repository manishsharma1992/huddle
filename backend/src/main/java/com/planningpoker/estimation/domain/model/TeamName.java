package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

/** The team a table belongs to, e.g. "Credit Rating Framework - Next". Lets colleagues find their own tables. */
public record TeamName(String value) {
    public TeamName {
        value = Guard.text(value, "Team name", 80);
    }
}
