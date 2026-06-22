package com.qrorder.service;

import com.qrorder.dto.order.request.CreateOrderRequest;
import com.qrorder.dto.order.response.OrderResponse;

import com.qrorder.entity.enums.OrderItemStatus;

import java.util.List;

public interface OrderService {

    void createOrder(
            CreateOrderRequest request
    );

    List<OrderResponse>
    getOrdersBySession(
            Long sessionId
    );

    void updateOrderItemStatus(

            Long itemId,

            OrderItemStatus status
    );

    void confirmOrder(Long itemId, Integer quantity, Long menuItemId);
}
