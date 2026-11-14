package com.planningpoker.estimation.domain.model;

/** Somebody else changed the same table at the same moment; the command can safely be retried. */
public class ConcurrentModification extends RuntimeException {
    public ConcurrentModification(SessionCode code) {
        super("Table " + code + " was changed concurrently");
    }
}
