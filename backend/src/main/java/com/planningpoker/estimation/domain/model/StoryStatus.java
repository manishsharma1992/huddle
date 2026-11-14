package com.planningpoker.estimation.domain.model;

/** Life cycle of a backlog item at the table. */
public enum StoryStatus {
    /** Waiting in the backlog. */
    PENDING,
    /** Cards are being played face down. */
    VOTING,
    /** Cards are face up; the team is discussing. */
    REVEALED,
    /** The team agreed on an estimate. */
    ESTIMATED;

    public boolean isActive() {
        return this == VOTING || this == REVEALED;
    }
}
