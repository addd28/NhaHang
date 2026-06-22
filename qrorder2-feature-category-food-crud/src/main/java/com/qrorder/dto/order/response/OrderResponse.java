package com.qrorder.dto.order.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponse {

    private Long orderId;

    private LocalDateTime createdAt;

    private List<OrderItemResponse> items;
}