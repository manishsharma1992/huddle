package com.planningpoker.estimation.infrastructure.messaging;

import com.planningpoker.estimation.application.port.TableBroadcaster;
import com.planningpoker.estimation.application.view.EffectView;
import com.planningpoker.estimation.application.view.TableView;
import com.planningpoker.estimation.domain.event.PokerSessionEvent;
import com.planningpoker.estimation.domain.model.SessionCode;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;

/** Sends table updates to {@code /topic/tables/{code}} over STOMP/WebSocket. */
@Component
class StompTableBroadcaster implements TableBroadcaster {

    private final SimpMessagingTemplate messaging;

    StompTableBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @Override
    public void tableChanged(TableView table, List<PokerSessionEvent> events) {
        messaging.convertAndSend(topic(table.code()), (Object) Map.of(
                "kind", "table",
                "table", table,
                "events", events.stream().map(EventMessage::of).toList()));
    }

    @Override
    public void presenceChanged(SessionCode code, Set<String> onlineParticipantIds) {
        messaging.convertAndSend(topic(code.value()), (Object) Map.of("kind", "presence", "online", onlineParticipantIds));
    }

    @Override
    public void effect(SessionCode code, EffectView effect) {
        messaging.convertAndSend(topic(code.value()), (Object) Map.of("kind", "effect", "effect", effect));
    }

    static String topic(String code) {
        return "/topic/tables/" + code;
    }
}
