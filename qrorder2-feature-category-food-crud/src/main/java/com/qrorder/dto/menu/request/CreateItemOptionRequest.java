package com.qrorder.dto.menu.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

@Data
public class CreateItemOptionRequest {

    @NotBlank(message = "Mã tùy chọn không được để trống")
    private String optionCode;

    @NotBlank(message = "Tên tùy chọn không được để trống")
    private String name;

    @NotNull(message = "Giá bán không được để trống")
    @PositiveOrZero(message = "Giá bán phải lớn hơn hoặc bằng 0")
    private Double price;

    private Integer displayOrder;

    private Boolean available;
}
