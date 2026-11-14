package com.planningpoker.estimation.application.port;

import com.planningpoker.estimation.domain.model.ParticipantId;
import com.planningpoker.estimation.domain.model.SessionCode;

import java.util.Set;

/** Knows who currently has the table open in a browser. Presence is transient, so it is not part of the model. */
public interface PresenceRegistry {
    Set<ParticipantId> onlineAt(SessionCode code);
}
