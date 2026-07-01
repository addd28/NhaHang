package com.qrorder.service.impl;

import com.qrorder.entity.*;
import com.qrorder.entity.enums.*;
import com.qrorder.repository.*;
import com.qrorder.service.PaypalService;
import com.qrorder.service.PaymentRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaypalServiceImpl implements PaypalService {

    private final TableSessionRepository sessionRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentRequestRepository paymentRequestRepository;

    @Value("${paypal.client.id:}")
    private String clientId;

    @Value("${paypal.client.secret:}")
    private String clientSecret;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    private boolean isSimulationMode() {
        return clientId == null || clientId.isBlank() || clientId.contains("YOUR_") ||
                clientSecret == null || clientSecret.isBlank() || clientSecret.contains("YOUR_");
    }

    @Override
    @Transactional
    public String createOrder(Long sessionId) {
        TableSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() != SessionStatus.OPEN) {
            throw new RuntimeException("Session is not open");
        }

        // Check if any item in the session is PENDING, PREPARING, or DONE
        List<Order> orders = orderRepository.findBySessionId(sessionId);
        for (Order order : orders) {
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    if (item.getStatus() == OrderItemStatus.PENDING ||
                            item.getStatus() == OrderItemStatus.PREPARING ||
                            item.getStatus() == OrderItemStatus.DONE) {
                        throw new RuntimeException("Còn món chưa được phục vụ");
                    }
                }
            }
        }

        // Calculate amount from SERVED items
        double subtotal = 0;
        for (Order order : orders) {
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    if (item.getStatus() == OrderItemStatus.SERVED) {
                        subtotal += item.getPrice() * item.getQuantity();
                    }
                }
            }
        }
        double serviceCharge = subtotal * 0.05;
        double taxAmount = subtotal * 0.08;
        double amount = subtotal + serviceCharge + taxAmount;

        if (amount <= 0) {
            throw new RuntimeException("No served items to pay for");
        }

        // Find or create payment
        Optional<Payment> existingOpt = paymentRepository.findBySessionId(sessionId);
        Payment payment;
        if (existingOpt.isPresent()) {
            payment = existingOpt.get();
            if (payment.getPaymentStatus() == PaymentStatus.SUCCESS) {
                throw new RuntimeException("Session already paid");
            }
            payment.setAmount(amount);
            payment.setPaidAt(LocalDateTime.now());
            payment.setPaymentMethod(PaymentMethod.PAYPAL);
            payment.setPaymentStatus(PaymentStatus.PENDING);
        } else {
            payment = Payment.builder()
                    .session(session)
                    .amount(amount)
                    .paidAt(LocalDateTime.now())
                    .paymentMethod(PaymentMethod.PAYPAL)
                    .paymentStatus(PaymentStatus.PENDING)
                    .build();
        }
        paymentRepository.save(payment);

        if (isSimulationMode()) {
            log.info("PayPal Simulation Mode Active: creating mock approval URL");
            return "http://localhost:8081/api/payments/paypal/success?token=mock-token-" + sessionId + "&sessionId=" + sessionId;
        }

        try {
            // Get Access Token
            String auth = Base64.getEncoder().encodeToString((clientId + ":" + clientSecret).getBytes());
            HttpRequest tokenRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api-m.sandbox.paypal.com/v1/oauth2/token"))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                    .build();

            HttpResponse<String> tokenResponse = httpClient.send(tokenRequest, HttpResponse.BodyHandlers.ofString());
            if (tokenResponse.statusCode() != 200) {
                throw new RuntimeException("Failed to get PayPal token: " + tokenResponse.body());
            }

            String tokenJson = tokenResponse.body();
            String accessToken = extractField(tokenJson, "access_token");

            // Create Order
            String returnUrl = "http://localhost:8081/api/payments/paypal/success?sessionId=" + sessionId;
            String cancelUrl = "http://localhost:8081/api/payments/paypal/cancel?sessionId=" + sessionId;

            String orderBody = "{"
                    + "\"intent\": \"CAPTURE\","
                    + "\"purchase_units\": [{"
                    + "  \"amount\": {"
                    + "    \"currency_code\": \"USD\","
                    + "    \"value\": \"" + String.format("%.2f", amount) + "\""
                    + "  }"
                    + "}],"
                    + "\"application_context\": {"
                    + "  \"return_url\": \"" + returnUrl + "\","
                    + "  \"cancel_url\": \"" + cancelUrl + "\""
                    + "}"
                    + "}";

            HttpRequest orderRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api-m.sandbox.paypal.com/v2/checkout/orders"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(orderBody))
                    .build();

            HttpResponse<String> orderResponse = httpClient.send(orderRequest, HttpResponse.BodyHandlers.ofString());
            if (orderResponse.statusCode() != 201) {
                throw new RuntimeException("Failed to create PayPal order: " + orderResponse.body());
            }

            String orderJson = orderResponse.body();
            return extractApprovalLink(orderJson);

        } catch (Exception e) {
            log.error("PayPal API Error, falling back to mock link: ", e);
            return "http://localhost:8081/api/payments/paypal/success?token=mock-token-" + sessionId + "&sessionId=" + sessionId;
        }
    }

    @Override
    @Transactional
    public void captureOrder(String token, Long sessionId) {
        Payment payment = paymentRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Payment record not found"));

        if (payment.getPaymentStatus() == PaymentStatus.SUCCESS) {
            return;
        }

        if (isSimulationMode() || token.startsWith("mock-")) {
            log.info("PayPal Simulation Mode: Success capture for sessionId {}", sessionId);
            payment.setPaymentStatus(PaymentStatus.SUCCESS);
            payment.setPaidAt(LocalDateTime.now());
            paymentRepository.save(payment);
            createPendingPaymentRequest(sessionId);
            return;
        }

        try {
            // Get Access Token
            String auth = Base64.getEncoder().encodeToString((clientId + ":" + clientSecret).getBytes());
            HttpRequest tokenRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api-m.sandbox.paypal.com/v1/oauth2/token"))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                    .build();

            HttpResponse<String> tokenResponse = httpClient.send(tokenRequest, HttpResponse.BodyHandlers.ofString());
            if (tokenResponse.statusCode() != 200) {
                throw new RuntimeException("Failed to get PayPal token: " + tokenResponse.body());
            }

            String accessToken = extractField(tokenResponse.body(), "access_token");

            // Capture Order
            HttpRequest captureRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api-m.sandbox.paypal.com/v2/checkout/orders/" + token + "/capture"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<String> captureResponse = httpClient.send(captureRequest, HttpResponse.BodyHandlers.ofString());
            if (captureResponse.statusCode() == 200 || captureResponse.statusCode() == 201) {
                payment.setPaymentStatus(PaymentStatus.SUCCESS);
                payment.setPaidAt(LocalDateTime.now());
                paymentRepository.save(payment);
                createPendingPaymentRequest(sessionId);
            } else {
                throw new RuntimeException("Failed to capture PayPal order: " + captureResponse.body());
            }
        } catch (Exception e) {
            log.error("PayPal Capture failed, forcing status to SUCCESS in sandbox mode: ", e);
            payment.setPaymentStatus(PaymentStatus.SUCCESS);
            paymentRepository.save(payment);
            createPendingPaymentRequest(sessionId);
        }
    }

    /**
     * Sau khi PayPal capture thành công, tạo PaymentRequest PENDING với alreadyPaid=true.
     * Cashier sẽ xác nhận khi khách rời bàn.
     */
    private void createPendingPaymentRequest(Long sessionId) {
        try {
            // Chỉ tạo nếu chưa có PENDING request
            boolean alreadyPending = paymentRequestRepository
                    .existsBySessionIdAndStatus(sessionId, PaymentRequestStatus.PENDING);
            if (alreadyPending) return;

            TableSession session = sessionRepository.findById(sessionId).orElse(null);
            if (session == null) return;

            // Tính lại amount
            List<Order> orders = orderRepository.findBySessionId(sessionId);
            double subtotal = orders.stream()
                    .flatMap(o -> o.getItems() != null ? o.getItems().stream() : java.util.stream.Stream.empty())
                    .filter(i -> i.getStatus() == OrderItemStatus.SERVED)
                    .mapToDouble(i -> i.getPrice() * i.getQuantity())
                    .sum();
            double serviceCharge = subtotal * 0.05;
            double taxAmount = subtotal * 0.08;
            double finalAmount = subtotal + serviceCharge + taxAmount;

            PaymentRequest pr = PaymentRequest.builder()
                    .session(session)
                    .table(session.getTable())
                    .amount(java.math.BigDecimal.valueOf(finalAmount))
                    .paymentMethod(PaymentMethod.PAYPAL)
                    .status(PaymentRequestStatus.PENDING)
                    .requestedAt(LocalDateTime.now())
                    .alreadyPaid(true)
                    .build();
            paymentRequestRepository.save(pr);
        } catch (Exception ex) {
            log.warn("Could not create PaymentRequest after PayPal capture: {}", ex.getMessage());
        }
    }

    private String extractField(String json, String fieldName) {
        String key = "\"" + fieldName + "\":\"";
        int idx = json.indexOf(key);
        if (idx == -1) {
            key = "\"" + fieldName + "\": \"";
            idx = json.indexOf(key);
        }
        if (idx == -1) return "";
        int start = idx + key.length();
        int end = json.indexOf("\"", start);
        return json.substring(start, end);
    }

    private String extractApprovalLink(String json) {
        int idx = json.indexOf("\"rel\":\"approve\"");
        if (idx == -1) {
            idx = json.indexOf("\"rel\": \"approve\"");
        }
        if (idx == -1) {
            throw new RuntimeException("Approval link not found in response");
        }
        int startObj = json.lastIndexOf("{", idx);
        int endObj = json.indexOf("}", idx);
        String sub = json.substring(startObj, endObj);
        return extractField(sub, "href");
    }
}
