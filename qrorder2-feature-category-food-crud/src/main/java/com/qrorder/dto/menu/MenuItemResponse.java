package com.qrorder.dto.menu;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuItemResponse {

    private Long id;
    private String name;
    private String type;
    private Double price;
    private String description;
    private String imageUrl;
    private String image; // for backward compatibility with frontend
    private Boolean available;
    private String categoryName;
    private Long categoryId;
    private List<OptionGroupResponse> optionGroups;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionGroupResponse {
        private Long id;
        private String name;
        private String type;
        private String selectionType;
        private Boolean required;
        private Integer minSelect;
        private Integer maxSelect;
        private Integer displayOrder;
        private Boolean available;
        private Boolean deleted;
        private List<ItemOptionResponse> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemOptionResponse {
        private Long id;
        private String optionCode;
        private String name;
        private Double price;
        private Integer displayOrder;
        private Boolean available;
        private Boolean deleted;
    }
}
