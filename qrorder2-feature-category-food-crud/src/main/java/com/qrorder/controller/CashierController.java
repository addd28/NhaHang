package com.qrorder.controller;

import com.qrorder.entity.OrderItem;
import com.qrorder.entity.TableSession;
import com.qrorder.entity.User;
import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.entity.enums.SessionStatus;
import com.qrorder.repository.OrderItemRepository;
import com.qrorder.repository.TableSessionRepository;
import com.qrorder.repository.UserRepository;
import com.qrorder.service.TableSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.hibernate.Hibernate;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/cashier")
@RequiredArgsConstructor
public class CashierController {

    private final TableSessionService tableSessionService;
    private final UserRepository userRepository;
    private final TableSessionRepository sessionRepository;
    private final OrderItemRepository orderItemRepository;

    /**
     * Danh sách bàn gọi nhân viên
     */
    private static final Map<Long, LocalDateTime> activeCalls = new ConcurrentHashMap<>();

    /**
     * Khách gọi nhân viên
     */
    @PostMapping("/call/{sessionId}")
    public ResponseEntity<?> callCashier(@PathVariable Long sessionId) {

        activeCalls.put(sessionId, LocalDateTime.now());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã gọi nhân viên."));
    }

    /**
     * Danh sách các bàn đang gọi
     */
    @Transactional(readOnly = true)
    @GetMapping("/calls")
    public ResponseEntity<?> getCalls() {

        if (activeCalls.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Long> sessionIds = new ArrayList<>(activeCalls.keySet());

        List<TableSession> sessions = sessionRepository.findAllById(sessionIds);

        List<OrderItem> allItems = orderItemRepository.findByOrder_Session_IdIn(sessionIds);

        Map<Long, List<OrderItem>> itemsBySession = allItems.stream()
                .collect(Collectors.groupingBy(
                        item -> item.getOrder().getSession().getId()));

        List<Map<String, Object>> result = sessions.stream()
                .filter(session -> session.getStatus() == SessionStatus.OPEN)
                .map(session -> {

                    Map<String, Object> map = new LinkedHashMap<>();

                    map.put("sessionId", session.getId());

                    map.put("tableId",
                            session.getTable() != null
                                    ? session.getTable().getId()
                                    : null);

                    map.put("tableNumber",
                            session.getTable() != null
                                    ? session.getTable().getTableNumber()
                                    : null);

                    map.put("calledAt",
                            activeCalls.get(session.getId()));

                    List<OrderItem> sessionItems = itemsBySession.getOrDefault(
                            session.getId(),
                            List.of());

                    double subtotal = sessionItems.stream()
                            .filter(item -> item.getStatus() == OrderItemStatus.SERVED)
                            .mapToDouble(item -> item.getPrice() * item.getQuantity())
                            .sum();

                    double serviceCharge = subtotal * 0.05;
                    double vat = subtotal * 0.08;
                    double total = subtotal + serviceCharge + vat;

                    map.put("subtotal", subtotal);
                    map.put("serviceCharge", serviceCharge);
                    map.put("vat", vat);
                    map.put("totalAmount", total);

                    // Chuyển OrderItem thành Map để tránh lỗi Hibernate proxy khi serialize
                    List<Map<String, Object>> itemMaps = sessionItems.stream().map(item -> {
                        Map<String, Object> im = new LinkedHashMap<>();
                        im.put("itemId", item.getId());
                        im.put("menuItemName", item.getMenuItemName());
                        im.put("quantity", item.getQuantity());
                        im.put("price", item.getPrice());
                        im.put("status", item.getStatus() != null ? item.getStatus().name() : null);
                        return im;
                    }).collect(Collectors.toList());
                    map.put("items", itemMaps);

                    return map;

                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Xử lý xong cuộc gọi
     */
    @DeleteMapping("/call/{sessionId}")
    public ResponseEntity<?> clearCall(
            @PathVariable Long sessionId) {

        activeCalls.remove(sessionId);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã xử lý yêu cầu."));
    }

    /**
     * Đóng bàn
     */
    @PostMapping("/close-session/{sessionId}")
    public ResponseEntity<?> closeSession(
            @PathVariable Long sessionId) {

        try {

            Long userId = getCurrentUserId();

            tableSessionService.closeSession(sessionId, userId);

            activeCalls.remove(sessionId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Đóng bàn thành công."));

        } catch (RuntimeException ex) {

            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", ex.getMessage()));

        }

    }

    /**
     * User hiện tại
     */
    private Long getCurrentUserId() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated()) {

            User user = userRepository.findByUsername(authentication.getName())
                    .orElse(null);

            if (user != null) {
                return user.getId();
            }
        }

        return null;
    }

}