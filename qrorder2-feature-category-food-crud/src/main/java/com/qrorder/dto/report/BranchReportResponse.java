package com.qrorder.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchReportResponse {
    private Long branchId;
    private String branchName;

    // Revenue
    private Double todayRevenue;
    private Double weekRevenue;
    private Double monthRevenue;

    // Operations
    private Long totalOrders;
    private Long totalReservations;
    private Long reservationsToday;
    private Long activeSessions;
    private Long ordersToday;

    // Tables
    private Long occupiedTables;
    private Long emptyTables;

    // Payments breakdown
    private Double cashRevenue;
    private Double qrRevenue;
    private Double paypalRevenue;
}
