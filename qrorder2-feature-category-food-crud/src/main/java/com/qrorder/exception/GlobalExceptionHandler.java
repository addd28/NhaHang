package com.qrorder.exception;

import jakarta.validation.ConstraintViolationException;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(CheckInException.class)
    public ResponseEntity<?> handleCheckInException(CheckInException e) {
        log.warn("CheckInException: {}", e.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("error", e.getErrorCode());
        error.put("message", e.getMessage());
        return ResponseEntity.status(e.getStatus()).body(error);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<?> handleBusinessException(BusinessException e) {
        log.warn("BusinessException [{}]: {}", e.getErrorCode(), e.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("error", e.getErrorCode());
        error.put("message", e.getMessage());
        error.put("timestamp", LocalDateTime.now());
        return ResponseEntity.status(e.getStatus()).body(error);
    }

    /** Handle JPA commit/rollback failures (TransactionSystemException wraps root cause) */
    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<?> handleTransactionSystemException(TransactionSystemException e) {
        log.error("TransactionSystemException occurred", e);
        Throwable root = e.getRootCause();
        String message = root != null ? root.getMessage() : e.getMessage();
        Map<String, Object> error = new HashMap<>();
        error.put("error", "TRANSACTION_ERROR");
        error.put("message", message);
        error.put("timestamp", LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    /** Handle database constraint violations (unique key, FK, NOT NULL at DB level) */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        log.error("DataIntegrityViolationException occurred", e);
        String message = e.getMostSpecificCause().getMessage();
        if (message != null && message.contains("Duplicate entry")) {
            message = "Tên món ăn đã tồn tại, vui lòng chọn tên khác.";
        }
        Map<String, Object> error = new HashMap<>();
        error.put("error", "DATA_INTEGRITY_ERROR");
        error.put("message", message);
        error.put("timestamp", LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(MethodArgumentNotValidException e) {
        log.warn("Validation failed for request");
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
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<?> handleConstraintViolation(ConstraintViolationException e) {
        log.warn("ConstraintViolationException: {}", e.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("message", e.getMessage());
        error.put("timestamp", LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(RuntimeException e) {
        log.error("RuntimeException occurred", e);
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("message", e.getMessage());
        error.put("timestamp", LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(Exception e) {
        log.error("Exception occurred: Update menu failed", e);
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("message", "Internal server error: " + e.getMessage());
        error.put("timestamp", LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}