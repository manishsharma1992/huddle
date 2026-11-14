package com.planningpoker.estimation.application.port;

import com.planningpoker.estimation.application.view.EffectView;
import com.planningpoker.estimation.application.view.TableView;
import com.planningpoker.estimation.domain.event.PokerSessionEvent;
import com.planningpoker.estimation.domain.model.SessionCode;

import java.util.List;
import java.util.Set;

/** Pushes what happened at a table to everybody sitting at it, in real time. */
public interface TableBroadcaster {

    void tableChanged(TableView table, List<PokerSessionEvent> events);

    void presenceChanged(SessionCode code, Set<String> onlineParticipantIds);

    void effect(SessionCode code, EffectView effect);
}
