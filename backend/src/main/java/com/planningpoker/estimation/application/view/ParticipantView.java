package com.planningpoker.estimation.application.view;

public record ParticipantView(String id, String name, String avatar, String role, boolean facilitator,
                              boolean online, long joinedAt) {
}
