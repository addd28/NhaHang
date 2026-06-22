package com.qrorder.controller;

import com.qrorder.dto.order.response.OrderItemResponse;
import com.qrorder.entity.OrderItem;
import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.repository.OrderItemRepository;
import com.qrorder.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/waiter")
@RequiredArgsConstructor
public class WaiterController {

    private final OrderService orderService;
    private final OrderItemRepository orderItemRepository;
    private final com.qrorder.repository.UserRepository userRepository;

    @GetMapping("/order-requests")
    public ResponseEntity<List<OrderItemResponse>> getOrderRequests() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long branchId = null;
        if (auth != null && auth.isAuthenticated()) {
            com.qrorder.entity.User user = userRepository.findByUsername(auth.getName()).orElse(null);
            if (user != null && user.getBranch() != null) {
                branchId = user.getBranch().getId();
            }
        }

        List<OrderItem> items = orderItemRepository.findByStatusAndBranchId(OrderItemStatus.WAIT_CONFIRM, branchId);
        List<OrderItemResponse> response = items.stream().map(item ->
                OrderItemResponse.builder()
                        .itemId(item.getId())
                        .menuItemId(item.getMenuItem().getId())
                        .menuItemName(item.getMenuItemName() != null ? item.getMenuItemName() : item.getMenuItem().getName())
                        .type(item.getMenuItem().getType().name())
                        .quantity(item.getQuantity())
                        .note(item.getNote())
                        .status(item.getStatus().name())
                        .price(item.getPrice())
                        .options(item.getOptions() != null ?
                                item.getOptions().stream().map(com.qrorder.entity.OrderItemOption::getOptionName).toList() :
                                List.of())
                        .orderedTime(item.getOrderedTime())
                        .preparingTime(item.getPreparingTime())
                        .doneTime(item.getDoneTime())
                        .deliveringTime(item.getDeliveringTime())
                        .servedTime(item.getServedTime())
                        .tableNumber(item.getOrder().getSession() != null && item.getOrder().getSession().getTable() != null ?
                                item.getOrder().getSession().getTable().getTableNumber() : null)
                        .build()
        ).toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/confirm-order/{id}")
    public ResponseEntity<?> confirmOrder(
            @PathVariable Long id,
            @RequestParam(required = false) Integer quantity,
            @RequestParam(required = false) Long menuItemId
    ) {
        try {
            orderService.confirmOrder(id, quantity, menuItemId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Xác nhận món thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
