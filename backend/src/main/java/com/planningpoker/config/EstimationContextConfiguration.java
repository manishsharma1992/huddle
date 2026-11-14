package com.planningpoker.config;

import com.planningpoker.estimation.application.EffectService;
import com.planningpoker.estimation.application.PokerSessionService;
import com.planningpoker.estimation.application.port.PresenceRegistry;
import com.planningpoker.estimation.application.port.TableBroadcaster;
import com.planningpoker.estimation.application.port.TableDirectory;
import com.planningpoker.estimation.application.port.TransactionBoundary;
import com.planningpoker.estimation.domain.model.PokerSessionRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.random.RandomGenerator;

/**
 * Composition root: the domain and application layers are plain Java with no framework annotations,
 * so they are wired together here.
 */
@Configuration(proxyBeanMethods = false)
class EstimationContextConfiguration {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    RandomGenerator secureRandom() {
        return new SecureRandom();
    }

    @Bean
    PokerSessionService pokerSessionService(PokerSessionRepository sessions, TransactionBoundary transactions,
                                            TableBroadcaster broadcaster, PresenceRegistry presence,
                                            TableDirectory directory, Clock clock, RandomGenerator random) {
        return new PokerSessionService(sessions, transactions, broadcaster, presence, directory, clock, random);
    }

    @Bean
    EffectService effectService(PokerSessionRepository sessions, TableBroadcaster broadcaster, Clock clock) {
        return new EffectService(sessions, broadcaster, clock);
    }
}
