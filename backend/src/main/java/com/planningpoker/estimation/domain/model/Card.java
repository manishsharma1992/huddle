package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

import java.util.Optional;

/**
 * A card from a deck. Numeric cards carry a value used for statistics; special cards
 * ("?" = no idea yet, "☕" = I need a break) carry none.
 */
public record Card(String label, Double numericValue) {

    public static final Card UNSURE = new Card("?", null);
    public static final Card BREAK = new Card("☕", null);

    public Card {
        label = Guard.text(label, "Card", 4);
    }

    public static Card numeric(String label, double value) {
        return new Card(label, value);
    }

    public static Card symbolic(String label) {
        return new Card(label, null);
    }

    public Optional<Double> value() {
        return Optional.ofNullable(numericValue);
    }

    public boolean isNumeric() {
        return numericValue != null;
    }

    public boolean isEstimate() {
        return !equals(UNSURE) && !equals(BREAK);
    }
}
