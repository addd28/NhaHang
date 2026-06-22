package com.qrorder.dto.dashboard;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardResponse {

    private Double revenueToday;

    private Double revenueMonth;

    private Long emptyTables;

    private Long reservedTables;

    private Long occupiedTables;

    private Long wastedItems;

    private Long totalPayments;
}