package com.qrorder.exception;

import jakarta.validation.ConstraintViolationException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(
            RuntimeException e
    ) {

        Map<String, Object> error =
                new HashMap<>();

        error.put(
                "success",
                false
        );

        error.put(
                "message",
                e.getMessage()
        );

        error.put(
                "timestamp",
                LocalDateTime.now()
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(
            MethodArgumentNotValidException e
    ) {

        Map<String, Object> error =
                new HashMap<>();

        error.put(
                "success",
                false
        );

        error.put(
                "message",
                e.getBindingResult()
                        .getFieldError()
                        .getDefaultMessage()
        );

        error.put(
                "timestamp",
                LocalDateTime.now()
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(error);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<?> handleConstraintViolation(
            ConstraintViolationException e
    ) {

        Map<String, Object> error =
                new HashMap<>();

        error.put(
                "success",
                false
        );

        error.put(
                "message",
                e.getMessage()
        );

        error.put(
                "timestamp",
                LocalDateTime.now()
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(
            Exception e
    ) {

        e.printStackTrace();
        Map<String, Object> error =
                new HashMap<>();

        error.put(
                "success",
                false
        );

        error.put(
                "message",
                "Internal server error"
        );

        error.put(
                "timestamp",
                LocalDateTime.now()
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error);
    }
}