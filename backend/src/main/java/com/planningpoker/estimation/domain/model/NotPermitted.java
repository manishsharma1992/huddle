package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.DomainRuleViolation;

/** The actor is not allowed to do this, e.g. a voter trying to reveal cards. */
public class NotPermitted extends DomainRuleViolation {
    public NotPermitted(String message) {
        super(message);
    }
}
