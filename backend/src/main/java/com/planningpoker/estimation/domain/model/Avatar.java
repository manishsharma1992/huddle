package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

/** The little character (an emoji) that represents someone at the table. */
public record Avatar(String value) {
    public static final Avatar DEFAULT = new Avatar("🦊");

    public Avatar {
        value = Guard.text(value, "Avatar", 4);
    }
}
