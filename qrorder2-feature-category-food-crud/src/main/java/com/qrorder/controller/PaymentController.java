package com.qrorder.controller;

import com.qrorder.dto.payment.CreatePaymentRequestBody;
import com.qrorder.dto.payment.PaymentHistoryResponse;
import com.qrorder.dto.payment.PaymentRequestResponse;
import com.qrorder.dto.payment.PaymentResponse;
import com.qrorder.entity.enums.PaymentMethod;
import com.qrorder.service.PaymentRequestService;
import com.qrorder.service.PaymentService;
import com.qrorder.repository.UserRepository;
import com.qrorder.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

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
    private final UserRepository userRepository;

    @GetMapping("/{id}")
    public ResponseEntity<?> getPaymentOrBill(@PathVariable Long id) {
        try {
            PaymentHistoryResponse paymentDetail = paymentService.getPaymentDetail(id);
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getAuthorities().stream().noneMatch(a -> 
                    a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_CASHIER"))) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body("Access Denied");
            }
            return ResponseEntity.ok(paymentDetail);
        } catch (Exception e) {
            PaymentResponse bill = paymentService.getBill(id);
            return ResponseEntity.ok(bill);
        }
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

    @PostMapping("/request/{sessionId}")
    public ResponseEntity<?> requestPayment(
            @PathVariable Long sessionId,
            @RequestParam(required = false, defaultValue = "QR") String paymentMethod
    ) {
        try {
            PaymentMethod method = PaymentMethod.valueOf(paymentMethod.toUpperCase());
            PaymentRequestResponse response = paymentRequestService.createRequest(sessionId, method, false);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/request/{id}")
    public ResponseEntity<?> getPaymentRequest(@PathVariable Long id) {
        try {
            PaymentRequestResponse response = paymentRequestService.getRequest(id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/confirm/{id}")
    public ResponseEntity<?> confirmPayment(@PathVariable Long id) {
        try {
            Long userId = getCurrentUserId();
            PaymentRequestResponse response = paymentRequestService.confirmRequest(id, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/cancel/{id}")
    public ResponseEntity<?> cancelPayment(@PathVariable Long id) {
        try {
            Long userId = getCurrentUserId();
            PaymentRequestResponse response = paymentRequestService.cancelRequest(id, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Kiểm tra session có PENDING payment request chưa.
     */
    @GetMapping("/request/status")
    public ResponseEntity<?> checkPendingRequest(@RequestParam Long sessionId) {
        java.util.Optional<PaymentRequestResponse> activeOpt = paymentRequestService.getActiveRequest(sessionId);
        if (activeOpt.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "hasPending", true,
                    "request", activeOpt.get()
            ));
        } else {
            return ResponseEntity.ok(Map.of(
                    "hasPending", false
            ));
        }
    }

    @GetMapping("/history")
    public List<PaymentHistoryResponse> getPaymentHistory(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) Double minAmount,
            @RequestParam(required = false) Double maxAmount,
            @RequestParam(required = false) String search
    ) {
        return paymentService.getPaymentHistoryFiltered(startDate, endDate, paymentMethod, paymentStatus, minAmount, maxAmount, search);
    }

    @GetMapping("/history/{paymentId}")
    public PaymentHistoryResponse getPaymentDetail(@PathVariable Long paymentId) {
        return paymentService.getPaymentDetail(paymentId);
    }

    @GetMapping("/statistics")
    public Map<String, Object> getStatistics(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) Double minAmount,
            @RequestParam(required = false) Double maxAmount,
            @RequestParam(required = false) String search
    ) {
        return paymentService.getStatistics(startDate, endDate, paymentMethod, paymentStatus, minAmount, maxAmount, search);
    }

    @GetMapping("/top-items")
    public List<Map<String, Object>> getTopItems(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) Double minAmount,
            @RequestParam(required = false) Double maxAmount,
            @RequestParam(required = false) String search
    ) {
        return paymentService.getTopItems(startDate, endDate, paymentMethod, paymentStatus, minAmount, maxAmount, search);
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) Double minAmount,
            @RequestParam(required = false) Double maxAmount,
            @RequestParam(required = false) String search
    ) {
        byte[] data = paymentService.exportExcel(startDate, endDate, paymentMethod, paymentStatus, minAmount, maxAmount, search);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"payment_history.xlsx\"")
                .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) Double minAmount,
            @RequestParam(required = false) Double maxAmount,
            @RequestParam(required = false) String search
    ) {
        byte[] data = paymentService.exportPdf(startDate, endDate, paymentMethod, paymentStatus, minAmount, maxAmount, search);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"payment_report.pdf\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(data);
    }

    @GetMapping("/{paymentId}/invoice")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable Long paymentId) {
        byte[] data = paymentService.getInvoicePdf(paymentId);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"invoice_" + paymentId + ".pdf\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(data);
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            User user = userRepository.findByUsername(auth.getName()).orElse(null);
            if (user != null) return user.getId();
        }
        return null;
    }
}
