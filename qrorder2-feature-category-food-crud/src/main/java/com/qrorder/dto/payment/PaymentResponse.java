package com.qrorder.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class PaymentResponse {

    private Long sessionId;

    private List<PaymentItemResponse> items;

    private Double totalAmount;
}