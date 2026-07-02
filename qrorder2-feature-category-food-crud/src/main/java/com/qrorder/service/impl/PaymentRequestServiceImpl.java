package com.qrorder.service.impl;

import com.qrorder.dto.payment.PaymentRequestResponse;
import com.qrorder.entity.*;
import com.qrorder.entity.enums.*;
import com.qrorder.repository.*;
import com.qrorder.service.PaymentRequestService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import com.qrorder.exception.BusinessException;
import org.springframework.http.HttpStatus;

@Service
@RequiredArgsConstructor
public class PaymentRequestServiceImpl implements PaymentRequestService {

    private final PaymentRequestRepository paymentRequestRepository;
    private final TableSessionRepository sessionRepository;
    private final PaymentRepository paymentRepository;
    private final RestaurantTableRepository tableRepository;
    private final ReservationRepository reservationRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @org.springframework.beans.factory.annotation.Value("${payment.bank.code}")
    private String bankCode;

    @org.springframework.beans.factory.annotation.Value("${payment.bank.name}")
    private String bankName;

    @org.springframework.beans.factory.annotation.Value("${payment.bank.account}")
    private String bankAccount;

    @org.springframework.beans.factory.annotation.Value("${payment.bank.owner}")
    private String bankOwner;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private com.qrorder.service.TableService tableService;

    @Override
    @Transactional
    public PaymentRequestResponse createRequest(Long sessionId, PaymentMethod method, boolean alreadyPaid) {

        TableSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() != SessionStatus.OPEN) {
            throw new RuntimeException("Session is not open");
        }

        // Guard: chỉ cho phép 1 yêu cầu PENDING mỗi lúc
        if (paymentRequestRepository.existsBySessionIdAndStatus(sessionId, PaymentRequestStatus.PENDING)) {
            throw new RuntimeException("PENDING_ALREADY_EXISTS: Đã có yêu cầu thanh toán đang chờ xác nhận.");
        }

        // Chặn thanh toán nếu còn món chưa phục vụ xong
        List<Order> orders = orderRepository.findBySessionId(sessionId);
        for (Order order : orders) {
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    if (item.getStatus() == OrderItemStatus.WAIT_CONFIRM ||
                            item.getStatus() == OrderItemStatus.PENDING ||
                            item.getStatus() == OrderItemStatus.PREPARING ||
                            item.getStatus() == OrderItemStatus.DONE) {
                        throw new BusinessException(
                                "ORDER_NOT_COMPLETED",
                                "Một số món ăn vẫn chưa được phục vụ. Vui lòng đợi nhân viên mang món đầy đủ trước khi thanh toán.",
                                HttpStatus.BAD_REQUEST
                        );
                    }
                }
            }
        }

        // Tính tổng tiền từ món đã SERVED
        BigDecimal amount = calculateAmount(sessionId);

        String txCode = generateTransactionCode();
        String qr = null;
        if (method == PaymentMethod.QR) {
            try {
                String ownerEncoded = java.net.URLEncoder.encode(bankOwner, "UTF-8");
                qr = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s&accountName=%s",
                        bankCode, bankAccount, amount.longValue(), txCode, ownerEncoded);
            } catch (Exception e) {
                qr = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s",
                        bankCode, bankAccount, amount.longValue(), txCode);
            }
        }

        PaymentRequest request = PaymentRequest.builder()
                .session(session)
                .table(session.getTable())
                .amount(amount)
                .paymentMethod(method)
                .status(PaymentRequestStatus.PENDING)
                .paymentStatus("PENDING")
                .requestedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .expiredAt(LocalDateTime.now().plusMinutes(15))
                .alreadyPaid(alreadyPaid)
                .transactionCode(txCode)
                .bankName(method == PaymentMethod.QR ? bankName : null)
                .bankAccount(method == PaymentMethod.QR ? bankAccount : null)
                .accountName(method == PaymentMethod.QR ? bankOwner : null)
                .transferContent(txCode)
                .qrUrl(qr)
                .build();

        request = paymentRequestRepository.save(request);
        return toResponse(request);
    }

    @Override
    public List<PaymentRequestResponse> getPendingRequests() {
        // Single restaurant: always return all PENDING
        List<PaymentRequest> list = paymentRequestRepository
                .findByStatusOrderByRequestedAtDesc(PaymentRequestStatus.PENDING);
        return list.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PaymentRequestResponse confirmRequest(Long requestId, Long cashierUserId) {

        PaymentRequest pr = paymentRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("PaymentRequest not found"));

        if (pr.getStatus() != PaymentRequestStatus.PENDING) {
            throw new RuntimeException("Request is not in PENDING state");
        }

        TableSession session = pr.getSession();

        // Nếu chưa có Payment (CASH / BANK_TRANSFER) thì tạo mới
        if (!paymentRepository.existsBySessionId(session.getId())) {
            Payment payment = Payment.builder()
                    .session(session)
                    .amount(pr.getAmount().doubleValue())
                    .paidAt(LocalDateTime.now())
                    .paymentMethod(pr.getPaymentMethod())
                    .paymentStatus(PaymentStatus.SUCCESS)
                    .transactionCode(pr.getTransactionCode())
                    .paymentRequestId(pr.getId())
                    .build();
            paymentRepository.save(payment);
        }

        // Tính và lưu tổng hóa đơn vào session
        double finalAmount = pr.getAmount().doubleValue();
        double subtotal = finalAmount / 1.13;
        double serviceCharge = subtotal * 0.05;
        double taxAmount = subtotal * 0.08;

        session.setSubtotal(subtotal);
        session.setServiceCharge(serviceCharge);
        session.setTaxAmount(taxAmount);
        session.setDiscountAmount(0.0);
        session.setFinalAmount(finalAmount);

        // Đóng session
        session.setStatus(SessionStatus.CLOSED);
        session.setEndTime(LocalDateTime.now());
        session.setClosedByUserId(cashierUserId);
        session.setClosedAt(LocalDateTime.now());
        sessionRepository.save(session);

        // Giải phóng bàn
        RestaurantTable table = session.getTable();
        if (table != null) {
            table.setStatus(TableStatus.EMPTY);
            tableRepository.save(table);

            // Hoàn tất reservations SEATED → COMPLETED
            List<Reservation> reservations = reservationRepository.findByTableId(table.getId());
            reservations.forEach(r -> {
                if (r.getStatus() == ReservationStatus.SEATED) {
                    r.setStatus(ReservationStatus.COMPLETED);
                }
            });
            reservationRepository.saveAll(reservations);
            // Waitlist promotion removed
        }

        // Cập nhật PaymentRequest
        pr.setStatus(PaymentRequestStatus.CONFIRMED);
        pr.setPaymentStatus("SUCCESS");
        pr.setConfirmedAt(LocalDateTime.now());
        pr.setConfirmedByUserId(cashierUserId);

        String cashierUsername = "System";
        if (cashierUserId != null) {
            cashierUsername = userRepository.findById(cashierUserId)
                    .map(User::getUsername)
                    .orElse("System");
        }
        pr.setConfirmedBy(cashierUsername);

        pr = paymentRequestRepository.save(pr);

        return toResponse(pr);
    }

    @Override
    @Transactional
    public PaymentRequestResponse cancelRequest(Long requestId, Long cashierUserId) {
        PaymentRequest pr = paymentRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("PaymentRequest not found"));

        if (pr.getStatus() != PaymentRequestStatus.PENDING) {
            throw new RuntimeException("Request is not in PENDING state");
        }

        pr.setStatus(PaymentRequestStatus.CANCELLED);
        pr.setPaymentStatus("CANCELLED");
        pr.setConfirmedAt(LocalDateTime.now());
        pr.setConfirmedByUserId(cashierUserId);

        String cashierUsername = "System";
        if (cashierUserId != null) {
            cashierUsername = userRepository.findById(cashierUserId)
                    .map(User::getUsername)
                    .orElse("System");
        }
        pr.setConfirmedBy(cashierUsername);

        pr = paymentRequestRepository.save(pr);
        return toResponse(pr);
    }

    @Override
    public java.util.Optional<PaymentRequestResponse> getActiveRequest(Long sessionId) {
        return paymentRequestRepository.findBySessionIdAndStatus(sessionId, PaymentRequestStatus.PENDING)
                .map(this::toResponse);
    }

    @Override
    public boolean hasPendingRequest(Long sessionId) {
        return paymentRequestRepository.existsBySessionIdAndStatus(sessionId, PaymentRequestStatus.PENDING);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private synchronized String generateTransactionCode() {
        java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd");
        String dateStr = LocalDateTime.now().format(dtf);
        String prefix = "PAY-" + dateStr + "-";

        String maxCode = paymentRequestRepository.findMaxTransactionCodeByPrefix(prefix + "%");
        int nextSeq = 1;
        if (maxCode != null && maxCode.length() > prefix.length()) {
            try {
                String seqStr = maxCode.substring(prefix.length());
                nextSeq = Integer.parseInt(seqStr) + 1;
            } catch (Exception e) {
                // ignore
            }
        }

        return prefix + String.format("%04d", nextSeq);
    }

    private BigDecimal calculateAmount(Long sessionId) {
        List<Order> orders = orderRepository.findBySessionId(sessionId);
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
        return BigDecimal.valueOf(subtotal + serviceCharge + taxAmount);
    }

    private PaymentRequestResponse toResponse(PaymentRequest pr) {
        return PaymentRequestResponse.builder()
                .id(pr.getId())
                .sessionId(pr.getSession() != null ? pr.getSession().getId() : null)
                .tableNumber(pr.getTable() != null ? pr.getTable().getTableNumber() : null)
                .amount(pr.getAmount())
                .paymentMethod(pr.getPaymentMethod() != null ? pr.getPaymentMethod().name() : null)
                .status(pr.getStatus() != null ? pr.getStatus().name() : null)
                .requestedAt(pr.getRequestedAt())
                .confirmedAt(pr.getConfirmedAt())
                .confirmedByUserId(pr.getConfirmedByUserId())
                .alreadyPaid(pr.isAlreadyPaid())
                .transactionCode(pr.getTransactionCode())
                .paymentStatus(pr.getPaymentStatus())
                .bankName(pr.getBankName())
                .bankAccount(pr.getBankAccount())
                .accountName(pr.getAccountName())
                .qrUrl(pr.getQrUrl())
                .transferContent(pr.getTransferContent())
                .createdAt(pr.getCreatedAt())
                .expiredAt(pr.getExpiredAt())
                .confirmedBy(pr.getConfirmedBy())
                .build();
     }

    @Override
    public PaymentRequestResponse getRequest(Long id) {
        return paymentRequestRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("PaymentRequest not found"));
    }
}
