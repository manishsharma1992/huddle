package com.planningpoker.estimation.infrastructure.transaction;

import com.planningpoker.estimation.application.port.TransactionBoundary;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.function.Supplier;

@Component
class SpringTransactionBoundary implements TransactionBoundary {

    private final TransactionTemplate template;

    SpringTransactionBoundary(TransactionTemplate template) {
        this.template = template;
    }

    @Override
    public <T> T inTransaction(Supplier<T> work) {
        return template.execute(status -> work.get());
    }
}
