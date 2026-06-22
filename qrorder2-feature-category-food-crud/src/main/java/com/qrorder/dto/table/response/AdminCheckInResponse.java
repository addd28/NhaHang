package com.qrorder.dto.table.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCheckInResponse {
    private boolean success;
    private Long reservationId;
    private Long tableId;
    private String tableNumber;
    private Integer guestCount;
    private String message;
}
