package com.qrorder.dto.dashboard;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class DashboardRecentReservationResponse {
    private String reservationCode;
    private String customerName;
    private String phone;
    private LocalDateTime reservationTime;
    private Integer guestCount;
    private String status;
}
