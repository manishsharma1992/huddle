package com.planningpoker.estimation.application.port;

import java.util.function.Supplier;

/** Runs a unit of work atomically. Implemented by infrastructure. */
public interface TransactionBoundary {
    <T> T inTransaction(Supplier<T> work);
}
