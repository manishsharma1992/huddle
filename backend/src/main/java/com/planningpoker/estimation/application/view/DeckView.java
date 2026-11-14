package com.planningpoker.estimation.application.view;

import java.util.List;

public record DeckView(String type, String name, List<CardView> cards) {
}
