package com.planningpoker.sharedkernel.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * Base for aggregate roots: the only objects outside code may hold references to.
 * Collects domain events raised while executing a command so the application layer can dispatch them
 * after the aggregate has been persisted.
 */
public abstract class AggregateRoot<ID, E extends DomainEvent> {

    private final transient List<E> pendingEvents = new ArrayList<>();

    public abstract ID id();

    protected void raise(E event) {
        pendingEvents.add(event);
    }

    public List<E> pullEvents() {
        List<E> events = List.copyOf(pendingEvents);
        pendingEvents.clear();
        return events;
    }
}
