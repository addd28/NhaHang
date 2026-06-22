package com.qrorder.service.impl;

import com.qrorder.entity.RestaurantTable;
import com.qrorder.entity.TableSession;
import com.qrorder.entity.OrderItem;
import com.qrorder.entity.enums.SessionStatus;
import com.qrorder.entity.enums.TableStatus;
import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.repository.RestaurantTableRepository;
import com.qrorder.repository.TableSessionRepository;
import com.qrorder.repository.OrderItemRepository;
import com.qrorder.service.TableSessionService;

import jakarta.transaction.Transactional;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor

public class TableSessionServiceImpl
        implements TableSessionService {

    private final TableSessionRepository sessionRepository;

    private final RestaurantTableRepository tableRepository;

    private final OrderItemRepository orderItemRepository;

    @Transactional
    @Override
    public TableSession openSession(
            Long tableId
    ) {
        return openSession(tableId, null);
    }

    @Transactional
    @Override
    public TableSession openSession(
            Long tableId,
            Long userId
    ) {

        RestaurantTable table =
                tableRepository
                        .findById(tableId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Table not found"
                                )
                        );

        // Guard 1: Bàn phải ở trạng thái EMPTY mới có thể mở
        if (table.getStatus() != TableStatus.EMPTY) {
            throw new RuntimeException(
                    "TABLE_NOT_AVAILABLE: Bàn không ở trạng thái sẵn sàng để mở."
            );
        }

        // Guard 2: Không cho phép tạo nhiều session OPEN cho cùng một bàn
        Optional<TableSession> existingSession =
                sessionRepository
                        .findByTableIdAndStatus(
                                tableId,
                                SessionStatus.OPEN
                        );

        if (existingSession.isPresent()) {
            throw new RuntimeException(
                    "SESSION_ALREADY_OPEN: Bàn này đã có phiên đang mở."
            );
        }

        table.setStatus(
                TableStatus.OCCUPIED
        );

        tableRepository.save(
                table
        );

        LocalDateTime now = LocalDateTime.now();
        TableSession session =

                TableSession.builder()

                        .table(table)

                        .branch(table.getBranch())

                        .startTime(now)

                        .status(
                                SessionStatus.OPEN
                        )

                        .openedByUserId(userId)

                        .openedAt(now)

                        .build();

        return sessionRepository.save(
                session
        );
    }


    @Override
    @Transactional
    public TableSession getActiveSession(

            Long tableId
    ) {

        return sessionRepository
                .findFirstByTableIdAndStatus(

                        tableId,

                        SessionStatus.OPEN
                )
                .orElseThrow(() ->

                        new RuntimeException(
                                "No active session"
                        )
                );
    }



    @Override
    @Transactional
    public void closeSession(Long sessionId) {
        closeSession(sessionId, null);
    }

    @Override
    @Transactional
    public void closeSession(Long sessionId, Long userId) {
        TableSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        List<OrderItem> items = orderItemRepository.findByOrder_Session_Id(sessionId);
        double subtotal = 0;
        for (OrderItem item : items) {
            OrderItemStatus status = item.getStatus();
            if (status != OrderItemStatus.SERVED && status != OrderItemStatus.CANCELLED && status != OrderItemStatus.WASTED) {
                throw new RuntimeException("Còn món chưa được phục vụ hoặc chưa xử lý xong");
            }
            if (status == OrderItemStatus.SERVED) {
                subtotal += item.getPrice() * item.getQuantity();
            }
        }

        double serviceCharge = 0;
        double taxAmount = 0;
        double discountAmount = 0;
        double finalAmount = subtotal + serviceCharge + taxAmount - discountAmount;

        session.setSubtotal(subtotal);
        session.setServiceCharge(serviceCharge);
        session.setTaxAmount(taxAmount);
        session.setDiscountAmount(discountAmount);
        session.setFinalAmount(finalAmount);

        LocalDateTime now = LocalDateTime.now();
        session.setStatus(SessionStatus.CLOSED);
        session.setEndTime(now);
        session.setClosedByUserId(userId);
        session.setClosedAt(now);
        sessionRepository.save(session);

        RestaurantTable table = session.getTable();
        if (table != null) {
            table.setStatus(TableStatus.EMPTY);
            tableRepository.save(table);
        }
    }
}

