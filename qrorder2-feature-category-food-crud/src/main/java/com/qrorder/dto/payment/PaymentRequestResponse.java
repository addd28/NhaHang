package com.qrorder.dto.payment;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequestResponse {

    private Long id;
    private Long sessionId;
    private Integer tableNumber;
    private String branchName;
    private BigDecimal amount;
    private String paymentMethod;
    private String status;
    private LocalDateTime requestedAt;
    private LocalDateTime confirmedAt;
    private Long confirmedByUserId;
    /** true khi PayPal đã capture thành công — cashier chỉ cần xác nhận đóng bàn */
    private boolean alreadyPaid;
}
