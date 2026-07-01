package com.qrorder.dto.payment;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PaymentHistoryResponse {

    private Long paymentId;

    private Long sessionId;

    private Long tableId;

    private Integer tableNumber;

    private Double amount;

    private LocalDateTime paidAt;

    private String paymentMethod;

    private String paymentStatus;

    private java.util.List<PaymentItemResponse> items;

    // Detailed fields
    private String customerName;

    private String customerPhone;

    private String reservationCode;

    private LocalDateTime sessionStartTime;

    private LocalDateTime sessionEndTime;

    private String confirmedBy;

    private Double subtotal;

    private Double serviceCharge;

    private Double taxAmount;

    private Double discountAmount;

    private String transactionCode;

    private Long paymentRequestId;
}