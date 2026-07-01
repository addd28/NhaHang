package com.qrorder.dto.table.response;

import com.qrorder.entity.enums.TableStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableResponse {

    private Long id;

    private Integer tableNumber;

    private Integer capacity;

    private String qrToken;

    private String tableKey;

    private TableStatus status;

    private String customerName;

    private String phone;

    private Integer guestCount;

    private LocalDateTime reservationTime;

    private String note;

    private String confirmationCode;

    private String reservationCode;


    public TableResponse(
            Long id,
            Integer tableNumber,
            Integer capacity,
            String qrToken,
            TableStatus status
    ) {
        this.id = id;
        this.tableNumber = tableNumber;
        this.capacity = capacity;
        this.qrToken = qrToken;
        this.status = status;
    }
}
