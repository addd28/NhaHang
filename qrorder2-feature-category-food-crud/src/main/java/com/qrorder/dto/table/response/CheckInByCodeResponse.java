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
public class CheckInByCodeResponse {

    private Long sessionId;
    private Integer tableNumber;
    private String customerName;
    private String phone;
    private Integer guestCount;
    private String message;
    private Integer preOrderCount;
}
