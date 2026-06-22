package com.qrorder.controller;

import com.qrorder.entity.TableSession;
import com.qrorder.repository.TableSessionRepository;
import com.qrorder.service.PaypalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Map;

@RestController
@RequestMapping("/payments/paypal")
@RequiredArgsConstructor
public class PaypalController {

    private final PaypalService paypalService;
    private final TableSessionRepository sessionRepository;

    @PostMapping("/create-order/{sessionId}")
    public ResponseEntity<?> createOrder(@PathVariable Long sessionId) {
        try {
            String approvalUrl = paypalService.createOrder(sessionId);
            return ResponseEntity.ok(Map.of("approvalUrl", approvalUrl));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/success")
    public RedirectView successPayment(
            @RequestParam(required = false) String token,
            @RequestParam Long sessionId
    ) {
        try {
            paypalService.captureOrder(token != null ? token : "mock-token", sessionId);
        } catch (Exception e) {
            // Log error, but still redirect
        }

        TableSession session = sessionRepository.findById(sessionId).orElse(null);
        int tableNumber = (session != null && session.getTable() != null) ? session.getTable().getTableNumber() : 1;

        return new RedirectView("http://localhost:8080/customer/menu?table=" + tableNumber + "&payment=success");
    }

    @GetMapping("/cancel")
    public RedirectView cancelPayment(@RequestParam Long sessionId) {
        TableSession session = sessionRepository.findById(sessionId).orElse(null);
        int tableNumber = (session != null && session.getTable() != null) ? session.getTable().getTableNumber() : 1;

        return new RedirectView("http://localhost:8080/customer/menu?table=" + tableNumber + "&payment=cancel");
    }
}
