package com.qrorder.controller;

import com.qrorder.dto.report.BranchReportResponse;
import com.qrorder.entity.Branch;
import com.qrorder.entity.Payment;
import com.qrorder.entity.User;
import com.qrorder.entity.enums.PaymentMethod;
import com.qrorder.entity.enums.SessionStatus;
import com.qrorder.entity.enums.TableStatus;
import com.qrorder.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reports/branch")
@RequiredArgsConstructor
public class BranchReportController {

    private final BranchRepository branchRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final ReservationRepository reservationRepository;
    private final RestaurantTableRepository tableRepository;
    private final TableSessionRepository tableSessionRepository;
    private final UserRepository userRepository;

    @GetMapping("/{branchId}")
    public ResponseEntity<?> getBranchReport(@PathVariable Long branchId) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            boolean isBranchManager = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_BRANCH_MANAGER"));
            if (isBranchManager) {
                User user = userRepository.findByUsername(auth.getName()).orElse(null);
                if (user != null && user.getBranch() != null) {
                    if (!user.getBranch().getId().equals(branchId)) {
                        return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền truy cập báo cáo của chi nhánh khác!"));
                    }
                }
            }
        }

        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new RuntimeException("Branch not found"));

        LocalDate today = LocalDate.now();
        LocalDateTime startToday = today.atStartOfDay();
        LocalDateTime endToday = today.plusDays(1).atStartOfDay();

        // Week range (Mon to Sun)
        LocalDate startOfWeek = today.minusDays(today.getDayOfWeek().getValue() - 1);
        LocalDateTime startWeekTime = startOfWeek.atStartOfDay();

        // Month range
        LocalDate firstDayOfMonth = today.withDayOfMonth(1);
        LocalDateTime startMonthTime = firstDayOfMonth.atStartOfDay();

        // Payments / Revenue
        List<Payment> todayPayments = paymentRepository.findByBranchIdAndPaidAtBetween(branchId, startToday, endToday);
        double todayRevenue = todayPayments.stream().mapToDouble(Payment::getAmount).sum();

        List<Payment> weekPayments = paymentRepository.findByBranchIdAndPaidAtBetween(branchId, startWeekTime, endToday);
        double weekRevenue = weekPayments.stream().mapToDouble(Payment::getAmount).sum();

        List<Payment> monthPayments = paymentRepository.findByBranchIdAndPaidAtBetween(branchId, startMonthTime, endToday);
        double monthRevenue = monthPayments.stream().mapToDouble(Payment::getAmount).sum();

        // Payments breakdown
        double cashRevenue = todayPayments.stream()
                .filter(p -> p.getPaymentMethod() == PaymentMethod.CASH)
                .mapToDouble(Payment::getAmount).sum();
        double qrRevenue = todayPayments.stream()
                .filter(p -> p.getPaymentMethod() == PaymentMethod.QR)
                .mapToDouble(Payment::getAmount).sum();
        double paypalRevenue = todayPayments.stream()
                .filter(p -> p.getPaymentMethod() == PaymentMethod.PAYPAL)
                .mapToDouble(Payment::getAmount).sum();

        // Operations
        long totalOrders = orderRepository.countByBranchId(branchId);
        long totalReservations = reservationRepository.countByBranchId(branchId);

        long reservationsToday = reservationRepository.countByBranchIdAndReservationTimeBetween(branchId, startToday, endToday);
        long activeSessions = tableSessionRepository.countByBranchIdAndStatus(branchId, SessionStatus.OPEN);
        long ordersToday = orderRepository.countByBranchIdAndCreatedAtBetween(branchId, startToday, endToday);

        // Tables
        long occupiedTables = tableRepository.countByBranchIdAndStatus(branchId, TableStatus.OCCUPIED);
        long emptyTables = tableRepository.countByBranchIdAndStatus(branchId, TableStatus.EMPTY);

        BranchReportResponse response = BranchReportResponse.builder()
                .branchId(branch.getId())
                .branchName(branch.getName())
                .todayRevenue(todayRevenue)
                .weekRevenue(weekRevenue)
                .monthRevenue(monthRevenue)
                .totalOrders(totalOrders)
                .totalReservations(totalReservations)
                .reservationsToday(reservationsToday)
                .activeSessions(activeSessions)
                .ordersToday(ordersToday)
                .occupiedTables(occupiedTables)
                .emptyTables(emptyTables)
                .cashRevenue(cashRevenue)
                .qrRevenue(qrRevenue)
                .paypalRevenue(paypalRevenue)
                .build();

        return ResponseEntity.ok(response);
    }
}
