package com.qrorder.exception;

import org.springframework.http.HttpStatus;

public class CheckInException extends RuntimeException {
    private final String errorCode;
    private final HttpStatus status;

    public CheckInException(String errorCode, String message, HttpStatus status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
