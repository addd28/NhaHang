package com.qrorder.dto.order.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import lombok.Data;

import java.util.List;

@Data
public class CreateOrderRequest {

    private Long sessionId;


    private Long reservationId;

    @NotEmpty(message = "Order items cannot be empty")
    @Valid
    private List<CreateOrderItemRequest> items;
}
