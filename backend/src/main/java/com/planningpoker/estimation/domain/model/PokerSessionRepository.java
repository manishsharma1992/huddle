package com.planningpoker.estimation.domain.model;

import java.util.Optional;

/** Collection-like access to {@link PokerSession} aggregates. Implemented by the infrastructure layer. */
public interface PokerSessionRepository {

    Optional<PokerSession> findByCode(SessionCode code);

    boolean codeInUse(SessionCode code);

    void save(PokerSession session);
}
