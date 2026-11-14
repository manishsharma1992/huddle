package com.planningpoker.estimation.domain.model;

import java.util.List;

/** The decks a team can choose to play with. */
public enum DeckType {

    FIBONACCI("Fibonacci", List.of(
            Card.numeric("0", 0), Card.numeric("1", 1), Card.numeric("2", 2), Card.numeric("3", 3),
            Card.numeric("5", 5), Card.numeric("8", 8), Card.numeric("13", 13), Card.numeric("21", 21),
            Card.UNSURE, Card.BREAK)),

    MODIFIED_FIBONACCI("Modified Fibonacci", List.of(
            Card.numeric("0", 0), Card.numeric("½", 0.5), Card.numeric("1", 1), Card.numeric("2", 2),
            Card.numeric("3", 3), Card.numeric("5", 5), Card.numeric("8", 8), Card.numeric("13", 13),
            Card.numeric("20", 20), Card.numeric("40", 40), Card.numeric("100", 100),
            Card.UNSURE, Card.BREAK)),

    T_SHIRT("T-shirt sizes", List.of(
            Card.numeric("XS", 1), Card.numeric("S", 2), Card.numeric("M", 3), Card.numeric("L", 5),
            Card.numeric("XL", 8), Card.numeric("XXL", 13), Card.UNSURE, Card.BREAK)),

    POWERS_OF_TWO("Powers of two", List.of(
            Card.numeric("0", 0), Card.numeric("1", 1), Card.numeric("2", 2), Card.numeric("4", 4),
            Card.numeric("8", 8), Card.numeric("16", 16), Card.numeric("32", 32), Card.numeric("64", 64),
            Card.UNSURE, Card.BREAK));

    private final String displayName;
    private final Deck deck;

    DeckType(String displayName, List<Card> cards) {
        this.displayName = displayName;
        this.deck = new Deck(cards);
    }

    public String displayName() {
        return displayName;
    }

    public Deck deck() {
        return deck;
    }
}
