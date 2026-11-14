package com.planningpoker.estimation.interfaces.rest;

import com.planningpoker.estimation.application.TableNotFound;
import com.planningpoker.estimation.domain.model.ConcurrentModification;
import com.planningpoker.estimation.domain.model.NotPermitted;
import com.planningpoker.sharedkernel.domain.DomainRuleViolation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Turns domain language failures into friendly HTTP problems the UI can show as-is. */
@RestControllerAdvice
class ApiErrors {

    @ExceptionHandler(TableNotFound.class)
    ProblemDetail notFound(TableNotFound e) {
        return problem(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler({NotPermitted.class, MissingRequestHeaderException.class})
    ProblemDetail forbidden(Exception e) {
        return problem(HttpStatus.FORBIDDEN, e instanceof NotPermitted ? e.getMessage() : "Take a seat first");
    }

    @ExceptionHandler(DomainRuleViolation.class)
    ProblemDetail rule(DomainRuleViolation e) {
        return problem(HttpStatus.UNPROCESSABLE_CONTENT, e.getMessage());
    }

    @ExceptionHandler(ConcurrentModification.class)
    ProblemDetail conflict(ConcurrentModification e) {
        return problem(HttpStatus.CONFLICT, "The table was busy, please try again");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail invalid(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + " " + error.getDefaultMessage())
                .orElse("Invalid request");
        return problem(HttpStatus.BAD_REQUEST, message);
    }

    private static ProblemDetail problem(HttpStatus status, String message) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(status, message);
        detail.setTitle(status.getReasonPhrase());
        return detail;
    }
}
