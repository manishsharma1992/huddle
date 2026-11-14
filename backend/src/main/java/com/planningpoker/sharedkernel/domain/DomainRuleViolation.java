package com.planningpoker.sharedkernel.domain;

/** Thrown when a command would break an invariant of the model. */
public class DomainRuleViolation extends RuntimeException {
    public DomainRuleViolation(String message) {
        super(message);
    }
}
