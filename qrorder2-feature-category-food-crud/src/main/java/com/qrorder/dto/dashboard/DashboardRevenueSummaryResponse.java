package com.qrorder.dto.dashboard;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardRevenueSummaryResponse {
    private Double totalRevenue;
    private Long totalInvoices;
    private Double aov;
    private Long itemsSold;
    private Long customersServed;
}
