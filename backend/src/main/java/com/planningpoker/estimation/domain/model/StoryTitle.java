package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

public record StoryTitle(String value) {
    public StoryTitle {
        value = Guard.text(value, "Story title", 200);
    }
}
