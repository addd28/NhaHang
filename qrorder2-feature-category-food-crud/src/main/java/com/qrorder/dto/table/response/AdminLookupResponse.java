package com.qrorder.dto.table.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminLookupResponse {
    private Long reservationId;
    private String customerName;
    private String reservationCode;
    private LocalDateTime reservationTime;
    private Integer guestCount;
    private String tableNumber;
    private String status;
}
