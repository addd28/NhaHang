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
    private BigDecimal amount;
    private String paymentMethod;
    private String status;
    private LocalDateTime requestedAt;
    private LocalDateTime confirmedAt;
    private Long confirmedByUserId;
    /** true khi PayPal đã thanh toán thành công — cashier chỉ cần xác nhận đóng bàn */
    private boolean alreadyPaid;

    private String transactionCode;
    private String paymentStatus;
    private String bankName;
    private String bankAccount;
    private String accountName;
    private String qrUrl;
    private String transferContent;
    private LocalDateTime createdAt;
    private LocalDateTime expiredAt;
    private String confirmedBy;
}
