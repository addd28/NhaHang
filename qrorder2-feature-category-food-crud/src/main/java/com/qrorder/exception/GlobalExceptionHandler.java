package com.qrorder.exception;

import jakarta.validation.ConstraintViolationException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CheckInException.class)
    public ResponseEntity<?> handleCheckInException(
            CheckInException e
    ) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", e.getErrorCode());
        error.put("message", e.getMessage());
        return ResponseEntity
                .status(e.getStatus())
                .body(error);
    }

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
        List<Map<String, String>> details = e.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> {
                    Map<String, String> detail = new HashMap<>();
                    detail.put("field", fieldError.getField());
                    detail.put("message", fieldError.getDefaultMessage());
                    return detail;
                })
                .collect(Collectors.toList());

        Map<String, Object> error = new HashMap<>();
        error.put("error", "VALIDATION_ERROR");
        error.put("message", "Validation failed");
        error.put("details", details);
        error.put("timestamp", LocalDateTime.now());

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