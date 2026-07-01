package com.qrorder.dto.table.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ReserveTableRequest {

    @NotBlank(message = "Customer name is required")
    private String customerName;

    @NotBlank(message = "Phone is required")
    private String phone;

    @NotNull(message = "Guest count is required")
    @Min(
            value = 1,
            message = "Guest count must be at least 1"
    )
    private Integer guestCount;

    @NotNull(message = "Reservation time is required")
    private LocalDateTime reservationTime;

    private String note;
}