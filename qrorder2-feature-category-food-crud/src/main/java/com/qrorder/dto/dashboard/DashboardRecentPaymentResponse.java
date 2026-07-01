package com.qrorder.dto.dashboard;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class DashboardRecentPaymentResponse {
    private Long paymentId;
    private Integer tableNumber;
    private String customerName;
    private Double amount;
    private String paymentMethod;
    private LocalDateTime paidAt;
}
