package com.qrorder.dto.dashboard;

import com.qrorder.entity.enums.OptionGroupType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptionReportResponse {
    private Long itemOptionId;
    private String optionName;
    private String optionGroupName;
    private OptionGroupType optionGroupType;
    private Long salesCount;
    private Double revenue;
}
