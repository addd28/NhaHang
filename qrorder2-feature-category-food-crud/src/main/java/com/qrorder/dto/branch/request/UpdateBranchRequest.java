package com.qrorder.dto.branch.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Data;

@Data
public class UpdateBranchRequest {

    @NotBlank(message = "Branch name is required")
    private String name;

    private String address;

    private String phone;

    private Long provinceId;
}
