package com.planningpoker.estimation.application.view;

/** @param team the team that opened the table, or null for tables opened before teams existed */
public record TableSummaryView(String code, String name, String team, int participantCount, long updatedAt) {
}
