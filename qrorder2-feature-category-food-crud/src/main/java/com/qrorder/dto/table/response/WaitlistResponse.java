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
public class WaitlistResponse {
    private Long reservationId;
    private String customerName;
    private String phoneNumber;
    private Integer guestCount;
    private LocalDateTime reservationTime;
    private Long waitingMinutes;
}
