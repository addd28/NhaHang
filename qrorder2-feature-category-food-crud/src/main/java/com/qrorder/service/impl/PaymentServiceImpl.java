package com.qrorder.service.impl;

import com.qrorder.dto.payment.PaymentHistoryResponse;
import com.qrorder.dto.payment.PaymentItemResponse;
import com.qrorder.dto.payment.PaymentResponse;
import com.qrorder.entity.*;

import com.qrorder.entity.enums.PaymentMethod;
import com.qrorder.entity.enums.PaymentStatus;
import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.entity.enums.ReservationStatus;
import com.qrorder.entity.enums.SessionStatus;
import com.qrorder.entity.enums.TableStatus;

import com.qrorder.repository.*;

import com.qrorder.service.PaymentService;

import jakarta.transaction.Transactional;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor

public class PaymentServiceImpl
        implements PaymentService {

    private final OrderRepository orderRepository;

    private final TableSessionRepository sessionRepository;

    private final RestaurantTableRepository tableRepository;

    private final ReservationRepository reservationRepository;

    private final PaymentRepository paymentRepository;

    private final com.qrorder.repository.UserRepository userRepository;

    private final OrderItemRepository orderItemRepository;

    @Override
    @Transactional
    public PaymentResponse getBill(
            Long sessionId
    ) {

        TableSession session =

                sessionRepository
                        .findById(sessionId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Session not found"
                                )
                        );

        List<Order> orders =

                orderRepository
                        .findBySessionId(
                                sessionId
                        );

        double totalAmount =

                calculateTotalAmount(
                        orders
                );

        List<PaymentItemResponse> items = getSessionPaymentItems(sessionId);

        return PaymentResponse.builder()

                .sessionId(
                        sessionId
                )

                .items(
                        items
                )

                .totalAmount(
                        totalAmount
                )

                .build();
    }

    private List<PaymentItemResponse> getSessionPaymentItems(Long sessionId) {
        List<OrderItem> items = orderItemRepository.findByOrder_Session_Id(sessionId);
        Map<String, PaymentItemResponse> groupedItems = new LinkedHashMap<>();
        for (OrderItem orderItem : items) {
            if (orderItem.getStatus() == OrderItemStatus.SERVED) {
                Long menuItemId = orderItem.getMenuItem().getId();
                List<String> optNames = orderItem.getOptions() != null ?
                        orderItem.getOptions().stream()
                                .map(opt -> String.format("%s (+%,.0f ₫)", opt.getOptionName(), opt.getOptionPrice()))
                                .sorted().toList() :
                        new ArrayList<>();
                String optionsKey = String.join(",", optNames);
                String groupKey = menuItemId + "_" + optionsKey;

                double unitPrice = orderItem.getPrice();
                PaymentItemResponse existing = groupedItems.get(groupKey);
                if (existing == null) {
                    groupedItems.put(groupKey, PaymentItemResponse.builder()
                            .menuItemName(orderItem.getMenuItemName() != null ? orderItem.getMenuItemName() : orderItem.getMenuItem().getName())
                            .quantity(orderItem.getQuantity())
                            .unitPrice(unitPrice)
                            .subtotal(unitPrice * orderItem.getQuantity())
                            .options(optNames)
                            .build());
                } else {
                    existing.setQuantity(existing.getQuantity() + orderItem.getQuantity());
                    existing.setSubtotal(existing.getSubtotal() + (unitPrice * orderItem.getQuantity()));
                }
            }
        }
        return new ArrayList<>(groupedItems.values());
    }

    private List<PaymentItemResponse> formatSessionPaymentItems(List<OrderItem> items) {
        Map<String, PaymentItemResponse> groupedItems = new LinkedHashMap<>();
        for (OrderItem orderItem : items) {
            if (orderItem.getStatus() == OrderItemStatus.SERVED) {
                Long menuItemId = orderItem.getMenuItem().getId();
                List<String> optNames = orderItem.getOptions() != null ?
                        orderItem.getOptions().stream()
                                .map(opt -> String.format("%s (+%,.0f ₫)", opt.getOptionName(), opt.getOptionPrice()))
                                .sorted().toList() :
                        new ArrayList<>();
                String optionsKey = String.join(",", optNames);
                String groupKey = menuItemId + "_" + optionsKey;

                double unitPrice = orderItem.getPrice();
                PaymentItemResponse existing = groupedItems.get(groupKey);
                if (existing == null) {
                    groupedItems.put(groupKey, PaymentItemResponse.builder()
                            .menuItemName(orderItem.getMenuItemName() != null ? orderItem.getMenuItemName() : orderItem.getMenuItem().getName())
                            .quantity(orderItem.getQuantity())
                            .unitPrice(unitPrice)
                            .subtotal(unitPrice * orderItem.getQuantity())
                            .options(optNames)
                            .build());
                } else {
                    existing.setQuantity(existing.getQuantity() + orderItem.getQuantity());
                    existing.setSubtotal(existing.getSubtotal() + (unitPrice * orderItem.getQuantity()));
                }
            }
        }
        return new ArrayList<>(groupedItems.values());
    }


    @Override
    @Transactional
    public void payment(

            Long sessionId,
            PaymentMethod paymentMethod
    ) {

        System.out.println("========== PAYMENT ==========");
        System.out.println("Session ID = " + sessionId);
        System.out.println("Payment Method = " + paymentMethod);

        TableSession session = sessionRepository.findByIdAndStatus(sessionId, SessionStatus.OPEN).orElse(null);
        System.out.println("Session Open Present = " + (session != null));
        if (session == null) {
            System.out.println("FAIL: Session not found or already closed");
            throw new RuntimeException("Session not found or already closed");
        }

        boolean alreadyPaid = paymentRepository.existsBySessionId(sessionId);
        System.out.println("Session Already Paid = " + alreadyPaid);
        if (alreadyPaid) {
            System.out.println("FAIL: Session already paid");
            throw new RuntimeException("Session already paid");
        }

        List<Order> orders = orderRepository.findBySessionId(sessionId);
        System.out.println("Orders Count = " + orders.size());
        if (orders.isEmpty()) {
            System.out.println("FAIL: No orders found");
            throw new RuntimeException("No orders found");
        }

        for (Order order : orders) {
            System.out.println("Order ID = " + order.getId());
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    System.out.println("  Item: " + item.getMenuItemName() + ", Status: " + item.getStatus() + ", Quantity: " + item.getQuantity());
                    if (item.getStatus() == OrderItemStatus.WAIT_CONFIRM ||
                            item.getStatus() == OrderItemStatus.PENDING ||
                            item.getStatus() == OrderItemStatus.PREPARING ||
                            item.getStatus() == OrderItemStatus.DONE) {
                        System.out.println("  FAIL: Item not served yet: " + item.getMenuItemName() + " (status: " + item.getStatus() + ")");
                        throw new RuntimeException("Còn món chưa được phục vụ: " + item.getMenuItemName() + " (" + item.getStatus() + ")");
                    }
                }
            }
        }

        double subtotal =

                calculateTotalAmount(
                        orders
                );

        double serviceCharge = subtotal * 0.05;

        double taxAmount = subtotal * 0.08;

        double discountAmount = 0;

        double finalAmount =

                subtotal
                        + serviceCharge
                        + taxAmount
                        - discountAmount;

        Payment payment =

                Payment.builder()

                        .session(
                                session
                        )

                        .amount(
                                finalAmount
                        )

                        .paidAt(
                                LocalDateTime.now()
                        )

                        .paymentMethod(
                                paymentMethod
                        )

                        .paymentStatus(
                                PaymentStatus.SUCCESS
                        )

                        .build();

        paymentRepository.save(
                payment
        );

        session.setSubtotal(
                subtotal
        );

        session.setServiceCharge(
                serviceCharge
        );

        session.setTaxAmount(
                taxAmount
        );

        session.setDiscountAmount(
                discountAmount
        );

        session.setFinalAmount(
                finalAmount
        );

        if (paymentMethod != PaymentMethod.PAYPAL) {
            session.setStatus(
                    SessionStatus.CLOSED
            );

            session.setEndTime(
                    LocalDateTime.now()
            );

            session.setClosedAt(
                    LocalDateTime.now()
            );

            RestaurantTable table =
                    session.getTable();

            table.setStatus(
                    TableStatus.EMPTY
            );

            List<Reservation> reservations =

                    reservationRepository
                            .findByTableId(
                                    table.getId()
                            );

            reservations.forEach(reservation -> {

                if (reservation.getStatus()
                        == ReservationStatus.SEATED) {

                    reservation.setStatus(
                            ReservationStatus.COMPLETED
                    );
                }
            });

            reservationRepository.saveAll(
                    reservations
            );

            tableRepository.save(
                    table
            );
        }

        sessionRepository.save(
                session
        );
    }

    private double calculateTotalAmount(

            List<Order> orders
    ) {

        double totalAmount = 0;

        for (Order order : orders) {

            for (OrderItem item
                    : order.getItems()) {

                if (item.getStatus()
                        == OrderItemStatus.SERVED) {

                    totalAmount +=

                            item.getPrice()

                                    *

                                    item.getQuantity();
                }
            }
        }

        return totalAmount;
    }

    private PaymentHistoryResponse mapToResponse(Payment payment, List<PaymentItemResponse> items, Map<Long, String> usernames) {
        String closedBy = "System";
        if (payment.getSession() != null && payment.getSession().getClosedByUserId() != null) {
            closedBy = usernames.getOrDefault(payment.getSession().getClosedByUserId(), "N/A");
        }

        String resCode = null;
        if (payment.getSession() != null && payment.getSession().getReservation() != null) {
            resCode = payment.getSession().getReservation().getReservationCode();
        }

        return PaymentHistoryResponse.builder()
                .paymentId(payment.getId())
                .sessionId(payment.getSession() != null ? payment.getSession().getId() : null)
                .tableId(payment.getSession() != null && payment.getSession().getTable() != null ? payment.getSession().getTable().getId() : null)
                .tableNumber(payment.getSession() != null && payment.getSession().getTable() != null ? payment.getSession().getTable().getTableNumber() : null)
                .amount(payment.getAmount())
                .paidAt(payment.getPaidAt())
                .paymentMethod(payment.getPaymentMethod() != null ? payment.getPaymentMethod().name() : "CASH")
                .paymentStatus(payment.getPaymentStatus() != null ? payment.getPaymentStatus().name() : "SUCCESS")
                .items(items)
                // Detailed fields
                .customerName(payment.getSession() != null && payment.getSession().getCustomerName() != null ? payment.getSession().getCustomerName() : "Khách vãng lai")
                .customerPhone(payment.getSession() != null && payment.getSession().getCustomerPhone() != null ? payment.getSession().getCustomerPhone() : "")
                .reservationCode(resCode)
                .sessionStartTime(payment.getSession() != null ? payment.getSession().getStartTime() : null)
                .sessionEndTime(payment.getSession() != null ? payment.getSession().getEndTime() : null)
                .confirmedBy(closedBy)
                .subtotal(payment.getSession() != null && payment.getSession().getSubtotal() != null ? payment.getSession().getSubtotal() : payment.getAmount())
                .serviceCharge(payment.getSession() != null && payment.getSession().getServiceCharge() != null ? payment.getSession().getServiceCharge() : 0.0)
                .taxAmount(payment.getSession() != null && payment.getSession().getTaxAmount() != null ? payment.getSession().getTaxAmount() : 0.0)
                .discountAmount(payment.getSession() != null && payment.getSession().getDiscountAmount() != null ? payment.getSession().getDiscountAmount() : 0.0)
                .transactionCode(payment.getTransactionCode())
                .paymentRequestId(payment.getPaymentRequestId())
                .build();
    }

    private List<Payment> getFilteredPaymentsRaw(
            String startDateStr,
            String endDateStr,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    ) {
        List<Payment> payments = paymentRepository.findAllByOrderByPaidAtDesc();

        LocalDateTime startDate = null;
        LocalDateTime endDate = null;
        try {
            if (startDateStr != null && !startDateStr.isEmpty()) {
                if (startDateStr.contains("T")) {
                    startDate = LocalDateTime.parse(startDateStr);
                } else {
                    startDate = java.time.LocalDate.parse(startDateStr).atStartOfDay();
                }
            }
            if (endDateStr != null && !endDateStr.isEmpty()) {
                if (endDateStr.contains("T")) {
                    endDate = LocalDateTime.parse(endDateStr);
                } else {
                    endDate = java.time.LocalDate.parse(endDateStr).atTime(23, 59, 59);
                }
            }
        } catch (Exception e) {
            // Ignore parse errors
        }

        LocalDateTime finalStartDate = startDate;
        LocalDateTime finalEndDate = endDate;

        return payments.stream()
                .filter(p -> {
                    // Date range filter
                    if (finalStartDate != null && p.getPaidAt().isBefore(finalStartDate)) return false;
                    if (finalEndDate != null && p.getPaidAt().isAfter(finalEndDate)) return false;

                    // Payment Method filter
                    if (paymentMethod != null && !paymentMethod.isEmpty() && !paymentMethod.equalsIgnoreCase("ALL")) {
                        if (p.getPaymentMethod() == null || !p.getPaymentMethod().name().equalsIgnoreCase(paymentMethod)) {
                            return false;
                        }
                    }

                    // Payment Status filter
                    if (paymentStatus != null && !paymentStatus.isEmpty() && !paymentStatus.equalsIgnoreCase("ALL")) {
                        if (p.getPaymentStatus() == null || !p.getPaymentStatus().name().equalsIgnoreCase(paymentStatus)) {
                            return false;
                        }
                    }

                    // Amount range filter
                    if (minAmount != null && p.getAmount() < minAmount) return false;
                    if (maxAmount != null && p.getAmount() > maxAmount) return false;

                    // Text search filter
                    if (search != null && !search.isEmpty()) {
                        String s = search.toLowerCase();
                        boolean match = false;

                        if (p.getId().toString().contains(s)) match = true;

                        if (p.getSession() != null && p.getSession().getId().toString().contains(s)) match = true;

                        if (p.getSession() != null && p.getSession().getTable() != null &&
                            p.getSession().getTable().getTableNumber().toString().contains(s)) match = true;

                        if (p.getSession() != null && p.getSession().getCustomerName() != null &&
                            p.getSession().getCustomerName().toLowerCase().contains(s)) match = true;

                        if (p.getSession() != null && p.getSession().getCustomerPhone() != null &&
                            p.getSession().getCustomerPhone().contains(s)) match = true;

                        if (p.getSession() != null && p.getSession().getReservation() != null &&
                            p.getSession().getReservation().getReservationCode() != null &&
                            p.getSession().getReservation().getReservationCode().toLowerCase().contains(s)) match = true;

                        return match;
                    }

                    return true;
                })
                .toList();
    }

    @Override
    public List<PaymentHistoryResponse> getPaymentHistory() {
        return getPaymentHistoryFiltered(null, null, null, null, null, null, null);
    }

    @Override
    public List<PaymentHistoryResponse> getPaymentHistoryFiltered(
            String startDate,
            String endDate,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    ) {
        List<Payment> filtered = getFilteredPaymentsRaw(startDate, endDate, paymentMethod, paymentStatus, minAmount, maxAmount, search);

        List<Long> sessionIds = filtered.stream()
                .map(p -> p.getSession() != null ? p.getSession().getId() : null)
                .filter(java.util.Objects::nonNull)
                .toList();

        List<OrderItem> allOrderItems = sessionIds.isEmpty() ? List.of() : orderItemRepository.findByOrder_Session_IdIn(sessionIds);
        Map<Long, List<OrderItem>> itemsBySession = allOrderItems.stream()
                .collect(java.util.stream.Collectors.groupingBy(oi -> oi.getOrder().getSession().getId()));

        List<User> allUsers = userRepository.findAll();
        Map<Long, String> usernames = allUsers.stream().collect(java.util.stream.Collectors.toMap(User::getId, User::getUsername, (a, b) -> a));

        return filtered.stream()
                .map(p -> mapToResponse(p, formatSessionPaymentItems(itemsBySession.getOrDefault(p.getSession().getId(), List.of())), usernames))
                .toList();
    }

    @Override
    public PaymentHistoryResponse getPaymentDetail(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        List<User> allUsers = userRepository.findAll();
        Map<Long, String> usernames = allUsers.stream().collect(java.util.stream.Collectors.toMap(User::getId, User::getUsername, (a, b) -> a));

        return mapToResponse(payment, getSessionPaymentItems(payment.getSession().getId()), usernames);
    }

    @Override
    public Map<String, Object> getStatistics(
            String startDate,
            String endDate,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    ) {
        List<Payment> filtered = getFilteredPaymentsRaw(startDate, endDate, paymentMethod, paymentStatus, minAmount, maxAmount, search);

        long totalInvoices = filtered.size();
        double totalRevenue = filtered.stream().mapToDouble(Payment::getAmount).sum();
        double cashRevenue = filtered.stream()
                .filter(p -> p.getPaymentMethod() == PaymentMethod.CASH)
                .mapToDouble(Payment::getAmount).sum();
        double qrRevenue = filtered.stream()
                .filter(p -> p.getPaymentMethod() == PaymentMethod.QR)
                .mapToDouble(Payment::getAmount).sum();
        double paypalRevenue = filtered.stream()
                .filter(p -> p.getPaymentMethod() == PaymentMethod.PAYPAL)
                .mapToDouble(Payment::getAmount).sum();
        double averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0.0;

        Map<Integer, Double> revenueByHour = new LinkedHashMap<>();
        for (int i = 0; i < 24; i++) revenueByHour.put(i, 0.0);

        Map<String, Double> revenueByDate = new LinkedHashMap<>();
        Map<String, Double> revenueByMonth = new LinkedHashMap<>();

        java.time.format.DateTimeFormatter dateFormatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");
        java.time.format.DateTimeFormatter monthFormatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM");

        for (Payment p : filtered) {
            LocalDateTime paidAt = p.getPaidAt();
            double amt = p.getAmount();

            int hour = paidAt.getHour();
            revenueByHour.put(hour, revenueByHour.getOrDefault(hour, 0.0) + amt);

            String dateKey = paidAt.format(dateFormatter);
            revenueByDate.put(dateKey, revenueByDate.getOrDefault(dateKey, 0.0) + amt);

            String monthKey = paidAt.format(monthFormatter);
            revenueByMonth.put(monthKey, revenueByMonth.getOrDefault(monthKey, 0.0) + amt);
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalInvoices", totalInvoices);
        stats.put("totalRevenue", totalRevenue);
        stats.put("cashRevenue", cashRevenue);
        stats.put("qrRevenue", qrRevenue);
        stats.put("paypalRevenue", paypalRevenue);
        stats.put("averageInvoiceValue", averageInvoiceValue);
        stats.put("revenueByHour", revenueByHour);
        stats.put("revenueByDate", revenueByDate);
        stats.put("revenueByMonth", revenueByMonth);

        return stats;
    }

    @Override
    public List<Map<String, Object>> getTopItems(
            String startDate,
            String endDate,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    ) {
        List<Payment> filtered = getFilteredPaymentsRaw(startDate, endDate, paymentMethod, paymentStatus, minAmount, maxAmount, search);
        List<Long> sessionIds = filtered.stream()
                .map(p -> p.getSession() != null ? p.getSession().getId() : null)
                .filter(java.util.Objects::nonNull)
                .toList();

        if (sessionIds.isEmpty()) return List.of();

        List<OrderItem> items = orderItemRepository.findByOrder_Session_IdIn(sessionIds);

        Map<String, Map<String, Object>> itemStats = new LinkedHashMap<>();
        for (OrderItem oi : items) {
            if (oi.getStatus() == OrderItemStatus.SERVED) {
                String name = oi.getMenuItemName() != null ? oi.getMenuItemName() : oi.getMenuItem().getName();
                double itemRevenue = oi.getPrice() * oi.getQuantity();

                Map<String, Object> current = itemStats.get(name);
                if (current == null) {
                    current = new LinkedHashMap<>();
                    current.put("menuItemName", name);
                    current.put("quantitySold", oi.getQuantity());
                    current.put("revenue", itemRevenue);
                    itemStats.put(name, current);
                } else {
                    current.put("quantitySold", (int)current.get("quantitySold") + oi.getQuantity());
                    current.put("revenue", (double)current.get("revenue") + itemRevenue);
                }
            }
        }

        return itemStats.values().stream()
                .sorted((a, b) -> Integer.compare((int)b.get("quantitySold"), (int)a.get("quantitySold")))
                .limit(10)
                .toList();
    }

    @Override
    public byte[] exportExcel(
            String startDate,
            String endDate,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    ) {
        List<PaymentHistoryResponse> list = getPaymentHistoryFiltered(startDate, endDate, paymentMethod, paymentStatus, minAmount, maxAmount, search);

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Lich su thanh toan");

            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(org.apache.poi.ss.usermodel.IndexedColors.WHITE.getIndex());

            org.apache.poi.ss.usermodel.CellStyle headerCellStyle = workbook.createCellStyle();
            headerCellStyle.setFont(headerFont);
            headerCellStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.DARK_BLUE.getIndex());
            headerCellStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            String[] columns = {"Ma hoa don", "Ban", "Khach hang", "So dien thoai", "Phuong thuc", "Tong tien", "Trang thai", "Thoi gian", "Nhan vien xac nhan"};

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerCellStyle);
            }

            int rowIdx = 1;
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            for (PaymentHistoryResponse res : list) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);

                row.createCell(0).setCellValue("INV-" + res.getPaymentId());
                row.createCell(1).setCellValue(res.getTableNumber() != null ? "Ban " + res.getTableNumber() : "—");
                row.createCell(2).setCellValue(res.getCustomerName());
                row.createCell(3).setCellValue(res.getCustomerPhone());
                row.createCell(4).setCellValue(res.getPaymentMethod());
                row.createCell(5).setCellValue(res.getAmount());
                row.createCell(6).setCellValue(res.getPaymentStatus());
                row.createCell(7).setCellValue(res.getPaidAt() != null ? res.getPaidAt().format(formatter) : "");
                row.createCell(8).setCellValue(res.getConfirmedBy() != null ? res.getConfirmedBy() : "");
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Loi xuat Excel: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] exportPdf(
            String startDate,
            String endDate,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    ) {
        List<PaymentHistoryResponse> list = getPaymentHistoryFiltered(startDate, endDate, paymentMethod, paymentStatus, minAmount, maxAmount, search);

        try (java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            com.lowagie.text.Document document = new com.lowagie.text.Document();
            com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
            document.open();

            com.lowagie.text.Font titleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 18);
            com.lowagie.text.Font headerFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 10);
            com.lowagie.text.Font bodyFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 8);

            com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph("BAO CAO DOANH THU & THANH TOAN", titleFont);
            title.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            document.add(new com.lowagie.text.Paragraph("Ngay xuat: " + LocalDateTime.now().toString(), bodyFont));
            document.add(new com.lowagie.text.Paragraph("Tong so hoa don: " + list.size(), bodyFont));
            double total = list.stream().mapToDouble(PaymentHistoryResponse::getAmount).sum();
            document.add(new com.lowagie.text.Paragraph("Tong doanh thu: " + String.format("%,.0f VND", total), bodyFont));
            document.add(new com.lowagie.text.Paragraph(" ", bodyFont));
 
            com.lowagie.text.Table table = new com.lowagie.text.Table(7);
            table.setWidth(100);
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("Ma HD", headerFont)));
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("Ban", headerFont)));
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("Khach hang", headerFont)));
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("P.Thuc", headerFont)));
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("Tong tien", headerFont)));
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("Thoi gian", headerFont)));
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("Thu ngan", headerFont)));
 
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
            for (PaymentHistoryResponse res : list) {
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("INV-" + res.getPaymentId(), bodyFont)));
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph(res.getTableNumber() != null ? "Ban " + res.getTableNumber() : "—", bodyFont)));
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph(res.getCustomerName(), bodyFont)));
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph(res.getPaymentMethod(), bodyFont)));
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph(String.format("%,.0f VND", res.getAmount()), bodyFont)));
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph(res.getPaidAt() != null ? res.getPaidAt().format(formatter) : "", bodyFont)));
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph(res.getConfirmedBy() != null ? res.getConfirmedBy() : "System", bodyFont)));
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Loi xuat PDF: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] getInvoicePdf(Long paymentId) {
        PaymentHistoryResponse res = getPaymentDetail(paymentId);

        try (java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            com.lowagie.text.Document document = new com.lowagie.text.Document();
            com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
            document.open();

            com.lowagie.text.Font titleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 16);
            com.lowagie.text.Font subTitleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 12);
            com.lowagie.text.Font bodyFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 10);
            com.lowagie.text.Font bodyBoldFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 10);

            com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph("HOA DON THANH TOAN (INVOICE)", titleFont);
            title.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            title.setSpacingAfter(15);
            document.add(title);

            document.add(new com.lowagie.text.Paragraph("Ma hoa don (Invoice ID): INV-" + res.getPaymentId(), bodyBoldFont));
            document.add(new com.lowagie.text.Paragraph("Ban (Table): " + (res.getTableNumber() != null ? "Ban " + res.getTableNumber() : "—"), bodyFont));
            document.add(new com.lowagie.text.Paragraph("Khach hang (Customer): " + res.getCustomerName(), bodyFont));
            document.add(new com.lowagie.text.Paragraph("So dien thoai (Phone): " + res.getCustomerPhone(), bodyFont));
            document.add(new com.lowagie.text.Paragraph("Phuong thuc (Method): " + res.getPaymentMethod(), bodyFont));
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            document.add(new com.lowagie.text.Paragraph("Thoi gian (Time): " + (res.getPaidAt() != null ? res.getPaidAt().format(formatter) : ""), bodyFont));
            document.add(new com.lowagie.text.Paragraph("Nhan vien xac nhan (Cashier): " + (res.getConfirmedBy() != null ? res.getConfirmedBy() : "System"), bodyFont));
            document.add(new com.lowagie.text.Paragraph("--------------------------------------------------------------------------------", bodyFont));

            com.lowagie.text.Table table = new com.lowagie.text.Table(4);
            table.setWidth(100);
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("Mon an (Item)", bodyBoldFont)));
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("SL (Qty)", bodyBoldFont)));
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("Don gia (Price)", bodyBoldFont)));
            table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph("Thanh tien (Sub)", bodyBoldFont)));

            for (com.qrorder.dto.payment.PaymentItemResponse item : res.getItems()) {
                String itemName = item.getMenuItemName();
                if (item.getOptions() != null && !item.getOptions().isEmpty()) {
                    itemName += "\n  + " + String.join("\n  + ", item.getOptions());
                }
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph(itemName, bodyFont)));
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph(String.valueOf(item.getQuantity()), bodyFont)));
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph(String.format("%,.0f VND", item.getUnitPrice()), bodyFont)));
                table.addCell(new com.lowagie.text.Cell(new com.lowagie.text.Paragraph(String.format("%,.0f VND", item.getSubtotal()), bodyFont)));
            }
            document.add(table);
  
            document.add(new com.lowagie.text.Paragraph("--------------------------------------------------------------------------------", bodyFont));
            document.add(new com.lowagie.text.Paragraph("Tam tinh (Subtotal): " + String.format("%,.0f VND", res.getSubtotal()), bodyFont));
            document.add(new com.lowagie.text.Paragraph("Phi dich vu (Service charge 5%): " + String.format("%,.0f VND", res.getServiceCharge()), bodyFont));
            document.add(new com.lowagie.text.Paragraph("Thue (VAT 8%): " + String.format("%,.0f VND", res.getTaxAmount()), bodyFont));
            document.add(new com.lowagie.text.Paragraph("Giam gia (Discount): " + String.format("%,.0f VND", res.getDiscountAmount()), bodyFont));
            document.add(new com.lowagie.text.Paragraph("Tong cong (Total Amount): " + String.format("%,.0f VND", res.getAmount()), titleFont));
            document.add(new com.lowagie.text.Paragraph("\nCam on quy khach! Thank you!", subTitleFont));

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Loi in hoa don PDF: " + e.getMessage(), e);
        }
    }
}
