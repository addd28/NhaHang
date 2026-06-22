package com.qrorder.dto.category.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Data;

@Data
public class UpdateCategoryRequest {

    @NotBlank(
            message = "Category name is required"
    )
    private String name;

    private String description;
}