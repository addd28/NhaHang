package com.qrorder.controller;

import com.qrorder.dto.order.response.OrderItemResponse;
import com.qrorder.entity.OrderItem;
import com.qrorder.entity.OrderItemOption;
import com.qrorder.entity.RestaurantTable;
import com.qrorder.entity.TableSession;
import com.qrorder.entity.Payment;
import com.qrorder.entity.enums.MenuItemType;
import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.entity.enums.SessionStatus;
import com.qrorder.entity.enums.TableStatus;
import com.qrorder.repository.OrderItemRepository;
import com.qrorder.repository.OrderRepository;
import com.qrorder.repository.RestaurantTableRepository;
import com.qrorder.repository.TableSessionRepository;
import com.qrorder.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RestApiController {

    private final OrderItemRepository orderItemRepository;
    private final TableSessionRepository sessionRepository;
    private final RestaurantTableRepository tableRepository;
    private final PaymentRepository paymentRepository;
    private final com.qrorder.repository.UserRepository userRepository;

    // 1. GET /kitchen/orders
    @GetMapping("/kitchen/orders")
    public List<Map<String, Object>> getKitchenOrders() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long userBranchId = null;
        if (auth != null && auth.isAuthenticated()) {
            com.qrorder.entity.User user = userRepository.findByUsername(auth.getName()).orElse(null);
            if (user != null && user.getBranch() != null) {
                userBranchId = user.getBranch().getId();
            }
        }

        final Long filterBranchId = userBranchId;
        List<OrderItem> items = new ArrayList<>(orderItemRepository.findKitchenOrderItems(
                MenuItemType.KITCHEN,
                List.of(OrderItemStatus.PENDING, OrderItemStatus.PREPARING),
                filterBranchId
        ));

        // Sort: newest order ID first (descending), then newest item ID first (descending)
        items.sort((a, b) -> {
            int orderCompare = Long.compare(b.getOrder().getId(), a.getOrder().getId());
            if (orderCompare != 0) return orderCompare;
            return Long.compare(b.getId(), a.getId());
        });

        return items.stream().map(item -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("itemId", item.getId());
            map.put("orderId", item.getOrder().getId());
            map.put("menuItemId", item.getMenuItem().getId());
            map.put("menuItemName", item.getMenuItemName() != null ? item.getMenuItemName() : item.getMenuItem().getName());
            map.put("quantity", item.getQuantity());
            map.put("note", item.getNote());
            map.put("status", item.getStatus().name());
            map.put("options", item.getOptions() != null ?
                    item.getOptions().stream().map(OrderItemOption::getOptionName).toList() :
                    List.of());
            return map;
        }).collect(Collectors.toList());
    }

    // 2. GET /service/tables
    @GetMapping("/service/tables")
    public List<Map<String, Object>> getServiceTables() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long userBranchId = null;
        if (auth != null && auth.isAuthenticated()) {
            com.qrorder.entity.User user = userRepository.findByUsername(auth.getName()).orElse(null);
            if (user != null && user.getBranch() != null) {
                userBranchId = user.getBranch().getId();
            }
        }

        final Long filterBranchId = userBranchId;
        List<TableSession> openSessions = sessionRepository.findOpenSessionsWithTables(SessionStatus.OPEN, filterBranchId);
        if (openSessions.isEmpty()) {
            return List.of();
        }

        List<Long> sessionIds = openSessions.stream().map(TableSession::getId).toList();
        List<OrderItem> allItems = orderItemRepository.findByOrder_Session_IdIn(sessionIds);
        Map<Long, List<OrderItem>> itemsBySession = allItems.stream()
                .collect(Collectors.groupingBy(oi -> oi.getOrder().getSession().getId()));

        List<Map<String, Object>> result = new ArrayList<>();

        for (TableSession session : openSessions) {
            RestaurantTable table = session.getTable();
            List<OrderItem> sessionItems = itemsBySession.getOrDefault(session.getId(), List.of());
            List<OrderItem> matchingItems = sessionItems.stream()
                    .filter(item -> item.getStatus() == OrderItemStatus.DONE)
                    .toList();

            if (!matchingItems.isEmpty()) {
                Map<String, Object> tableMap = new LinkedHashMap<>();
                tableMap.put("tableId", table.getId());
                tableMap.put("tableNumber", table.getTableNumber());
                tableMap.put("tableStatus", table.getStatus().name());
                tableMap.put("sessionId", session.getId());

                List<Map<String, Object>> itemsList = matchingItems.stream().map(item -> {
                    Map<String, Object> itemMap = new LinkedHashMap<>();
                    itemMap.put("itemId", item.getId());
                    itemMap.put("menuItemName", item.getMenuItemName() != null ? item.getMenuItemName() : item.getMenuItem().getName());
                    itemMap.put("type", item.getMenuItem().getType().name());
                    itemMap.put("status", item.getStatus().name());
                    itemMap.put("note", item.getNote());
                    itemMap.put("options", item.getOptions() != null ?
                            item.getOptions().stream().map(OrderItemOption::getOptionName).toList() :
                            List.of());
                    return itemMap;
                }).collect(Collectors.toList());

                tableMap.put("items", itemsList);
                result.add(tableMap);
            }
        }

        return result;
    }

    // 3. GET /orders/session/{sessionId}
    @GetMapping("/orders/session/{sessionId}")
    public ResponseEntity<?> getOrdersBySessionTracking(@PathVariable Long sessionId) {
        Optional<TableSession> sessionOpt = sessionRepository.findById(sessionId);
        if (sessionOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Session not found"));
        }
        TableSession session = sessionOpt.get();
        if (session.getStatus() != SessionStatus.OPEN) {
            return ResponseEntity.badRequest().body(Map.of("message", "Session is closed"));
        }

        List<OrderItemResponse> itemsList = new ArrayList<>();
        List<OrderItem> allItems = orderItemRepository.findByOrder_Session_Id(sessionId);
        for (OrderItem item : allItems) {
            java.time.Duration duration = null;
            if (item.getOrderedTime() != null) {
                if (item.getServedTime() != null) {
                    duration = java.time.Duration.between(item.getOrderedTime(), item.getServedTime());
                } else if (item.getDeliveringTime() != null) {
                    duration = java.time.Duration.between(item.getOrderedTime(), item.getDeliveringTime());
                } else if (item.getDoneTime() != null) {
                    duration = java.time.Duration.between(item.getOrderedTime(), item.getDoneTime());
                } else if (item.getPreparingTime() != null) {
                    duration = java.time.Duration.between(item.getOrderedTime(), java.time.LocalDateTime.now());
                }
            }
            String durationStr = "N/A";
            if (duration != null) {
                long seconds = duration.getSeconds();
                if (seconds < 60) {
                    durationStr = seconds + "s";
                } else {
                    durationStr = (seconds / 60) + "m " + (seconds % 60) + "s";
                }
            }

            itemsList.add(OrderItemResponse.builder()
                    .itemId(item.getId())
                    .menuItemId(item.getMenuItem().getId())
                    .menuItemName(item.getMenuItemName() != null ? item.getMenuItemName() : item.getMenuItem().getName())
                    .type(item.getMenuItem().getType().name())
                    .quantity(item.getQuantity())
                    .note(item.getNote())
                    .status(item.getStatus().name())
                    .price(item.getPrice())
                    .options(item.getOptions() != null ?
                            item.getOptions().stream().map(OrderItemOption::getOptionName).toList() :
                            List.of())
                    .orderedTime(item.getOrderedTime())
                    .preparingTime(item.getPreparingTime())
                    .doneTime(item.getDoneTime())
                    .deliveringTime(item.getDeliveringTime())
                    .servedTime(item.getServedTime())
                    .totalPreparationDuration(durationStr)
                    .build());
        }
        return ResponseEntity.ok(itemsList);
    }

    // 4. GET /cashier/sessions
    @GetMapping("/cashier/sessions")
    public List<Map<String, Object>> getCashierSessions() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long userBranchId = null;
        if (auth != null && auth.isAuthenticated()) {
            boolean isBranchManager = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_BRANCH_MANAGER"));
            if (isBranchManager) {
                com.qrorder.entity.User user = userRepository.findByUsername(auth.getName()).orElse(null);
                if (user != null && user.getBranch() != null) {
                    userBranchId = user.getBranch().getId();
                }
            }
        }

        final Long filterBranchId = userBranchId;
        List<TableSession> sessions = sessionRepository.findOpenSessionsWithTables(SessionStatus.OPEN, filterBranchId);
        if (sessions.isEmpty()) {
            return List.of();
        }

        List<Long> sessionIds = sessions.stream().map(TableSession::getId).toList();
        List<OrderItem> allItems = orderItemRepository.findByOrder_Session_IdIn(sessionIds);
        Map<Long, List<OrderItem>> itemsBySession = allItems.stream()
                .collect(Collectors.groupingBy(oi -> oi.getOrder().getSession().getId()));

        List<Payment> payments = paymentRepository.findBySessionIdIn(sessionIds);
        Map<Long, Payment> paymentBySessionId = payments.stream()
                .collect(Collectors.toMap(p -> p.getSession().getId(), p -> p, (p1, p2) -> p1));

        return sessions.stream().map(session -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("sessionId", session.getId());
            map.put("tableNumber", session.getTable().getTableNumber());
            map.put("branchId", session.getBranch() != null ? session.getBranch().getId() : null);
            map.put("branchName", session.getBranch() != null ? session.getBranch().getName() : null);
            map.put("customerName", session.getCustomerName() != null ? session.getCustomerName() : "Customer");
            map.put("startTime", session.getStartTime());
            
            List<OrderItem> sessionItems = itemsBySession.getOrDefault(session.getId(), List.of());
            double subtotal = sessionItems.stream()
                    .filter(item -> item.getStatus() == OrderItemStatus.SERVED)
                    .mapToDouble(item -> item.getPrice() * item.getQuantity())
                    .sum();
            map.put("totalAmount", subtotal);

            Payment payment = paymentBySessionId.get(session.getId());
            if (payment != null) {
                map.put("paymentStatus", payment.getPaymentStatus().name());
                map.put("paymentMethod", payment.getPaymentMethod().name());
            } else {
                map.put("paymentStatus", "UNPAID");
                map.put("paymentMethod", null);
            }
            return map;
        }).collect(Collectors.toList());
    }

    // 5. GET /dashboard/count
    @GetMapping("/dashboard/count")
    public Map<String, Long> getDashboardCount() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long userBranchId = null;
        if (auth != null && auth.isAuthenticated()) {
            com.qrorder.entity.User user = userRepository.findByUsername(auth.getName()).orElse(null);
            if (user != null && user.getBranch() != null) {
                userBranchId = user.getBranch().getId();
            }
        }

        final Long filterBranchId = userBranchId;
        long count = orderItemRepository.countByStatusInAndBranchId(
                List.of(OrderItemStatus.PENDING, OrderItemStatus.PREPARING),
                filterBranchId
        );
        return Map.of("count", count);
    }
}
