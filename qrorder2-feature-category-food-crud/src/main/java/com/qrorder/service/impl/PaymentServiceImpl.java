package com.qrorder.service.impl;

import com.qrorder.dto.payment.PaymentHistoryResponse;
import com.qrorder.dto.payment.PaymentItemResponse;
import com.qrorder.dto.payment.PaymentResponse;
import com.qrorder.entity.*;

import com.qrorder.entity.enums.PaymentMethod;
import com.qrorder.entity.enums.PaymentStatus;
import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.entity.enums.ReservationStatus;
import com.qrorder.entity.enums.SessionStatus;
import com.qrorder.entity.enums.TableStatus;

import com.qrorder.repository.*;

import com.qrorder.service.PaymentService;

import jakarta.transaction.Transactional;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor

public class PaymentServiceImpl
        implements PaymentService {

    private final OrderRepository orderRepository;

    private final TableSessionRepository sessionRepository;

    private final RestaurantTableRepository tableRepository;

    private final ReservationRepository reservationRepository;

    private final PaymentRepository paymentRepository;

    private final com.qrorder.repository.UserRepository userRepository;

    private final OrderItemRepository orderItemRepository;

    @Override
    @Transactional
    public PaymentResponse getBill(
            Long sessionId
    ) {

        TableSession session =

                sessionRepository
                        .findById(sessionId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Session not found"
                                )
                        );

        List<Order> orders =

                orderRepository
                        .findBySessionId(
                                sessionId
                        );

        double totalAmount =

                calculateTotalAmount(
                        orders
                );

        List<PaymentItemResponse> items = getSessionPaymentItems(sessionId);

        return PaymentResponse.builder()

                .sessionId(
                        sessionId
                )

                .items(
                        items
                )

                .totalAmount(
                        totalAmount
                )

                .build();
    }

    private List<PaymentItemResponse> getSessionPaymentItems(Long sessionId) {
        List<OrderItem> items = orderItemRepository.findByOrder_Session_Id(sessionId);
        Map<String, PaymentItemResponse> groupedItems = new LinkedHashMap<>();
        for (OrderItem orderItem : items) {
            if (orderItem.getStatus() == OrderItemStatus.SERVED) {
                Long menuItemId = orderItem.getMenuItem().getId();
                List<String> optNames = orderItem.getOptions() != null ?
                        orderItem.getOptions().stream()
                                .map(opt -> String.format("%s (+$%.2f)", opt.getOptionName(), opt.getOptionPrice()))
                                .sorted().toList() :
                        new ArrayList<>();
                String optionsKey = String.join(",", optNames);
                String groupKey = menuItemId + "_" + optionsKey;

                double unitPrice = orderItem.getPrice();
                PaymentItemResponse existing = groupedItems.get(groupKey);
                if (existing == null) {
                    groupedItems.put(groupKey, PaymentItemResponse.builder()
                            .menuItemName(orderItem.getMenuItemName() != null ? orderItem.getMenuItemName() : orderItem.getMenuItem().getName())
                            .quantity(orderItem.getQuantity())
                            .unitPrice(unitPrice)
                            .subtotal(unitPrice * orderItem.getQuantity())
                            .options(optNames)
                            .build());
                } else {
                    existing.setQuantity(existing.getQuantity() + orderItem.getQuantity());
                    existing.setSubtotal(existing.getSubtotal() + (unitPrice * orderItem.getQuantity()));
                }
            }
        }
        return new ArrayList<>(groupedItems.values());
    }

    private List<PaymentItemResponse> formatSessionPaymentItems(List<OrderItem> items) {
        Map<String, PaymentItemResponse> groupedItems = new LinkedHashMap<>();
        for (OrderItem orderItem : items) {
            if (orderItem.getStatus() == OrderItemStatus.SERVED) {
                Long menuItemId = orderItem.getMenuItem().getId();
                List<String> optNames = orderItem.getOptions() != null ?
                        orderItem.getOptions().stream()
                                .map(opt -> String.format("%s (+$%.2f)", opt.getOptionName(), opt.getOptionPrice()))
                                .sorted().toList() :
                        new ArrayList<>();
                String optionsKey = String.join(",", optNames);
                String groupKey = menuItemId + "_" + optionsKey;

                double unitPrice = orderItem.getPrice();
                PaymentItemResponse existing = groupedItems.get(groupKey);
                if (existing == null) {
                    groupedItems.put(groupKey, PaymentItemResponse.builder()
                            .menuItemName(orderItem.getMenuItemName() != null ? orderItem.getMenuItemName() : orderItem.getMenuItem().getName())
                            .quantity(orderItem.getQuantity())
                            .unitPrice(unitPrice)
                            .subtotal(unitPrice * orderItem.getQuantity())
                            .options(optNames)
                            .build());
                } else {
                    existing.setQuantity(existing.getQuantity() + orderItem.getQuantity());
                    existing.setSubtotal(existing.getSubtotal() + (unitPrice * orderItem.getQuantity()));
                }
            }
        }
        return new ArrayList<>(groupedItems.values());
    }


    @Override
    @Transactional
    public void payment(

            Long sessionId,
            PaymentMethod paymentMethod
    ) {

        TableSession session =

                sessionRepository
                        .findByIdAndStatus(

                                sessionId,

                                SessionStatus.OPEN
                        )
                        .orElseThrow(() ->

                                new RuntimeException(
                                        "Session not found or already closed"
                                )
                        );

        if (paymentRepository.existsBySessionId(
                sessionId
        )) {

            throw new RuntimeException(
                    "Session already paid"
            );
        }

        List<Order> orders =

                orderRepository
                        .findBySessionId(
                                sessionId
                        );

        if (orders.isEmpty()) {

            throw new RuntimeException(
                    "No orders found"
            );
        }

        for (Order order : orders) {

            for (OrderItem item
                    : order.getItems()) {

                if (item.getStatus() == OrderItemStatus.WAIT_CONFIRM ||
                        item.getStatus() == OrderItemStatus.PENDING ||
                        item.getStatus() == OrderItemStatus.PREPARING ||
                        item.getStatus() == OrderItemStatus.DONE) {

                    throw new RuntimeException(
                            "Còn món chưa được phục vụ"
                    );
                }
            }
        }

        double subtotal =

                calculateTotalAmount(
                        orders
                );

        double serviceCharge = 0;

        double taxAmount = 0;

        double discountAmount = 0;

        double finalAmount =

                subtotal
                        + serviceCharge
                        + taxAmount
                        - discountAmount;

        Payment payment =

                Payment.builder()

                        .session(
                                session
                        )

                        .branch(
                                session.getBranch()
                        )

                        .amount(
                                finalAmount
                        )

                        .paidAt(
                                LocalDateTime.now()
                        )

                        .paymentMethod(
                                paymentMethod
                        )

                        .paymentStatus(
                                PaymentStatus.SUCCESS
                        )

                        .build();

        paymentRepository.save(
                payment
        );

        session.setSubtotal(
                subtotal
        );

        session.setServiceCharge(
                serviceCharge
        );

        session.setTaxAmount(
                taxAmount
        );

        session.setDiscountAmount(
                discountAmount
        );

        session.setFinalAmount(
                finalAmount
        );

        if (paymentMethod != PaymentMethod.PAYPAL) {
            session.setStatus(
                    SessionStatus.CLOSED
            );

            session.setEndTime(
                    LocalDateTime.now()
            );

            RestaurantTable table =
                    session.getTable();

            table.setStatus(
                    TableStatus.EMPTY
            );

            List<Reservation> reservations =

                    reservationRepository
                            .findByTableId(
                                    table.getId()
                            );

            reservations.forEach(reservation -> {

                if (reservation.getStatus()
                        == ReservationStatus.SEATED) {

                    reservation.setStatus(
                            ReservationStatus.COMPLETED
                    );
                }
            });

            reservationRepository.saveAll(
                    reservations
            );

            tableRepository.save(
                    table
            );
        }

        sessionRepository.save(
                session
        );
    }

    private double calculateTotalAmount(

            List<Order> orders
    ) {

        double totalAmount = 0;

        for (Order order : orders) {

            for (OrderItem item
                    : order.getItems()) {

                if (item.getStatus()
                        == OrderItemStatus.SERVED) {

                    totalAmount +=

                            item.getPrice()

                                    *

                                    item.getQuantity();
                }
            }
        }

        return totalAmount;
    }

    @Override
    public List<PaymentHistoryResponse>
    getPaymentHistory() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long userBranchId = null;
        if (auth != null && auth.isAuthenticated()) {
            boolean restrictsBranch = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_BRANCH_MANAGER")
                            || a.getAuthority().equals("ROLE_WAITER")
                            || a.getAuthority().equals("ROLE_CASHIER")
                            || a.getAuthority().equals("ROLE_KITCHEN"));
            if (restrictsBranch) {
                com.qrorder.entity.User user = userRepository.findByUsername(auth.getName()).orElse(null);
                if (user != null && user.getBranch() != null) {
                    userBranchId = user.getBranch().getId();
                }
            }
        }

        List<Payment> payments;
        if (userBranchId != null) {
            payments = paymentRepository.findByBranchIdOrderByPaidAtDesc(userBranchId);
        } else {
            payments = paymentRepository.findAllByOrderByPaidAtDesc();
        }

        List<Long> sessionIds = payments.stream()
                .map(p -> p.getSession() != null ? p.getSession().getId() : null)
                .filter(java.util.Objects::nonNull)
                .toList();

        List<OrderItem> allOrderItems = sessionIds.isEmpty() ? List.of() : orderItemRepository.findByOrder_Session_IdIn(sessionIds);
        Map<Long, List<OrderItem>> itemsBySession = allOrderItems.stream()
                .collect(java.util.stream.Collectors.groupingBy(oi -> oi.getOrder().getSession().getId()));

        return payments
                .stream()
                .map(payment ->
                        PaymentHistoryResponse
                                .builder()
                                .paymentId(
                                        payment.getId()
                                )
                                .sessionId(payment.getSession() != null ? payment.getSession().getId() : null)
                                .tableId(payment.getSession() != null && payment.getSession().getTable() != null ? payment.getSession().getTable().getId() : null)
                                .tableNumber(payment.getSession() != null && payment.getSession().getTable() != null ? payment.getSession().getTable().getTableNumber() : null)
                                .amount(
                                        payment.getAmount()
                                )
                                .paidAt(
                                        payment.getPaidAt()
                                )
                                .paymentMethod(
                                        payment.getPaymentMethod() != null ? payment.getPaymentMethod().name() : "CASH"
                                )
                                .paymentStatus(
                                        payment.getPaymentStatus() != null ? payment.getPaymentStatus().name() : "SUCCESS"
                                )
                                .items(
                                        payment.getSession() != null ? formatSessionPaymentItems(itemsBySession.getOrDefault(payment.getSession().getId(), List.of())) : new ArrayList<>()
                                )
                                .build()
                )
                .toList();
    }

    @Override
    public PaymentHistoryResponse
    getPaymentDetail(

            Long paymentId
    ) {

        Payment payment =

                paymentRepository
                        .findById(
                                paymentId
                        )
                        .orElseThrow(() ->

                                new RuntimeException(
                                        "Payment not found"
                                )
                        );

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            boolean restrictsBranch = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_BRANCH_MANAGER")
                            || a.getAuthority().equals("ROLE_WAITER")
                            || a.getAuthority().equals("ROLE_CASHIER")
                            || a.getAuthority().equals("ROLE_KITCHEN"));
            if (restrictsBranch) {
                com.qrorder.entity.User user = userRepository.findByUsername(auth.getName()).orElse(null);
                if (user != null && user.getBranch() != null) {
                    if (payment.getBranch() != null && !payment.getBranch().getId().equals(user.getBranch().getId())) {
                        throw new RuntimeException("Bạn không có quyền truy cập thanh toán của chi nhánh khác!");
                    }
                }
            }
        }

        return PaymentHistoryResponse
                .builder()

                .paymentId(
                        payment.getId()
                )

                .sessionId(payment.getSession() != null ? payment.getSession().getId() : null)

                .tableId(payment.getSession() != null && payment.getSession().getTable() != null ? payment.getSession().getTable().getId() : null)

                .tableNumber(payment.getSession() != null && payment.getSession().getTable() != null ? payment.getSession().getTable().getTableNumber() : null)

                .amount(
                        payment.getAmount()
                )

                .paidAt(
                        payment.getPaidAt()
                )

                .paymentMethod(
                        payment.getPaymentMethod() != null ? payment.getPaymentMethod().name() : "CASH"
                )

                .paymentStatus(
                        payment.getPaymentStatus() != null ? payment.getPaymentStatus().name() : "SUCCESS"
                )

                .items(
                        payment.getSession() != null ? getSessionPaymentItems(payment.getSession().getId()) : new ArrayList<>()
                )

                .build();
    }

}
