package com.qrorder.dto.dashboard;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardRevenueResponse {
    private String timeLabel; // e.g. "08:00" for hourly today, "2026-06-28" for daily
    private Double revenue;
    private Long invoicesCount;
}
