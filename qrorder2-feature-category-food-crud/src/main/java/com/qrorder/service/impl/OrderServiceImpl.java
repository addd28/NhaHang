package com.qrorder.service.impl;

import com.qrorder.dto.order.request.CreateOrderItemRequest;
import com.qrorder.dto.order.request.CreateOrderRequest;

import com.qrorder.dto.order.response.OrderItemResponse;
import com.qrorder.dto.order.response.OrderResponse;

import com.qrorder.entity.MenuItem;
import com.qrorder.entity.OptionGroup;
import com.qrorder.entity.ItemOption;
import com.qrorder.entity.OrderItemOption;
import com.qrorder.entity.Order;
import com.qrorder.entity.OrderItem;
import com.qrorder.entity.TableSession;


import com.qrorder.entity.enums.MenuItemType;
import com.qrorder.entity.Reservation;
import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.entity.enums.SessionStatus;

import com.qrorder.repository.MenuItemRepository;
import com.qrorder.repository.ItemOptionRepository;
import com.qrorder.repository.ReservationRepository;
import com.qrorder.repository.OrderItemRepository;
import com.qrorder.repository.OrderRepository;
import com.qrorder.repository.TableSessionRepository;

import com.qrorder.service.OrderService;

import jakarta.transaction.Transactional;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor

public class OrderServiceImpl
        implements OrderService {

    private final OrderRepository orderRepository;

    private final OrderItemRepository orderItemRepository;

    private final MenuItemRepository menuItemRepository;

    private final ItemOptionRepository itemOptionRepository;

    private final TableSessionRepository sessionRepository;

    private final ReservationRepository reservationRepository;

    @Override
    @Transactional
    public void createOrder(

            CreateOrderRequest request
    ) {

        TableSession session = null;
        Reservation reservation = null;

        if (request.getSessionId() != null) {
            session = sessionRepository
                    .findByIdAndStatus(
                            request.getSessionId(),
                            SessionStatus.OPEN
                    )
                    .orElseThrow(() -> new RuntimeException("Session not found or closed"));
        } else if (request.getReservationId() != null) {
            reservation = reservationRepository
                    .findById(request.getReservationId())
                    .orElseThrow(() -> new RuntimeException("Reservation not found"));
        } else {
            throw new RuntimeException("Either Session ID or Reservation ID must be provided");
        }

        Order order =

                Order.builder()

                        .createdAt(
                                LocalDateTime.now()
                        )

                        .session(session)

                        .reservation(reservation)

                        .build();

        Order savedOrder =

                orderRepository.save(
                        order
                );

        List<OrderItem> orderItems =
                new ArrayList<>();

        boolean isPreOrder = (reservation != null && session == null);

        for (CreateOrderItemRequest itemRequest
                : request.getItems()) {

            if (itemRequest.getQuantity() <= 0) {

                throw new RuntimeException(
                        "Quantity must be greater than 0"
                );
            }

            MenuItem menuItem =
                    menuItemRepository
                            .findById(itemRequest.getMenuItemId())
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Món ăn không tồn tại"
                                    )
                            );

            if (menuItem.getAvailable() == null || !menuItem.getAvailable()) {
                throw new RuntimeException("Món ăn " + menuItem.getName() + " hiện không có sẵn");
            }

            List<ItemOption> selectedOptions = new ArrayList<>();
            if (itemRequest.getOptionIds() != null && !itemRequest.getOptionIds().isEmpty()) {
                selectedOptions = itemOptionRepository.findAllById(itemRequest.getOptionIds());
                for (ItemOption option : selectedOptions) {
                    if (option.getDeleted() != null && option.getDeleted()) {
                        throw new RuntimeException("Tùy chọn không tồn tại hoặc đã bị xóa: " + option.getName());
                    }
                    if (option.getAvailable() == null || !option.getAvailable()) {
                        throw new RuntimeException("Tùy chọn không sẵn có: " + option.getName());
                    }
                    
                    OptionGroup optionGroup = option.getOptionGroup();
                    if (optionGroup == null || (optionGroup.getDeleted() != null && optionGroup.getDeleted())) {
                        throw new RuntimeException("Nhóm tùy chọn không tồn tại hoặc đã bị xóa cho tùy chọn: " + option.getName());
                    }
                    if (optionGroup.getAvailable() == null || !optionGroup.getAvailable()) {
                        throw new RuntimeException("Nhóm tùy chọn không sẵn có: " + optionGroup.getName());
                    }
                    if (!optionGroup.getMenuItem().getId().equals(menuItem.getId())) {
                        throw new RuntimeException("Tùy chọn '" + option.getName() + "' không thuộc về món ăn " + menuItem.getName());
                    }
                }
            }

            // Perform option group constraints validation
            if (menuItem.getOptionGroups() != null) {
                for (OptionGroup group : menuItem.getOptionGroups()) {
                    // Check only active/available option groups
                    if ((group.getDeleted() != null && group.getDeleted()) || (group.getAvailable() == null || !group.getAvailable())) {
                        continue;
                    }
                    
                    final Long groupId = group.getId();
                    long selectedCount = selectedOptions.stream()
                            .filter(o -> o.getOptionGroup().getId().equals(groupId))
                            .count();
                    
                    if (group.getRequired() != null && group.getRequired() && selectedCount == 0) {
                        throw new RuntimeException("Nhóm tùy chọn '" + group.getName() + "' là bắt buộc");
                    }
                    
                    if (group.getSelectionType() == com.qrorder.entity.enums.SelectionType.SINGLE) {
                        if (selectedCount > 1) {
                            throw new RuntimeException("Nhóm tùy chọn '" + group.getName() + "' chỉ cho phép chọn tối đa 1 tùy chọn");
                        }
                    } else if (group.getSelectionType() == com.qrorder.entity.enums.SelectionType.MULTIPLE) {
                        if (group.getMinSelect() != null && selectedCount < group.getMinSelect()) {
                            throw new RuntimeException("Nhóm tùy chọn '" + group.getName() + "' yêu cầu chọn tối thiểu " + group.getMinSelect() + " tùy chọn");
                        }
                        if (group.getMaxSelect() != null && selectedCount > group.getMaxSelect()) {
                            throw new RuntimeException("Nhóm tùy chọn '" + group.getName() + "' cho phép chọn tối đa " + group.getMaxSelect() + " tùy chọn");
                        }
                    }
                }
            }

            OrderItemStatus initialStatus = OrderItemStatus.WAIT_CONFIRM;

            for (int i = 0;
                 i < itemRequest.getQuantity();
                 i++) {

                OrderItem orderItem =
                        OrderItem.builder()
                                .menuItem(menuItem)
                                .quantity(1)
                                .note(
                                        itemRequest.getNote()
                                )
                                .status(
                                        initialStatus
                                )
                                .order(
                                        savedOrder
                                )
                                .priceAtOrder(menuItem.getPrice())
                                .menuItemName(menuItem.getName())
                                .build();

                List<OrderItemOption> orderItemOptions = new ArrayList<>();
                for (ItemOption option : selectedOptions) {
                    orderItemOptions.add(OrderItemOption.builder()
                            .orderItem(orderItem)
                            .itemOptionId(option.getId())
                            .optionCode(option.getOptionCode())
                            .optionName(option.getName())
                            .optionPrice(option.getPrice())
                            .optionGroupId(option.getOptionGroup().getId())
                            .optionGroupName(option.getOptionGroup().getName())
                            .optionGroupType(option.getOptionGroup().getType())
                            .quantity(1)
                            .subtotal(option.getPrice())
                            .build());
                }
                orderItem.setOptions(orderItemOptions);

                orderItems.add(
                        orderItem
                );
            }
        }

        orderItemRepository.saveAll(
                orderItems
        );
    }

    @Override
    public List<OrderResponse>
    getOrdersBySession(
            Long sessionId
    ) {

        List<Order> orders =

                orderRepository
                        .findBySessionId(
                                sessionId
                        );

        return orders.stream().map(order ->

                OrderResponse.builder()

                        .orderId(
                                order.getId()
                        )

                        .createdAt(
                                order.getCreatedAt()
                        )

                        .items(

                                order.getItems()

                                        .stream()

                                        .map(item ->

                                                 OrderItemResponse
                                                         .builder()

                                                         .itemId(
                                                                 item.getId()
                                                         )
                                                         .menuItemId(
                                                                 item.getMenuItem().getId()
                                                         )
                                                         .menuItemName(
                                                                 item.getMenuItemName() != null ? item.getMenuItemName() : item.getMenuItem().getName()
                                                         )
                                                         .type(
                                                                 item.getMenuItem()
                                                                         .getType()
                                                                         .name()
                                                         )
                                                         .quantity(
                                                                 item.getQuantity()
                                                         )
                                                         .note(
                                                                 item.getNote()
                                                         )
                                                         .status(
                                                                 item.getStatus()
                                                                         .name()
                                                         )
                                                         .price(
                                                                 item.getPrice()
                                                         )
                                                         .options(
                                                                 item.getOptions() != null ?
                                                                 item.getOptions().stream().map(OrderItemOption::getOptionName).toList() :
                                                                 java.util.Collections.emptyList()
                                                         )
                                                         .orderedTime(
                                                                 item.getOrderedTime()
                                                         )
                                                         .preparingTime(
                                                                 item.getPreparingTime()
                                                         )
                                                         .doneTime(
                                                                 item.getDoneTime()
                                                         )
                                                         .deliveringTime(
                                                                 item.getDeliveringTime()
                                                         )
                                                         .servedTime(
                                                                 item.getServedTime()
                                                         )
                                                         .totalPreparationDuration(
                                                                 calculateTotalPreparationDuration(item)
                                                         )

                                                         .build()

                                        )

                                        .toList()
                        )

                        .build()

        ).toList();
    }

    @Override
    @Transactional
    public void updateOrderItemStatus(

            Long itemId,

            OrderItemStatus newStatus
    ) {

        if (newStatus == OrderItemStatus.CANCELLED) {
            org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            boolean isAllowedRole = authentication != null && authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_WAITER"));
            if (!isAllowedRole) {
                throw new RuntimeException("Chỉ có phục vụ hoặc quản trị viên mới được hủy món");
            }
        }

        OrderItem item =

                orderItemRepository
                        .findById(itemId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Order item not found"
                                )
                        );

        OrderItemStatus currentStatus =
                item.getStatus();

        boolean validTransition = false;

        switch (currentStatus) {
            case WAIT_CONFIRM:
                validTransition = (newStatus == OrderItemStatus.PENDING)
                        || (newStatus == OrderItemStatus.CANCELLED);
                break;

            case PENDING:
                validTransition = (newStatus == OrderItemStatus.PREPARING && item.getMenuItem().getType() == MenuItemType.KITCHEN)
                        || (newStatus == OrderItemStatus.SERVED && item.getMenuItem().getType() == MenuItemType.INSTANT)
                        || (newStatus == OrderItemStatus.CANCELLED);
                break;

            case PREPARING:
                validTransition = (newStatus == OrderItemStatus.DONE);
                break;

            case DONE:
                validTransition = (newStatus == OrderItemStatus.SERVED)
                        || (newStatus == OrderItemStatus.WASTED);
                break;

            case SERVED:
            case CANCELLED:
            case WASTED:
                validTransition = false;
                break;
        }

        if (!validTransition) {

            throw new RuntimeException(
                    "Invalid status transition"
            );
        }

        item.setStatus(
                newStatus
        );

        orderItemRepository.save(
                item
        );
    }

    private String calculateTotalPreparationDuration(OrderItem item) {
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
        if (duration == null) {
            return "N/A";
        }
        long seconds = duration.getSeconds();
        if (seconds < 60) {
            return seconds + "s";
        } else {
            return (seconds / 60) + "m " + (seconds % 60) + "s";
        }
    }

    @Override
    @Transactional
    public void confirmOrder(Long itemId, Integer quantity, Long menuItemId) {
        OrderItem item = orderItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Món ăn không tồn tại"));

        if (item.getStatus() != OrderItemStatus.WAIT_CONFIRM) {
            throw new RuntimeException("Chỉ có thể xác nhận món ở trạng thái chờ xác nhận");
        }

        if (quantity != null) {
            if (quantity <= 0) {
                throw new RuntimeException("Số lượng phải lớn hơn 0");
            }
            item.setQuantity(quantity);
        }

        if (menuItemId != null) {
            MenuItem menuItem = menuItemRepository.findByIdAndAvailable(menuItemId, true)
                    .orElseThrow(() -> new RuntimeException("Món ăn thay thế không tồn tại hoặc không sẵn sàng"));
            item.setMenuItem(menuItem);
            item.setPriceAtOrder(menuItem.getPrice());
            item.setMenuItemName(menuItem.getName());
        } else {
            if (item.getPriceAtOrder() == null && item.getMenuItem() != null) {
                item.setPriceAtOrder(item.getMenuItem().getPrice());
            }
            if (item.getMenuItemName() == null && item.getMenuItem() != null) {
                item.setMenuItemName(item.getMenuItem().getName());
            }
        }

        // Auto-route by food type after confirmation
        MenuItem currentItem = item.getMenuItem();
        if (currentItem.getType() == MenuItemType.KITCHEN) {
            // Kitchen item: set PENDING so kitchen can see and start cooking
            item.setStatus(OrderItemStatus.PENDING);
        } else {
            // INSTANT item: goes directly to DONE (ready to serve by waiter)
            item.setStatus(OrderItemStatus.DONE);
        }

        orderItemRepository.save(item);
    }
}
