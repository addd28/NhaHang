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

@Service
@RequiredArgsConstructor
public class PaymentRequestServiceImpl implements PaymentRequestService {

    private final PaymentRequestRepository paymentRequestRepository;
    private final TableSessionRepository sessionRepository;
    private final PaymentRepository paymentRepository;
    private final RestaurantTableRepository tableRepository;
    private final ReservationRepository reservationRepository;
    private final OrderRepository orderRepository;

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

        // Tính tổng tiền từ món đã SERVED
        BigDecimal amount = calculateAmount(sessionId);

        PaymentRequest request = PaymentRequest.builder()
                .session(session)
                .table(session.getTable())
                .branch(session.getBranch())
                .amount(amount)
                .paymentMethod(method)
                .status(PaymentRequestStatus.PENDING)
                .requestedAt(LocalDateTime.now())
                .alreadyPaid(alreadyPaid)
                .build();

        request = paymentRequestRepository.save(request);
        return toResponse(request);
    }

    @Override
    public List<PaymentRequestResponse> getPendingRequests(Long branchId) {
        List<PaymentRequest> list;
        if (branchId != null) {
            list = paymentRequestRepository
                    .findByBranchIdAndStatusOrderByRequestedAtDesc(branchId, PaymentRequestStatus.PENDING);
        } else {
            list = paymentRequestRepository
                    .findByStatusOrderByRequestedAtDesc(PaymentRequestStatus.PENDING);
        }
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
                    .branch(session.getBranch())
                    .amount(pr.getAmount().doubleValue())
                    .paidAt(LocalDateTime.now())
                    .paymentMethod(pr.getPaymentMethod())
                    .paymentStatus(PaymentStatus.SUCCESS)
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

            if (tableService != null) {
                tableService.promoteWaitlist();
            }
        }

        // Cập nhật PaymentRequest
        pr.setStatus(PaymentRequestStatus.CONFIRMED);
        pr.setConfirmedAt(LocalDateTime.now());
        pr.setConfirmedByUserId(cashierUserId);
        pr = paymentRequestRepository.save(pr);

        return toResponse(pr);
    }

    @Override
    public boolean hasPendingRequest(Long sessionId) {
        return paymentRequestRepository.existsBySessionIdAndStatus(sessionId, PaymentRequestStatus.PENDING);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

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
        double finalAmount = subtotal + serviceCharge + taxAmount;
        return BigDecimal.valueOf(finalAmount);
    }

    private PaymentRequestResponse toResponse(PaymentRequest pr) {
        return PaymentRequestResponse.builder()
                .id(pr.getId())
                .sessionId(pr.getSession() != null ? pr.getSession().getId() : null)
                .tableNumber(pr.getTable() != null ? pr.getTable().getTableNumber() : null)
                .branchName(pr.getBranch() != null ? pr.getBranch().getName() : null)
                .amount(pr.getAmount())
                .paymentMethod(pr.getPaymentMethod() != null ? pr.getPaymentMethod().name() : null)
                .status(pr.getStatus() != null ? pr.getStatus().name() : null)
                .requestedAt(pr.getRequestedAt())
                .confirmedAt(pr.getConfirmedAt())
                .confirmedByUserId(pr.getConfirmedByUserId())
                .alreadyPaid(pr.isAlreadyPaid())
                .build();
    }
}
