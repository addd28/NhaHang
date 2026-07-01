package com.qrorder.dto.dashboard;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardTopFoodResponse {
    private String menuItemName;
    private Long quantitySold;
    private Double revenue;
}
