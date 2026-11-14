package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.DomainRuleViolation;

import java.util.List;

/** An ordered set of cards. Order matters: it defines how "far apart" two estimates are. */
public record Deck(List<Card> cards) {

    public Deck {
        cards = List.copyOf(cards);
    }

    public Card card(String label) {
        return cards.stream()
                .filter(card -> card.label().equals(label))
                .findFirst()
                .orElseThrow(() -> new DomainRuleViolation("'" + label + "' is not a card in this deck"));
    }

    public int positionOf(Card card) {
        return cards.indexOf(card);
    }

    /** The numeric card whose value is closest to the given number (ties go to the larger card: be safe). */
    public Card closestTo(double value) {
        Card best = null;
        for (Card candidate : cards) {
            if (!candidate.isNumeric()) {
                continue;
            }
            if (best == null || Math.abs(candidate.numericValue() - value) <= Math.abs(best.numericValue() - value)) {
                best = candidate;
            }
            if (candidate.numericValue() > value) {
                break;
            }
        }
        return best;
    }
}
