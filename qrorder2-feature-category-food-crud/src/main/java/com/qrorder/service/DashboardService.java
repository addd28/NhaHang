package com.qrorder.service;

import com.qrorder.dto.dashboard.DashboardResponse;
import com.qrorder.dto.dashboard.OptionReportResponse;
import java.time.LocalDate;
import java.util.List;

public interface DashboardService {

    DashboardResponse getDashboard();

    List<OptionReportResponse> getOptionsReport(LocalDate from, LocalDate to, Long branchId);
}