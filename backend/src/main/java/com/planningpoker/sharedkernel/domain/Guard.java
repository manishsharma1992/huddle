package com.planningpoker.sharedkernel.domain;

/** Small assertion helpers so value objects can protect their own invariants. */
public final class Guard {
    private Guard() {
    }

    public static <T> T notNull(T value, String what) {
        if (value == null) {
            throw new DomainRuleViolation(what + " is required");
        }
        return value;
    }

    public static String text(String value, String what, int maxLength) {
        notNull(value, what);
        String trimmed = value.strip();
        if (trimmed.isEmpty()) {
            throw new DomainRuleViolation(what + " cannot be blank");
        }
        if (trimmed.codePointCount(0, trimmed.length()) > maxLength) {
            throw new DomainRuleViolation(what + " must be at most " + maxLength + " characters");
        }
        return trimmed;
    }

    public static void that(boolean condition, String message) {
        if (!condition) {
            throw new DomainRuleViolation(message);
        }
    }
}
