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
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "branchId", required = false) Long branchId
    ) {
        return dashboardService.getOptionsReport(from, to, branchId);
    }
}