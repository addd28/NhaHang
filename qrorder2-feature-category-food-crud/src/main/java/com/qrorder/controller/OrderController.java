package com.qrorder.controller;

import com.qrorder.dto.order.request.CreateOrderRequest;

import com.qrorder.dto.order.response.OrderResponse;

import com.qrorder.entity.enums.OrderItemStatus;

import com.qrorder.service.OrderService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/orders")

@RequiredArgsConstructor

public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public String createOrder(

            @Valid
            @RequestBody
            CreateOrderRequest request
    ) {

        orderService.createOrder(
                request
        );

        return "Create order success";
    }



    @PutMapping(
            "/items/{itemId}/status"
    )

    public String updateOrderItemStatus(

            @PathVariable
            Long itemId,

            @RequestParam
            OrderItemStatus status
    ) {

        orderService.updateOrderItemStatus(

                itemId,

                status
        );
        return "Update success";
    }
}
