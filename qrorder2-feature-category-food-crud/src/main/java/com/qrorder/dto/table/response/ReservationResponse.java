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
public class ReservationResponse {
    private Long id;
    private Long branchId;
    private String branchName;
    private String customerName;
    private String phone;
    private String confirmationCode;
    private String reservationCode;
    private Integer guestCount;
    private LocalDateTime reservationTime;
    private String note;
    private String status;
    private LocalDateTime createdAt;
    private Integer tableNumber;
    private LocalDateTime timeSlotStart;
    private LocalDateTime timeSlotEnd;
    private LocalDateTime holdUntil;
    private LocalDateTime confirmedAt;
    private LocalDateTime checkedInAt;
}
