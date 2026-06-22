package com.qrorder.controller;

import com.qrorder.dto.payment.CreatePaymentRequestBody;
import com.qrorder.dto.payment.PaymentHistoryResponse;
import com.qrorder.dto.payment.PaymentRequestResponse;
import com.qrorder.dto.payment.PaymentResponse;
import com.qrorder.entity.enums.PaymentMethod;
import com.qrorder.service.PaymentRequestService;
import com.qrorder.service.PaymentService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/payments")

@RequiredArgsConstructor

public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentRequestService paymentRequestService;

    @GetMapping("/{sessionId}")
    public PaymentResponse getBill(
            @PathVariable Long sessionId
    ) {
        return paymentService.getBill(sessionId);
    }

    /**
     * [DEPRECATED] — kept for backward-compat, cũ (đóng session ngay).
     * Sẽ không sử dụng nữa khi frontend hoàn toàn chuyển sang /payments/request.
     */
    @PostMapping("/{sessionId}")
    public Map<String, String> payment(
            @PathVariable Long sessionId,
            @RequestParam(required = false, defaultValue = "CASH") PaymentMethod paymentMethod
    ) {
        paymentService.payment(sessionId, paymentMethod);
        return Map.of("message", "Payment success");
    }

    /**
     * [NEW] Khách gửi yêu cầu thanh toán.
     * Không đóng session — chỉ tạo PaymentRequest PENDING để Cashier xác nhận.
     */
    @PostMapping("/request")
    public ResponseEntity<?> createPaymentRequest(@RequestBody CreatePaymentRequestBody body) {
        try {
            PaymentMethod method = PaymentMethod.valueOf(
                    body.getPaymentMethod() != null ? body.getPaymentMethod().toUpperCase() : "CASH"
            );
            PaymentRequestResponse response = paymentRequestService.createRequest(
                    body.getSessionId(), method, false
            );
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Yêu cầu thanh toán đã được gửi. Vui lòng chờ thu ngân xác nhận.",
                    "requestId", response.getId()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Kiểm tra session có PENDING payment request chưa.
     */
    @GetMapping("/request/status")
    public Map<String, Boolean> checkPendingRequest(@RequestParam Long sessionId) {
        return Map.of("hasPending", paymentRequestService.hasPendingRequest(sessionId));
    }

    @GetMapping("/history")
    public List<PaymentHistoryResponse> getPaymentHistory() {
        return paymentService.getPaymentHistory();
    }

    @GetMapping("/history/{paymentId}")
    public PaymentHistoryResponse getPaymentDetail(@PathVariable Long paymentId) {
        return paymentService.getPaymentDetail(paymentId);
    }
}
