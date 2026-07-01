package com.qrorder.service.impl;

import com.qrorder.dto.dashboard.*;
import com.qrorder.entity.Payment;
import com.qrorder.entity.OrderItem;
import com.qrorder.entity.Reservation;
import com.qrorder.entity.Review;
import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.entity.enums.TableStatus;
import com.qrorder.entity.enums.ReservationStatus;
import com.qrorder.entity.enums.PaymentStatus;
import com.qrorder.repository.*;
import com.qrorder.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final PaymentRepository paymentRepository;
    private final RestaurantTableRepository tableRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderItemOptionRepository orderItemOptionRepository;
    private final ReservationRepository reservationRepository;
    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;

    @Override
    public DashboardResponse getDashboard() {
        LocalDate today = LocalDate.now();
        LocalDateTime startToday = today.atStartOfDay();
        LocalDateTime endToday = today.plusDays(1).atStartOfDay();

        double revenueToday = paymentRepository.findByPaidAtBetween(startToday, endToday)
                .stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .mapToDouble(Payment::getAmount)
                .sum();

        LocalDate firstDayOfMonth = today.withDayOfMonth(1);
        double revenueMonth = paymentRepository.findByPaidAtBetween(firstDayOfMonth.atStartOfDay(), endToday)
                .stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .mapToDouble(Payment::getAmount)
                .sum();

        long emptyTables = tableRepository.countByStatus(TableStatus.EMPTY);
        long reservedTables = tableRepository.countByStatus(TableStatus.RESERVED);
        long occupiedTables = tableRepository.countByStatus(TableStatus.OCCUPIED);
        long wastedItems = orderItemRepository.countByStatus(OrderItemStatus.WASTED);
        long totalPayments = paymentRepository.count();

        return DashboardResponse.builder()
                .revenueToday(revenueToday)
                .revenueMonth(revenueMonth)
                .emptyTables(emptyTables)
                .reservedTables(reservedTables)
                .occupiedTables(occupiedTables)
                .wastedItems(wastedItems)
                .totalPayments(totalPayments)
                .build();
    }

    @Override
    public List<OptionReportResponse> getOptionsReport(LocalDate from, LocalDate to) {
        LocalDateTime fromDateTime = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDateTime = to != null ? to.atTime(23, 59, 59, 999999999) : null;
        return orderItemOptionRepository.getOptionsReport(fromDateTime, toDateTime);
    }

    @Override
    public DashboardSummaryResponse getSummary() {
        LocalDateTime startToday = LocalDate.now().atStartOfDay();
        LocalDateTime endToday = LocalDate.now().plusDays(1).atStartOfDay();
        LocalDateTime startYesterday = LocalDate.now().minusDays(1).atStartOfDay();

        // Revenue calculations
        List<Payment> todayPayments = paymentRepository.findByPaidAtBetween(startToday, endToday).stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .toList();

        double todayRevenue = todayPayments.stream()
                .mapToDouble(Payment::getAmount)
                .sum();

        double yesterdayRevenue = paymentRepository.findByPaidAtBetween(startYesterday, startToday).stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .mapToDouble(Payment::getAmount)
                .sum();

        double changePercent = 0.0;
        if (yesterdayRevenue > 0) {
            changePercent = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100.0;
        } else if (todayRevenue > 0) {
            changePercent = 100.0;
        }

        long paidInvoicesToday = todayPayments.size();
        long todayOrdersCount = orderRepository.findByCreatedAtBetween(startToday, endToday).size();
        double todayAov = paidInvoicesToday > 0 ? (todayRevenue / paidInvoicesToday) : 0.0;

        // Table counts
        long occupiedTables = tableRepository.countByStatus(TableStatus.OCCUPIED);
        long emptyTables = tableRepository.countByStatus(TableStatus.EMPTY);
        long reservedTables = tableRepository.countByStatus(TableStatus.RESERVED);
        long cleaningTables = 0; // Cleaning is not supported by TableStatus enum
        long waitingListCount = 0L;

        // Reservation counts
        long totalReservations = reservationRepository.count();
        long checkedInReservations = reservationRepository.countByStatus(ReservationStatus.SEATED) 
                + reservationRepository.countByStatus(ReservationStatus.COMPLETED);
        long waitingReservations = reservationRepository.countByStatus(ReservationStatus.BOOKED);
        long noShowReservations = reservationRepository.countByStatus(ReservationStatus.NO_SHOW);


        // Guest count today
        long todayGuestsCount = reservationRepository.findByReservationTimeBetween(startToday, endToday).stream()
                .filter(r -> r.getStatus() == ReservationStatus.SEATED || r.getStatus() == ReservationStatus.COMPLETED)
                .mapToLong(Reservation::getGuestCount)
                .sum();

        // Reviews / feedback stats
        long totalFeedbackCount = reviewRepository.count();
        double averageRating = 0.0;
        if (totalFeedbackCount > 0) {
            averageRating = reviewRepository.findAll().stream()
                    .mapToDouble(Review::getRating)
                    .average()
                    .orElse(0.0);
        }

        return DashboardSummaryResponse.builder()
                .todayRevenue(todayRevenue)
                .revenueChangePercentage(changePercent)
                .todayOrdersCount(todayOrdersCount)
                .paidInvoicesToday(paidInvoicesToday)
                .todayAov(todayAov)
                .occupiedTables(occupiedTables)
                .emptyTables(emptyTables)
                .reservedTables(reservedTables)
                .cleaningTables(cleaningTables)
                .waitingListCount(waitingListCount)
                .totalReservations(totalReservations)
                .checkedInReservations(checkedInReservations)
                .waitingReservations(waitingReservations)
                .noShowReservations(noShowReservations)
                .todayGuestsCount(todayGuestsCount)
                .averageRating(averageRating)
                .totalFeedbackCount(totalFeedbackCount)
                .build();
    }

    @Override
    public List<DashboardRevenueResponse> getRevenue(String range) {
        List<DashboardRevenueResponse> response = new ArrayList<>();
        LocalDateTime start;
        LocalDateTime end = LocalDate.now().plusDays(1).atStartOfDay();

        if ("7d".equalsIgnoreCase(range)) {
            start = LocalDate.now().minusDays(6).atStartOfDay();
            List<Payment> payments = paymentRepository.findByPaidAtBetween(start, end).stream()
                    .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                    .toList();

            for (int i = 6; i >= 0; i--) {
                LocalDate date = LocalDate.now().minusDays(i);
                LocalDateTime startOfDay = date.atStartOfDay();
                LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

                List<Payment> dayPayments = payments.stream()
                        .filter(p -> !p.getPaidAt().isBefore(startOfDay) && p.getPaidAt().isBefore(endOfDay))
                        .toList();

                response.add(DashboardRevenueResponse.builder()
                        .timeLabel(date.toString())
                        .revenue(dayPayments.stream().mapToDouble(Payment::getAmount).sum())
                        .invoicesCount((long) dayPayments.size())
                        .build());
            }
        } else if ("30d".equalsIgnoreCase(range)) {
            start = LocalDate.now().minusDays(29).atStartOfDay();
            List<Payment> payments = paymentRepository.findByPaidAtBetween(start, end).stream()
                    .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                    .toList();

            for (int i = 29; i >= 0; i--) {
                LocalDate date = LocalDate.now().minusDays(i);
                LocalDateTime startOfDay = date.atStartOfDay();
                LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

                List<Payment> dayPayments = payments.stream()
                        .filter(p -> !p.getPaidAt().isBefore(startOfDay) && p.getPaidAt().isBefore(endOfDay))
                        .toList();

                response.add(DashboardRevenueResponse.builder()
                        .timeLabel(date.toString())
                        .revenue(dayPayments.stream().mapToDouble(Payment::getAmount).sum())
                        .invoicesCount((long) dayPayments.size())
                        .build());
            }
        } else { // default "today"
            start = LocalDate.now().atStartOfDay();
            List<Payment> payments = paymentRepository.findByPaidAtBetween(start, end).stream()
                    .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                    .toList();

            for (int h = 0; h < 24; h++) {
                final int hour = h;
                List<Payment> hourPayments = payments.stream()
                        .filter(p -> p.getPaidAt().getHour() == hour)
                        .toList();

                String label = String.format("%02d:00", hour);
                response.add(DashboardRevenueResponse.builder()
                        .timeLabel(label)
                        .revenue(hourPayments.stream().mapToDouble(Payment::getAmount).sum())
                        .invoicesCount((long) hourPayments.size())
                        .build());
            }
        }

        return response;
    }

    @Override
    public DashboardTableStatusResponse getTableStatus() {
        long empty = tableRepository.countByStatus(TableStatus.EMPTY);
        long occupied = tableRepository.countByStatus(TableStatus.OCCUPIED);
        long reserved = tableRepository.countByStatus(TableStatus.RESERVED);
        long cleaning = 0; // Cleaning is not supported by TableStatus enum

        long total = empty + occupied + reserved + cleaning;
        double emptyPercentage = total > 0 ? ((double) empty / total) * 100.0 : 0.0;
        double occupiedPercentage = total > 0 ? ((double) occupied / total) * 100.0 : 0.0;
        double reservedPercentage = total > 0 ? ((double) reserved / total) * 100.0 : 0.0;
        double cleaningPercentage = total > 0 ? ((double) cleaning / total) * 100.0 : 0.0;

        return DashboardTableStatusResponse.builder()
                .empty(empty)
                .occupied(occupied)
                .reserved(reserved)
                .cleaning(cleaning)
                .emptyPercentage(emptyPercentage)
                .occupiedPercentage(occupiedPercentage)
                .reservedPercentage(reservedPercentage)
                .cleaningPercentage(cleaningPercentage)
                .build();
    }

    @Override
    public List<DashboardTopFoodResponse> getTopFoods() {
        List<OrderItem> servedItems = orderItemRepository.findAll().stream()
                .filter(item -> item.getStatus() == OrderItemStatus.SERVED)
                .toList();

        Map<String, List<OrderItem>> grouped = servedItems.stream()
                .filter(item -> item.getMenuItemName() != null)
                .collect(Collectors.groupingBy(OrderItem::getMenuItemName));

        return grouped.entrySet().stream()
                .map(entry -> {
                    String name = entry.getKey();
                    long qty = entry.getValue().stream().mapToLong(OrderItem::getQuantity).sum();
                    double rev = entry.getValue().stream()
                            .mapToDouble(item -> item.getPrice() * item.getQuantity())
                            .sum();
                    return DashboardTopFoodResponse.builder()
                            .menuItemName(name)
                            .quantitySold(qty)
                            .revenue(rev)
                            .build();
                })
                .sorted((a, b) -> b.getQuantitySold().compareTo(a.getQuantitySold()))
                .limit(10)
                .collect(Collectors.toList());
    }

    @Override
    public List<DashboardRecentPaymentResponse> getRecentPayments() {
        return paymentRepository.findAllByOrderByPaidAtDesc().stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .limit(10)
                .map(p -> {
                    Integer tableNum = p.getSession() != null && p.getSession().getTable() != null
                            ? p.getSession().getTable().getTableNumber() : null;
                    String customer = p.getSession() != null && p.getSession().getCustomerName() != null
                            ? p.getSession().getCustomerName() : "Khách vãng lai";
                    return DashboardRecentPaymentResponse.builder()
                            .paymentId(p.getId())
                            .tableNumber(tableNum)
                            .customerName(customer)
                            .amount(p.getAmount())
                            .paymentMethod(p.getPaymentMethod().name())
                            .paidAt(p.getPaidAt())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<DashboardRecentReservationResponse> getRecentReservations() {
        return reservationRepository.findAllByOrderByCreatedAtDesc().stream()
                .limit(10)
                .map(r -> DashboardRecentReservationResponse.builder()
                        .reservationCode(r.getReservationCode())
                        .customerName(r.getCustomerName())
                        .phone(r.getPhone())
                        .reservationTime(r.getReservationTime())
                        .guestCount(r.getGuestCount())
                        .status(r.getStatus().name())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<DashboardRecentFeedbackResponse> getRecentFeedback() {
        return reviewRepository.findAllByOrderByCreatedAtDesc().stream()
                .limit(10)
                .map(rev -> DashboardRecentFeedbackResponse.builder()
                        .rating(rev.getRating())
                        .customerName(rev.getCustomerName())
                        .comment(rev.getComment())
                        .createdAt(rev.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private LocalDateTime[] resolveDateRange(String range, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start;
        LocalDateTime end = LocalDate.now().plusDays(1).atStartOfDay();

        if ("today".equalsIgnoreCase(range)) {
            start = LocalDate.now().atStartOfDay();
        } else if ("7d".equalsIgnoreCase(range)) {
            start = LocalDate.now().minusDays(6).atStartOfDay();
        } else if ("30d".equalsIgnoreCase(range)) {
            start = LocalDate.now().minusDays(29).atStartOfDay();
        } else if ("month".equalsIgnoreCase(range)) {
            start = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        } else if ("year".equalsIgnoreCase(range)) {
            start = LocalDate.now().withDayOfYear(1).atStartOfDay();
        } else if ("custom".equalsIgnoreCase(range) && startDate != null && endDate != null) {
            start = startDate.atStartOfDay();
            end = endDate.plusDays(1).atStartOfDay();
        } else {
            start = LocalDate.now().atStartOfDay(); // fallback to today
        }

        return new LocalDateTime[]{start, end};
    }

    private LocalDateTime[] resolvePreviousDateRange(LocalDateTime start, LocalDateTime end) {
        long durationInDays = java.time.temporal.ChronoUnit.DAYS.between(start.toLocalDate(), end.toLocalDate());
        if (durationInDays <= 0) {
            durationInDays = 1;
        }
        LocalDateTime startPrev = start.minusDays(durationInDays);
        LocalDateTime endPrev = start;
        return new LocalDateTime[]{startPrev, endPrev};
    }

    @Override
    public DashboardRevenueSummaryResponse getRevenueSummary(String range, LocalDate startDate, LocalDate endDate) {
        LocalDateTime[] dates = resolveDateRange(range, startDate, endDate);
        LocalDateTime start = dates[0];
        LocalDateTime end = dates[1];

        List<Payment> payments = paymentRepository.findByPaidAtBetween(start, end).stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .toList();

        double totalRevenue = payments.stream().mapToDouble(Payment::getAmount).sum();
        long totalInvoices = payments.size();
        double aov = totalInvoices > 0 ? (totalRevenue / totalInvoices) : 0.0;

        long itemsSold = orderItemRepository.findAll().stream()
                .filter(item -> item.getStatus() == OrderItemStatus.SERVED)
                .filter(item -> {
                    LocalDateTime time = item.getServedTime() != null ? item.getServedTime() : item.getOrderedTime();
                    return time != null && !time.isBefore(start) && time.isBefore(end);
                })
                .mapToLong(OrderItem::getQuantity)
                .sum();

        long customersServed = reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == ReservationStatus.SEATED || r.getStatus() == ReservationStatus.COMPLETED)
                .filter(r -> {
                    LocalDateTime time = r.getCheckedInAt() != null ? r.getCheckedInAt() : r.getReservationTime();
                    return time != null && !time.isBefore(start) && time.isBefore(end);
                })
                .mapToLong(Reservation::getGuestCount)
                .sum();

        return DashboardRevenueSummaryResponse.builder()
                .totalRevenue(totalRevenue)
                .totalInvoices(totalInvoices)
                .aov(aov)
                .itemsSold(itemsSold)
                .customersServed(customersServed)
                .build();
    }

    @Override
    public List<DashboardRevenueResponse> getRevenueChart(String range, LocalDate startDate, LocalDate endDate) {
        LocalDateTime[] dates = resolveDateRange(range, startDate, endDate);
        LocalDateTime start = dates[0];
        LocalDateTime end = dates[1];

        List<DashboardRevenueResponse> chartData = new ArrayList<>();
        List<Payment> payments = paymentRepository.findByPaidAtBetween(start, end).stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .toList();

        long days = java.time.temporal.ChronoUnit.DAYS.between(start.toLocalDate(), end.toLocalDate());

        if ("today".equalsIgnoreCase(range) || days <= 1) {
            for (int h = 0; h < 24; h++) {
                final int hour = h;
                List<Payment> hourPayments = payments.stream()
                        .filter(p -> p.getPaidAt().getHour() == hour)
                        .toList();
                chartData.add(DashboardRevenueResponse.builder()
                        .timeLabel(String.format("%02d:00", hour))
                        .revenue(hourPayments.stream().mapToDouble(Payment::getAmount).sum())
                        .invoicesCount((long) hourPayments.size())
                        .build());
            }
        } else if ("year".equalsIgnoreCase(range)) {
            for (int m = 1; m <= 12; m++) {
                final int month = m;
                List<Payment> monthPayments = payments.stream()
                        .filter(p -> p.getPaidAt().getMonthValue() == month)
                        .toList();
                chartData.add(DashboardRevenueResponse.builder()
                        .timeLabel(String.format("Tháng %02d", month))
                        .revenue(monthPayments.stream().mapToDouble(Payment::getAmount).sum())
                        .invoicesCount((long) monthPayments.size())
                        .build());
            }
        } else {
            for (int i = 0; i < days; i++) {
                LocalDate date = start.toLocalDate().plusDays(i);
                LocalDateTime startOfDay = date.atStartOfDay();
                LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

                List<Payment> dayPayments = payments.stream()
                        .filter(p -> !p.getPaidAt().isBefore(startOfDay) && p.getPaidAt().isBefore(endOfDay))
                        .toList();

                chartData.add(DashboardRevenueResponse.builder()
                        .timeLabel(date.toString())
                        .revenue(dayPayments.stream().mapToDouble(Payment::getAmount).sum())
                        .invoicesCount((long) dayPayments.size())
                        .build());
            }
        }
        return chartData;
    }

    @Override
    public List<Map<String, Object>> getPaymentMethods(String range, LocalDate startDate, LocalDate endDate) {
        LocalDateTime[] dates = resolveDateRange(range, startDate, endDate);
        LocalDateTime start = dates[0];
        LocalDateTime end = dates[1];

        List<Payment> payments = paymentRepository.findByPaidAtBetween(start, end).stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .toList();

        double total = payments.stream().mapToDouble(Payment::getAmount).sum();

        Map<String, Double> methodTotals = new HashMap<>();
        methodTotals.put("Tiền mặt", 0.0);
        methodTotals.put("VietQR", 0.0);
        methodTotals.put("PayPal", 0.0);

        for (Payment p : payments) {
            String key = "Khác";
            if (p.getPaymentMethod() != null) {
                if (p.getPaymentMethod().name().equalsIgnoreCase("CASH")) key = "Tiền mặt";
                else if (p.getPaymentMethod().name().equalsIgnoreCase("QR")) key = "VietQR";
                else if (p.getPaymentMethod().name().equalsIgnoreCase("PAYPAL")) key = "PayPal";
                else key = p.getPaymentMethod().name();
            }
            methodTotals.put(key, methodTotals.getOrDefault(key, 0.0) + p.getAmount());
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Double> entry : methodTotals.entrySet()) {
            if (entry.getValue() > 0 || payments.isEmpty()) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", entry.getKey());
                map.put("value", entry.getValue());
                double pct = total > 0 ? (entry.getValue() / total) * 100.0 : 0.0;
                map.put("percentage", Math.round(pct * 10.0) / 10.0);
                result.add(map);
            }
        }
        return result;
    }

    @Override
    public Map<String, Object> getRevenueComparison(String range, LocalDate startDate, LocalDate endDate) {
        LocalDateTime[] dates = resolveDateRange(range, startDate, endDate);
        LocalDateTime start = dates[0];
        LocalDateTime end = dates[1];

        LocalDateTime[] datesPrev = resolvePreviousDateRange(start, end);
        LocalDateTime startPrev = datesPrev[0];
        LocalDateTime endPrev = datesPrev[1];

        double currentRevenue = paymentRepository.findByPaidAtBetween(start, end).stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .mapToDouble(Payment::getAmount)
                .sum();

        double previousRevenue = paymentRepository.findByPaidAtBetween(startPrev, endPrev).stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .mapToDouble(Payment::getAmount)
                .sum();

        double diff = currentRevenue - previousRevenue;
        double pct = 0.0;
        if (previousRevenue > 0) {
            pct = (diff / previousRevenue) * 100.0;
        } else if (currentRevenue > 0) {
            pct = 100.0;
        }
        String trend = diff >= 0 ? "UP" : "DOWN";

        Map<String, Object> res = new HashMap<>();
        res.put("currentRevenue", currentRevenue);
        res.put("previousRevenue", previousRevenue);
        res.put("percentageChange", Math.round(pct * 10.0) / 10.0);
        res.put("trend", trend);
        return res;
    }

    @Override
    public List<Map<String, Object>> getRevenueHours(String range, LocalDate startDate, LocalDate endDate) {
        LocalDateTime[] dates = resolveDateRange(range, startDate, endDate);
        LocalDateTime start = dates[0];
        LocalDateTime end = dates[1];

        List<Payment> payments = paymentRepository.findByPaidAtBetween(start, end).stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .toList();

        List<Map<String, Object>> list = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            final int hour = h;
            double rev = payments.stream()
                    .filter(p -> p.getPaidAt().getHour() == hour)
                    .mapToDouble(Payment::getAmount)
                    .sum();
            Map<String, Object> map = new HashMap<>();
            map.put("hour", String.format("%02d:00", hour));
            map.put("revenue", rev);
            list.add(map);
        }
        return list;
    }

    @Override
    public DashboardRecentPaymentResponse getHighestInvoice(String range, LocalDate startDate, LocalDate endDate) {
        LocalDateTime[] dates = resolveDateRange(range, startDate, endDate);
        LocalDateTime start = dates[0];
        LocalDateTime end = dates[1];

        Payment p = paymentRepository.findByPaidAtBetween(start, end).stream()
                .filter(p2 -> p2.getPaymentStatus() == PaymentStatus.SUCCESS)
                .max(Comparator.comparing(Payment::getAmount))
                .orElse(null);

        if (p == null) return null;

        Integer tableNum = p.getSession() != null && p.getSession().getTable() != null
                ? p.getSession().getTable().getTableNumber() : null;
        String customer = p.getSession() != null && p.getSession().getCustomerName() != null
                ? p.getSession().getCustomerName() : "Khách vãng lai";

        return DashboardRecentPaymentResponse.builder()
                .paymentId(p.getId())
                .tableNumber(tableNum)
                .customerName(customer)
                .amount(p.getAmount())
                .paymentMethod(p.getPaymentMethod().name())
                .paidAt(p.getPaidAt())
                .build();
    }

    @Override
    public DashboardRecentPaymentResponse getLowestInvoice(String range, LocalDate startDate, LocalDate endDate) {
        LocalDateTime[] dates = resolveDateRange(range, startDate, endDate);
        LocalDateTime start = dates[0];
        LocalDateTime end = dates[1];

        Payment p = paymentRepository.findByPaidAtBetween(start, end).stream()
                .filter(p2 -> p2.getPaymentStatus() == PaymentStatus.SUCCESS)
                .min(Comparator.comparing(Payment::getAmount))
                .orElse(null);

        if (p == null) return null;

        Integer tableNum = p.getSession() != null && p.getSession().getTable() != null
                ? p.getSession().getTable().getTableNumber() : null;
        String customer = p.getSession() != null && p.getSession().getCustomerName() != null
                ? p.getSession().getCustomerName() : "Khách vãng lai";

        return DashboardRecentPaymentResponse.builder()
                .paymentId(p.getId())
                .tableNumber(tableNum)
                .customerName(customer)
                .amount(p.getAmount())
                .paymentMethod(p.getPaymentMethod().name())
                .paidAt(p.getPaidAt())
                .build();
    }

    @Override
    public Map<String, Object> getRevenueTrend(String range, LocalDate startDate, LocalDate endDate) {
        Map<String, Object> comp = getRevenueComparison(range, startDate, endDate);
        double pct = (double) comp.get("percentageChange");
        String direction = "STABLE";
        if (pct > 0) direction = "UP";
        else if (pct < 0) direction = "DOWN";

        Map<String, Object> trendMap = new HashMap<>();
        trendMap.put("trendPercentage", Math.abs(pct));
        trendMap.put("direction", direction);
        return trendMap;
    }
}