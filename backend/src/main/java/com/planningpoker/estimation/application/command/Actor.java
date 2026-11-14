package com.planningpoker.estimation.application.command;

/** Who is issuing a command, and their proof of seat ownership. */
public record Actor(String code, String participantId, String accessKey) {
}
