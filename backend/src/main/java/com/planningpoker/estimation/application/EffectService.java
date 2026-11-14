package com.planningpoker.estimation.application;

import com.planningpoker.estimation.application.command.Actor;
import com.planningpoker.estimation.application.command.SendEffect;
import com.planningpoker.estimation.application.port.TableBroadcaster;
import com.planningpoker.estimation.application.view.EffectView;
import com.planningpoker.estimation.domain.model.*;
import com.planningpoker.sharedkernel.domain.DomainRuleViolation;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fun, ephemeral interactions (cheering, throwing a paper plane at a colleague who has not voted yet).
 * They change nothing in the model, so nothing is persisted; they are only validated and relayed.
 */
public class EffectService {

    static final Set<String> ALLOWED_EMOJI = Set.of(
            "🎉", "👏", "🔥", "🤔", "😂", "😮", "❤️", "🚀", "☕", "💯", "🙌", "🤯",
            "✈️", "🍅", "🌸", "⭐", "🎯", "🐢");
    private static final Set<String> KINDS = Set.of("cheer", "throw");
    private static final int BURST = 8;
    private static final long WINDOW_MILLIS = 3_000;

    private final PokerSessionRepository sessions;
    private final TableBroadcaster broadcaster;
    private final Clock clock;
    private final Map<String, Deque<Long>> recent = new ConcurrentHashMap<>();

    public EffectService(PokerSessionRepository sessions, TableBroadcaster broadcaster, Clock clock) {
        this.sessions = sessions;
        this.broadcaster = broadcaster;
        this.clock = clock;
    }

    public void send(Actor actor, SendEffect effect) {
        if (!KINDS.contains(effect.kind()) || !ALLOWED_EMOJI.contains(effect.emoji())) {
            throw new DomainRuleViolation("That effect is not in the box");
        }
        SessionCode code = new SessionCode(actor.code());
        PokerSession session = sessions.findByCode(code).orElseThrow(() -> new TableNotFound(code.value()));
        Participant me = session.authenticate(ParticipantId.of(actor.participantId()), actor.accessKey());
        String target = null;
        if ("throw".equals(effect.kind())) {
            ParticipantId targetId = ParticipantId.of(effect.targetId());
            session.findParticipant(targetId).orElseThrow(() -> new DomainRuleViolation("Nobody sits there"));
            target = targetId.value().toString();
        }
        if (!withinRate(me.id())) {
            return; // silently drop spam; the UI already played it locally
        }
        broadcaster.effect(code, new EffectView(effect.kind(), me.id().value().toString(), target, effect.emoji(),
                clock.millis()));
    }

    private boolean withinRate(ParticipantId participantId) {
        long now = clock.millis();
        Deque<Long> times = recent.computeIfAbsent(participantId.value().toString(), ignored -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && now - times.peekFirst() > WINDOW_MILLIS) {
                times.pollFirst();
            }
            if (times.size() >= BURST) {
                return false;
            }
            times.addLast(now);
            return true;
        }
    }
}
