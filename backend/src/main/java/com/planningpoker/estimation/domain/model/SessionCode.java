package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.DomainRuleViolation;
import com.planningpoker.sharedkernel.domain.Guard;

import java.util.Locale;
import java.util.random.RandomGenerator;
import java.util.regex.Pattern;

/** The short, human-friendly code people type or share to join a table, e.g. {@code K7QF9M}. */
public record SessionCode(String value) {

    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
    private static final int LENGTH = 6;
    private static final Pattern FORMAT = Pattern.compile("[" + ALPHABET + "]{" + LENGTH + "}");

    public SessionCode {
        Guard.notNull(value, "Session code");
        value = value.strip().toUpperCase(Locale.ROOT);
        if (!FORMAT.matcher(value).matches()) {
            throw new DomainRuleViolation("'" + value + "' is not a valid table code");
        }
    }

    public static SessionCode generate(RandomGenerator random) {
        StringBuilder code = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return new SessionCode(code.toString());
    }

    @Override
    public String toString() {
        return value;
    }
}
