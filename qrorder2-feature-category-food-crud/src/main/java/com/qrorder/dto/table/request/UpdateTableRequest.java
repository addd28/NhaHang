package com.qrorder.dto.table.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import lombok.Data;

@Data
public class UpdateTableRequest {

    @NotNull(message = "Table number is required")
    @Min(
            value = 1,
            message = "Table number must be greater than 0"
    )
    private Integer tableNumber;

    @NotNull(message = "Capacity is required")
    @Min(
            value = 1,
            message = "Capacity must be greater than 0"
    )
    private Integer capacity;

    private Long branchId;
}
