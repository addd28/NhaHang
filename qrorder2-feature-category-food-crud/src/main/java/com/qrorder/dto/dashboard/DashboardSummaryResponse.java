package com.qrorder.dto.dashboard;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardSummaryResponse {
    private Double todayRevenue;
    private Double revenueChangePercentage; // compared to yesterday
    private Long todayOrdersCount;
    private Long paidInvoicesToday;
    private Double todayAov; // Average Order Value today

    private Long occupiedTables;
    private Long emptyTables;
    private Long reservedTables;
    private Long cleaningTables;
    private Long waitingListCount;

    private Long totalReservations;
    private Long checkedInReservations;
    private Long waitingReservations;
    private Long noShowReservations;

    private Long todayGuestsCount;
    private Double averageRating;
    private Long totalFeedbackCount;
}
