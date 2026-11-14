package com.planningpoker.estimation.application.view;

/** An ephemeral, purely-for-fun effect: an emoji floating up, or one thrown at a colleague. */
public record EffectView(String kind, String fromId, String targetId, String emoji, long at) {
}
