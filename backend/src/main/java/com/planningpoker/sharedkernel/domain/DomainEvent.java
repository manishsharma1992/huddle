package com.planningpoker.sharedkernel.domain;

import java.time.Instant;

/** Something that happened in the domain that domain experts care about. */
public interface DomainEvent {
    Instant occurredAt();
}
