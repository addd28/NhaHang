package com.qrorder.dto.menu.request;

import com.qrorder.entity.enums.OptionGroupType;
import com.qrorder.entity.enums.SelectionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateOptionGroupRequest {

    @NotBlank(message = "Tên nhóm tùy chọn không được để trống")
    private String name;

    @NotNull(message = "Loại nhóm tùy chọn không được để trống")
    private OptionGroupType type;

    @NotNull(message = "Loại lựa chọn không được để trống")
    private SelectionType selectionType;

    private Boolean required;

    private Integer minSelect;

    private Integer maxSelect;

    private Integer displayOrder;

    private Boolean available;
}
