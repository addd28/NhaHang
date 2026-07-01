package com.qrorder.controller;

import com.qrorder.dto.payment.PaymentRequestResponse;
import com.qrorder.entity.User;
import com.qrorder.repository.UserRepository;
import com.qrorder.service.PaymentRequestService;
import com.qrorder.service.TableSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cashier")
@RequiredArgsConstructor
public class CashierController {

    private final TableSessionService tableSessionService;
    private final PaymentRequestService paymentRequestService;
    private final UserRepository userRepository;

    /**
     * Đóng phiên thủ công (Waiter / Cashier / Admin đóng không qua payment request).
     */
    @PostMapping("/close-session/{sessionId}")
    public ResponseEntity<?> closeSession(@PathVariable Long sessionId) {
        try {
            Long userId = getCurrentUserId();
            tableSessionService.closeSession(sessionId, userId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Danh sách yêu cầu thanh toán đang PENDING.
     */
    @GetMapping("/payment-requests")
    public ResponseEntity<List<PaymentRequestResponse>> getPendingPaymentRequests() {
        List<PaymentRequestResponse> list = paymentRequestService.getPendingRequests();
        return ResponseEntity.ok(list);
    }

    /**
     * Cashier xác nhận đã nhận tiền → tạo Payment, đóng session, giải phóng bàn.
     */
    @PostMapping("/payment-requests/{id}/confirm")
    public ResponseEntity<?> confirmPaymentRequest(@PathVariable Long id) {
        try {
            Long userId = getCurrentUserId();
            PaymentRequestResponse response = paymentRequestService.confirmRequest(id, userId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Xác nhận thanh toán thành công. Bàn đã được giải phóng.",
                    "data", response
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            User user = userRepository.findByUsername(auth.getName()).orElse(null);
            if (user != null) return user.getId();
        }
        return null;
    }
}
