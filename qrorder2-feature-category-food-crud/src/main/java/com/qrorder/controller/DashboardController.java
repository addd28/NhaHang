package com.qrorder.controller;

import com.qrorder.dto.dashboard.DashboardResponse;
import com.qrorder.dto.dashboard.OptionReportResponse;
import com.qrorder.service.DashboardService;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardResponse getDashboard() {
        return dashboardService.getDashboard();
    }

    @GetMapping("/options-report")
    public List<OptionReportResponse> getOptionsReport(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return dashboardService.getOptionsReport(from, to);
    }

    @GetMapping("/summary")
    public com.qrorder.dto.dashboard.DashboardSummaryResponse getSummary() {
        return dashboardService.getSummary();
    }

    @GetMapping("/revenue")
    public List<com.qrorder.dto.dashboard.DashboardRevenueResponse> getRevenue(
            @RequestParam(value = "range", defaultValue = "today") String range
    ) {
        return dashboardService.getRevenue(range);
    }

    @GetMapping("/table-status")
    public com.qrorder.dto.dashboard.DashboardTableStatusResponse getTableStatus() {
        return dashboardService.getTableStatus();
    }

    @GetMapping("/top-foods")
    public List<com.qrorder.dto.dashboard.DashboardTopFoodResponse> getTopFoods() {
        return dashboardService.getTopFoods();
    }

    @GetMapping("/recent-payments")
    public List<com.qrorder.dto.dashboard.DashboardRecentPaymentResponse> getRecentPayments() {
        return dashboardService.getRecentPayments();
    }

    @GetMapping("/recent-reservations")
    public List<com.qrorder.dto.dashboard.DashboardRecentReservationResponse> getRecentReservations() {
        return dashboardService.getRecentReservations();
    }

    @GetMapping("/recent-feedback")
    public List<com.qrorder.dto.dashboard.DashboardRecentFeedbackResponse> getRecentFeedback() {
        return dashboardService.getRecentFeedback();
    }

    @GetMapping("/revenue-summary")
    public com.qrorder.dto.dashboard.DashboardRevenueSummaryResponse getRevenueSummary(
            @RequestParam(value = "range", defaultValue = "today") String range,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return dashboardService.getRevenueSummary(range, startDate, endDate);
    }

    @GetMapping("/revenue-chart")
    public List<com.qrorder.dto.dashboard.DashboardRevenueResponse> getRevenueChart(
            @RequestParam(value = "range", defaultValue = "today") String range,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return dashboardService.getRevenueChart(range, startDate, endDate);
    }

    @GetMapping("/payment-methods")
    public List<java.util.Map<String, Object>> getPaymentMethods(
            @RequestParam(value = "range", defaultValue = "today") String range,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return dashboardService.getPaymentMethods(range, startDate, endDate);
    }

    @GetMapping("/revenue-comparison")
    public java.util.Map<String, Object> getRevenueComparison(
            @RequestParam(value = "range", defaultValue = "today") String range,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return dashboardService.getRevenueComparison(range, startDate, endDate);
    }

    @GetMapping("/revenue-hours")
    public List<java.util.Map<String, Object>> getRevenueHours(
            @RequestParam(value = "range", defaultValue = "today") String range,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return dashboardService.getRevenueHours(range, startDate, endDate);
    }

    @GetMapping("/highest-invoice")
    public com.qrorder.dto.dashboard.DashboardRecentPaymentResponse getHighestInvoice(
            @RequestParam(value = "range", defaultValue = "today") String range,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return dashboardService.getHighestInvoice(range, startDate, endDate);
    }

    @GetMapping("/lowest-invoice")
    public com.qrorder.dto.dashboard.DashboardRecentPaymentResponse getLowestInvoice(
            @RequestParam(value = "range", defaultValue = "today") String range,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return dashboardService.getLowestInvoice(range, startDate, endDate);
    }

    @GetMapping("/revenue-trend")
    public java.util.Map<String, Object> getRevenueTrend(
            @RequestParam(value = "range", defaultValue = "today") String range,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return dashboardService.getRevenueTrend(range, startDate, endDate);
    }
}