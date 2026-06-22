package com.qrorder.service;

import com.qrorder.dto.order.request.CreateOrderItemRequest;
import com.qrorder.dto.order.request.CreateOrderRequest;
import com.qrorder.dto.order.response.OrderResponse;
import com.qrorder.entity.*;
import com.qrorder.entity.enums.MenuItemType;
import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.entity.enums.SessionStatus;
import com.qrorder.repository.MenuItemRepository;
import com.qrorder.repository.OrderItemRepository;
import com.qrorder.repository.OrderRepository;
import com.qrorder.repository.TableSessionRepository;
import com.qrorder.service.impl.OrderServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderServiceImpl Tests")
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private MenuItemRepository menuItemRepository;

    @Mock
    private TableSessionRepository sessionRepository;

    @InjectMocks
    private OrderServiceImpl orderService;

    private TableSession session;
    private MenuItem instantFood;
    private MenuItem kitchenFood;
    private Order savedOrder;

    @BeforeEach
    void setUp() {
        session = TableSession.builder()
                .id(1L)
                .status(SessionStatus.OPEN)
                .startTime(LocalDateTime.now())
                .build();

        Category category = Category.builder()
                .id(1L)
                .name("Đồ uống")
                .build();

        instantFood = MenuItem.builder()
                .id(1L)
                .name("Nước suối")
                .type(MenuItemType.INSTANT)
                .price(10000.0)
                .available(true)
                .category(category)
                .build();

        kitchenFood = MenuItem.builder()
                .id(2L)
                .name("Phở bò")
                .type(MenuItemType.KITCHEN)
                .price(60000.0)
                .available(true)
                .category(category)
                .build();

        savedOrder = Order.builder()
                .id(1L)
                .session(session)
                .createdAt(LocalDateTime.now())
                .items(new ArrayList<>())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockSecurityContext(String role) {
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        doReturn(List.of(new SimpleGrantedAuthority(role)))
                .when(authentication).getAuthorities();
        SecurityContextHolder.setContext(securityContext);
    }

    // ==================== createOrder ====================

    @Test
    @DisplayName("createOrder - Tạo đơn hàng với món INSTANT thành công (status = WAIT_CONFIRM)")
    void createOrder_withInstantFood_setsStatusWaitConfirm() {
        CreateOrderItemRequest itemRequest = new CreateOrderItemRequest();
        itemRequest.setMenuItemId(1L);
        itemRequest.setQuantity(2);
        itemRequest.setNote("Ít đá");

        CreateOrderRequest request = new CreateOrderRequest();
        request.setSessionId(1L);
        request.setItems(List.of(itemRequest));

        when(sessionRepository.findByIdAndStatus(1L, SessionStatus.OPEN))
                .thenReturn(Optional.of(session));
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);
        when(menuItemRepository.findById(1L)).thenReturn(Optional.of(instantFood));

        assertThatNoException().isThrownBy(() -> orderService.createOrder(request));

        verify(orderItemRepository).saveAll(argThat(items -> {
            List<OrderItem> list = (List<OrderItem>) items;
            // Quantity = 2 → tạo 2 OrderItem riêng
            return list.size() == 2
                    && list.stream().allMatch(item -> item.getStatus() == OrderItemStatus.WAIT_CONFIRM);
        }));
    }

    @Test
    @DisplayName("createOrder - Tạo đơn hàng với món KITCHEN thành công (status = WAIT_CONFIRM)")
    void createOrder_withKitchenFood_setsStatusWaitConfirm() {
        CreateOrderItemRequest itemRequest = new CreateOrderItemRequest();
        itemRequest.setMenuItemId(2L);
        itemRequest.setQuantity(1);
        itemRequest.setNote("Ít cay");

        CreateOrderRequest request = new CreateOrderRequest();
        request.setSessionId(1L);
        request.setItems(List.of(itemRequest));

        when(sessionRepository.findByIdAndStatus(1L, SessionStatus.OPEN))
                .thenReturn(Optional.of(session));
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);
        when(menuItemRepository.findById(2L)).thenReturn(Optional.of(kitchenFood));

        assertThatNoException().isThrownBy(() -> orderService.createOrder(request));

        verify(orderItemRepository).saveAll(argThat(items -> {
            List<OrderItem> list = (List<OrderItem>) items;
            return list.size() == 1
                    && list.get(0).getStatus() == OrderItemStatus.WAIT_CONFIRM;
        }));
    }

    @Test
    @DisplayName("createOrder - Lưu snapshot tên và giá món ăn thành công")
    void createOrder_savesSnapshotPriceAndName() {
        CreateOrderItemRequest itemRequest = new CreateOrderItemRequest();
        itemRequest.setMenuItemId(1L);
        itemRequest.setQuantity(1);
        itemRequest.setNote("Ít đá");

        CreateOrderRequest request = new CreateOrderRequest();
        request.setSessionId(1L);
        request.setItems(List.of(itemRequest));

        when(sessionRepository.findByIdAndStatus(1L, SessionStatus.OPEN))
                .thenReturn(Optional.of(session));
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);
        when(menuItemRepository.findById(1L)).thenReturn(Optional.of(instantFood));

        assertThatNoException().isThrownBy(() -> orderService.createOrder(request));

        verify(orderItemRepository).saveAll(argThat(items -> {
            List<OrderItem> list = (List<OrderItem>) items;
            return list.size() == 1
                    && list.get(0).getPriceAtOrder().equals(10000.0)
                    && list.get(0).getMenuItemName().equals("Nước suối");
        }));
    }

    @Test
    @DisplayName("createOrder - Lỗi khi session không tồn tại hoặc đã đóng")
    void createOrder_throwsException_whenSessionNotFoundOrClosed() {
        CreateOrderRequest request = new CreateOrderRequest();
        request.setSessionId(99L);
        request.setItems(List.of());

        when(sessionRepository.findByIdAndStatus(99L, SessionStatus.OPEN))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.createOrder(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Session not found or closed");

        verify(orderRepository, never()).save(any());
        verify(orderItemRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("createOrder - Lỗi khi món ăn không tồn tại")
    void createOrder_throwsException_whenFoodNotFound() {
        CreateOrderItemRequest itemRequest = new CreateOrderItemRequest();
        itemRequest.setMenuItemId(99L);
        itemRequest.setQuantity(1);

        CreateOrderRequest request = new CreateOrderRequest();
        request.setSessionId(1L);
        request.setItems(List.of(itemRequest));

        when(sessionRepository.findByIdAndStatus(1L, SessionStatus.OPEN))
                .thenReturn(Optional.of(session));
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);
        when(menuItemRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.createOrder(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Món ăn không tồn tại");
    }

    @Test
    @DisplayName("createOrder - Lỗi khi món ăn không available")
    void createOrder_throwsException_whenFoodNotAvailable() {
        CreateOrderItemRequest itemRequest = new CreateOrderItemRequest();
        itemRequest.setMenuItemId(1L);
        itemRequest.setQuantity(1);

        CreateOrderRequest request = new CreateOrderRequest();
        request.setSessionId(1L);
        request.setItems(List.of(itemRequest));

        instantFood.setAvailable(false);

        when(sessionRepository.findByIdAndStatus(1L, SessionStatus.OPEN))
                .thenReturn(Optional.of(session));
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);
        when(menuItemRepository.findById(1L)).thenReturn(Optional.of(instantFood));

        assertThatThrownBy(() -> orderService.createOrder(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Món ăn Nước suối hiện không có sẵn");
    }

    @Test
    @DisplayName("createOrder - Lỗi khi quantity <= 0")
    void createOrder_throwsException_whenQuantityIsZeroOrNegative() {
        CreateOrderItemRequest itemRequest = new CreateOrderItemRequest();
        itemRequest.setMenuItemId(1L);
        itemRequest.setQuantity(0);

        CreateOrderRequest request = new CreateOrderRequest();
        request.setSessionId(1L);
        request.setItems(List.of(itemRequest));

        when(sessionRepository.findByIdAndStatus(1L, SessionStatus.OPEN))
                .thenReturn(Optional.of(session));
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);

        assertThatThrownBy(() -> orderService.createOrder(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Quantity must be greater than 0");
    }

    // ==================== updateOrderItemStatus ====================

    @Test
    @DisplayName("updateOrderItemStatus - PENDING → PREPARING: hợp lệ cho món KITCHEN")
    void updateOrderItemStatus_pendingToPreparing_success() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.PENDING)
                .menuItem(kitchenFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(orderItemRepository.save(any(OrderItem.class))).thenReturn(item);

        assertThatNoException().isThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.PREPARING));

        assertThat(item.getStatus()).isEqualTo(OrderItemStatus.PREPARING);
    }

    @Test
    @DisplayName("updateOrderItemStatus - PENDING → SERVED: hợp lệ cho món INSTANT")
    void updateOrderItemStatus_pendingToServed_instantFood_success() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.PENDING)
                .menuItem(instantFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(orderItemRepository.save(any(OrderItem.class))).thenReturn(item);

        assertThatNoException().isThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.SERVED));

        assertThat(item.getStatus()).isEqualTo(OrderItemStatus.SERVED);
    }

    @Test
    @DisplayName("updateOrderItemStatus - PENDING → PREPARING: không hợp lệ cho món INSTANT")
    void updateOrderItemStatus_pendingToPreparing_instantFood_throwsException() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.PENDING)
                .menuItem(instantFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.PREPARING))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Invalid status transition");
    }

    @Test
    @DisplayName("updateOrderItemStatus - PENDING → SERVED: không hợp lệ cho món KITCHEN")
    void updateOrderItemStatus_pendingToServed_kitchenFood_throwsException() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.PENDING)
                .menuItem(kitchenFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.SERVED))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Invalid status transition");
    }

    @Test
    @DisplayName("updateOrderItemStatus - PENDING → CANCELLED: hợp lệ")
    void updateOrderItemStatus_pendingToCancelled_success() {
        mockSecurityContext("ROLE_WAITER");

        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.PENDING)
                .menuItem(kitchenFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(orderItemRepository.save(any(OrderItem.class))).thenReturn(item);

        assertThatNoException().isThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.CANCELLED));

        assertThat(item.getStatus()).isEqualTo(OrderItemStatus.CANCELLED);
    }

    @Test
    @DisplayName("updateOrderItemStatus - PREPARING → DONE: hợp lệ")
    void updateOrderItemStatus_preparingToDone_success() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.PREPARING)
                .menuItem(kitchenFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(orderItemRepository.save(any(OrderItem.class))).thenReturn(item);

        assertThatNoException().isThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.DONE));

        assertThat(item.getStatus()).isEqualTo(OrderItemStatus.DONE);
    }

    @Test
    @DisplayName("updateOrderItemStatus - DONE → SERVED: hợp lệ")
    void updateOrderItemStatus_doneToServed_success() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.DONE)
                .menuItem(instantFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(orderItemRepository.save(any(OrderItem.class))).thenReturn(item);

        assertThatNoException().isThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.SERVED));

        assertThat(item.getStatus()).isEqualTo(OrderItemStatus.SERVED);
    }

    @Test
    @DisplayName("updateOrderItemStatus - DONE → WASTED: hợp lệ")
    void updateOrderItemStatus_doneToWasted_success() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.DONE)
                .menuItem(instantFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(orderItemRepository.save(any(OrderItem.class))).thenReturn(item);

        assertThatNoException().isThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.WASTED));

        assertThat(item.getStatus()).isEqualTo(OrderItemStatus.WASTED);
    }

    @Test
    @DisplayName("updateOrderItemStatus - PENDING → DONE: không hợp lệ")
    void updateOrderItemStatus_pendingToDone_throwsException() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.PENDING)
                .menuItem(kitchenFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.DONE))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Invalid status transition");

        verify(orderItemRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateOrderItemStatus - SERVED → bất kỳ: không hợp lệ")
    void updateOrderItemStatus_fromServed_throwsException() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.SERVED)
                .menuItem(instantFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.DONE))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Invalid status transition");

        verify(orderItemRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateOrderItemStatus - CANCELLED → bất kỳ: không hợp lệ")
    void updateOrderItemStatus_fromCancelled_throwsException() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.CANCELLED)
                .menuItem(kitchenFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.PREPARING))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Invalid status transition");

        verify(orderItemRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateOrderItemStatus - Lỗi khi không tìm thấy OrderItem")
    void updateOrderItemStatus_throwsException_whenItemNotFound() {
        when(orderItemRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                orderService.updateOrderItemStatus(99L, OrderItemStatus.PREPARING))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Order item not found");

        verify(orderItemRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateOrderItemStatus - WAIT_CONFIRM → PENDING: hợp lệ")
    void updateOrderItemStatus_waitConfirmToPending_success() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.WAIT_CONFIRM)
                .menuItem(kitchenFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(orderItemRepository.save(any(OrderItem.class))).thenReturn(item);

        assertThatNoException().isThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.PENDING));

        assertThat(item.getStatus()).isEqualTo(OrderItemStatus.PENDING);
    }

    @Test
    @DisplayName("updateOrderItemStatus - WAIT_CONFIRM → CANCELLED: hợp lệ (được quyền)")
    void updateOrderItemStatus_waitConfirmToCancelled_authorized_success() {
        mockSecurityContext("ROLE_WAITER");

        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.WAIT_CONFIRM)
                .menuItem(kitchenFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(orderItemRepository.save(any(OrderItem.class))).thenReturn(item);

        assertThatNoException().isThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.CANCELLED));

        assertThat(item.getStatus()).isEqualTo(OrderItemStatus.CANCELLED);
    }

    @Test
    @DisplayName("updateOrderItemStatus - WAIT_CONFIRM → CANCELLED: ném ngoại lệ nếu không có quyền")
    void updateOrderItemStatus_waitConfirmToCancelled_unauthorized_throwsException() {
        // Security context is empty / not mock, so it should throw exception
        assertThatThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.CANCELLED))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Chỉ có phục vụ hoặc quản trị viên mới được hủy món");

        verify(orderItemRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateOrderItemStatus - WAIT_CONFIRM → other: không hợp lệ")
    void updateOrderItemStatus_waitConfirmToOther_throwsException() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.WAIT_CONFIRM)
                .menuItem(kitchenFood)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() ->
                orderService.updateOrderItemStatus(1L, OrderItemStatus.PREPARING))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Invalid status transition");

        verify(orderItemRepository, never()).save(any());
    }

    // ==================== getOrdersBySession ====================

    @Test
    @DisplayName("getOrdersBySession - Trả về danh sách đơn hàng theo session")
    void getOrdersBySession_returnsOrders() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .menuItem(instantFood)
                .quantity(1)
                .note("Ít đá")
                .status(OrderItemStatus.DONE)
                .build();

        Order order = Order.builder()
                .id(1L)
                .session(session)
                .createdAt(LocalDateTime.now())
                .items(List.of(item))
                .build();

        when(orderRepository.findBySessionId(1L)).thenReturn(List.of(order));

        List<OrderResponse> result = orderService.getOrdersBySession(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getOrderId()).isEqualTo(1L);
        assertThat(result.get(0).getItems()).hasSize(1);
        assertThat(result.get(0).getItems().get(0).getMenuItemName()).isEqualTo("Nước suối");
        assertThat(result.get(0).getItems().get(0).getStatus()).isEqualTo("DONE");
    }

    @Test
    @DisplayName("getOrdersBySession - Trả về danh sách rỗng khi không có đơn")
    void getOrdersBySession_returnsEmptyList_whenNoOrders() {
        when(orderRepository.findBySessionId(99L)).thenReturn(List.of());

        List<OrderResponse> result = orderService.getOrdersBySession(99L);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getOrdersBySession - Trả về tên món ăn snapshotted thay vì tên catalog hiện tại")
    void getOrdersBySession_returnsSnapshottedMenuItemName() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .menuItem(instantFood)
                .menuItemName("Nước suối cũ")
                .priceAtOrder(8000.0)
                .quantity(1)
                .status(OrderItemStatus.DONE)
                .build();

        Order order = Order.builder()
                .id(1L)
                .session(session)
                .createdAt(LocalDateTime.now())
                .items(List.of(item))
                .build();

        when(orderRepository.findBySessionId(1L)).thenReturn(List.of(order));

        List<OrderResponse> result = orderService.getOrdersBySession(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getItems().get(0).getMenuItemName()).isEqualTo("Nước suối cũ");
        assertThat(result.get(0).getItems().get(0).getPrice()).isEqualTo(8000.0);
    }

    @Test
    @DisplayName("confirmOrder - Cập nhật snapshot tên và giá món ăn khi đổi món")
    void confirmOrder_withNewMenuItem_updatesSnapshotDetails() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.WAIT_CONFIRM)
                .menuItem(instantFood)
                .priceAtOrder(10000.0)
                .menuItemName("Nước suối")
                .build();

        MenuItem replacementFood = MenuItem.builder()
                .id(3L)
                .name("Soda chanh")
                .type(MenuItemType.INSTANT)
                .price(15000.0)
                .available(true)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(menuItemRepository.findByIdAndAvailable(3L, true)).thenReturn(Optional.of(replacementFood));

        orderService.confirmOrder(1L, null, 3L);

        assertThat(item.getMenuItem()).isEqualTo(replacementFood);
        assertThat(item.getPriceAtOrder()).isEqualTo(15000.0);
        assertThat(item.getMenuItemName()).isEqualTo("Soda chanh");
        verify(orderItemRepository).save(item);
    }

    @Test
    @DisplayName("confirmOrder - Giữ nguyên snapshot tên và giá món ăn khi chỉ đổi số lượng")
    void confirmOrder_withOnlyQuantityChange_preservesSnapshotDetails() {
        OrderItem item = OrderItem.builder()
                .id(1L)
                .status(OrderItemStatus.WAIT_CONFIRM)
                .menuItem(instantFood)
                .priceAtOrder(10000.0)
                .menuItemName("Nước suối")
                .quantity(1)
                .build();

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(item));

        orderService.confirmOrder(1L, 3, null);

        assertThat(item.getQuantity()).isEqualTo(3);
        assertThat(item.getPriceAtOrder()).isEqualTo(10000.0);
        assertThat(item.getMenuItemName()).isEqualTo("Nước suối");
        verify(orderItemRepository).save(item);
    }
}
