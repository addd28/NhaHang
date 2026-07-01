package com.qrorder.service;

import com.qrorder.dto.dashboard.DashboardResponse;
import com.qrorder.dto.dashboard.OptionReportResponse;
import java.time.LocalDate;
import java.util.List;

public interface DashboardService {

    DashboardResponse getDashboard();

    List<OptionReportResponse> getOptionsReport(LocalDate from, LocalDate to);

    com.qrorder.dto.dashboard.DashboardSummaryResponse getSummary();

    List<com.qrorder.dto.dashboard.DashboardRevenueResponse> getRevenue(String range);

    com.qrorder.dto.dashboard.DashboardTableStatusResponse getTableStatus();

    List<com.qrorder.dto.dashboard.DashboardTopFoodResponse> getTopFoods();

    List<com.qrorder.dto.dashboard.DashboardRecentPaymentResponse> getRecentPayments();

    List<com.qrorder.dto.dashboard.DashboardRecentReservationResponse> getRecentReservations();

    List<com.qrorder.dto.dashboard.DashboardRecentFeedbackResponse> getRecentFeedback();

    com.qrorder.dto.dashboard.DashboardRevenueSummaryResponse getRevenueSummary(String range, LocalDate startDate, LocalDate endDate);

    List<com.qrorder.dto.dashboard.DashboardRevenueResponse> getRevenueChart(String range, LocalDate startDate, LocalDate endDate);

    List<java.util.Map<String, Object>> getPaymentMethods(String range, LocalDate startDate, LocalDate endDate);

    java.util.Map<String, Object> getRevenueComparison(String range, LocalDate startDate, LocalDate endDate);

    List<java.util.Map<String, Object>> getRevenueHours(String range, LocalDate startDate, LocalDate endDate);

    com.qrorder.dto.dashboard.DashboardRecentPaymentResponse getHighestInvoice(String range, LocalDate startDate, LocalDate endDate);

    com.qrorder.dto.dashboard.DashboardRecentPaymentResponse getLowestInvoice(String range, LocalDate startDate, LocalDate endDate);

    java.util.Map<String, Object> getRevenueTrend(String range, LocalDate startDate, LocalDate endDate);
}