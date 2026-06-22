package com.qrorder.dto.menu.request;

import com.qrorder.entity.enums.MenuItemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CreateMenuItemRequest {

    @NotBlank(message = "Menu item name is required")
    private String name;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be greater than 0")
    private Double price;

    private String description;

    private String image;
    private String imageUrl;

    @NotNull(message = "Category is required")
    private Long categoryId;

    @NotNull(message = "Item type is required")
    private MenuItemType type;
}
