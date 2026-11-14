package com.planningpoker.estimation.infrastructure.messaging;

import com.planningpoker.estimation.application.port.PresenceRegistry;
import com.planningpoker.estimation.application.port.TableBroadcaster;
import com.planningpoker.estimation.domain.model.ParticipantId;
import com.planningpoker.estimation.domain.model.SessionCode;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Tracks which participants have the table open, based on WebSocket connections. The browser sends
 * {@code table} and {@code participant} headers when it connects.
 */
@Component
class StompPresenceRegistry implements PresenceRegistry {

    private record Presence(SessionCode code, ParticipantId participant) {
    }

    private final Map<String, Presence> connections = new ConcurrentHashMap<>();
    private final TableBroadcaster broadcaster;

    StompPresenceRegistry(TableBroadcaster broadcaster) {
        this.broadcaster = broadcaster;
    }

    @Override
    public Set<ParticipantId> onlineAt(SessionCode code) {
        return connections.values().stream()
                .filter(presence -> presence.code().equals(code))
                .map(Presence::participant)
                .collect(Collectors.toSet());
    }

    @EventListener
    void onConnect(SessionConnectEvent event) {
        StompHeaderAccessor headers = StompHeaderAccessor.wrap(event.getMessage());
        String table = headers.getFirstNativeHeader("table");
        String participant = headers.getFirstNativeHeader("participant");
        if (table == null || participant == null || headers.getSessionId() == null) {
            return;
        }
        try {
            Presence presence = new Presence(new SessionCode(table), ParticipantId.of(participant));
            connections.put(headers.getSessionId(), presence);
            announce(presence.code());
        } catch (RuntimeException ignored) {
            // malformed headers: just do not track presence for this connection
        }
    }

    @EventListener
    void onDisconnect(SessionDisconnectEvent event) {
        Presence presence = connections.remove(event.getSessionId());
        if (presence != null) {
            announce(presence.code());
        }
    }

    private void announce(SessionCode code) {
        broadcaster.presenceChanged(code, onlineAt(code).stream()
                .map(id -> id.value().toString())
                .collect(Collectors.toSet()));
    }
}
