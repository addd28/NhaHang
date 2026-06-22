package com.qrorder.dto.province.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Data;

@Data
public class UpdateProvinceRequest {

    @NotBlank(message = "Province name is required")
    private String name;
}
