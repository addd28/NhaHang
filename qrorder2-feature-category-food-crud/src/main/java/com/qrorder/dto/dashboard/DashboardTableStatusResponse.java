package com.qrorder.dto.dashboard;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardTableStatusResponse {
    private Long empty;
    private Long occupied;
    private Long reserved;
    private Long cleaning;

    private Double emptyPercentage;
    private Double occupiedPercentage;
    private Double reservedPercentage;
    private Double cleaningPercentage;
}
