package com.planningpoker.estimation.application;

public class TableNotFound extends RuntimeException {
    public TableNotFound(String code) {
        super("There is no table with code " + code);
    }
}
