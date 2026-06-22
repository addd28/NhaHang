package com.qrorder.service;

public interface PaypalService {
    String createOrder(Long sessionId);
    void captureOrder(String token, Long sessionId);
}
