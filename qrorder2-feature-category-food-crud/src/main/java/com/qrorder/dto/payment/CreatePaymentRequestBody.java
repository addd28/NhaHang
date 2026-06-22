package com.qrorder.dto.payment;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentRequestBody {
    private Long sessionId;
    private String paymentMethod; // CASH | QR | PAYPAL
}
