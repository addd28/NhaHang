package com.qrorder.service.impl;

import com.qrorder.dto.table.request.CreateTableRequest;
import com.qrorder.dto.table.request.UpdateTableRequest;
import com.qrorder.dto.table.request.ReserveTableRequest;
import com.qrorder.dto.table.response.CheckInByCodeResponse;
import com.qrorder.dto.table.response.TableResponse;

import com.qrorder.entity.Order;
import com.qrorder.entity.OrderItem;
import com.qrorder.entity.Reservation;
import com.qrorder.entity.RestaurantTable;
import com.qrorder.entity.TableSession;

import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.entity.enums.ReservationStatus;
import com.qrorder.entity.enums.SessionStatus;
import com.qrorder.entity.enums.TableStatus;

import com.qrorder.repository.OrderItemRepository;
import com.qrorder.repository.OrderRepository;
import com.qrorder.repository.ReservationRepository;
import com.qrorder.repository.RestaurantTableRepository;
import com.qrorder.repository.TableSessionRepository;

import com.qrorder.service.TableService;

import jakarta.transaction.Transactional;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor

public class TableServiceImpl
        implements TableService {

    private final RestaurantTableRepository tableRepository;

    private final TableSessionRepository tableSessionRepository;

    private final ReservationRepository reservationRepository;

    private final OrderRepository orderRepository;

    private final OrderItemRepository orderItemRepository;

    private final com.qrorder.repository.UserRepository userRepository;

    private TableResponse mapToResponse(RestaurantTable table) {
        TableResponse response = new TableResponse(
                table.getId(),
                table.getTableNumber(),
                table.getCapacity(),
                table.getQrToken(),
                table.getStatus()
        );
        response.setTableKey(table.getTableKey());

        if (table.getStatus() == TableStatus.RESERVED) {
            List<Reservation> reservations = reservationRepository.findByTableId(table.getId());
            reservations.stream()
                    .filter(r -> r.getStatus() == ReservationStatus.BOOKED)
                    .findFirst()
                    .ifPresent(r -> {
                        response.setCustomerName(r.getCustomerName());
                        response.setPhone(r.getPhone());
                        response.setGuestCount(r.getGuestCount());
                        response.setReservationTime(r.getReservationTime());
                        response.setNote(r.getNote());
                        response.setConfirmationCode(r.getConfirmationCode());
                        response.setReservationCode(r.getReservationCode());
                    });
        }
        return response;
    }

    @Override
    @Transactional
    public void createTable(
            CreateTableRequest request
    ) {

        if (request.getCapacity() <= 0) {
            throw new RuntimeException(
                    "Capacity must be greater than 0"
            );
        }

        if (tableRepository.existsByTableNumber(request.getTableNumber())) {
            throw new RuntimeException(
                    "Table number already exists"
            );
        }

        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder randomSuffix = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < 4; i++) {
            randomSuffix.append(chars.charAt(random.nextInt(chars.length())));
        }
        String tableKey = "TB" + request.getTableNumber() + "-" + randomSuffix.toString();

        RestaurantTable table =
                RestaurantTable.builder()
                        .tableNumber(
                                request.getTableNumber()
                        )
                        .capacity(
                                request.getCapacity()
                        )
                        .qrToken(
                                UUID.randomUUID()
                                        .toString()
                        )
                        .tableKey(tableKey)
                        .status(
                                TableStatus.EMPTY
                        )
                        .build();

        RestaurantTable savedTable = tableRepository.save(
                table
        );
        generateAndSaveQRImage(savedTable.getTableNumber(), savedTable.getQrToken(), savedTable.getTableKey());
    }

    private void generateAndSaveQRImage(Integer tableNumber, String qrToken, String tableKey) {
        try {
            String qrUrl = "http://localhost:8080/customer/menu?tableKey=" + tableKey;
            String apiUri = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + java.net.URLEncoder.encode(qrUrl, "UTF-8");
            java.net.URL url = new java.net.URL(apiUri);
            java.io.File qrDir = new java.io.File("uploads/qr");
            if (!qrDir.exists()) {
                qrDir.mkdirs();
            }
            java.io.File qrFile = new java.io.File(qrDir, qrToken + ".png");
            try (java.io.InputStream in = url.openStream();
                 java.io.FileOutputStream out = new java.io.FileOutputStream(qrFile)) {
                byte[] buffer = new byte[1024];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to generate and save QR image: " + e.getMessage());
        }
    }


    @Override
    @Transactional
    public void updateTable(
            Long id,
            UpdateTableRequest request
    ) {

        RestaurantTable table =
                tableRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Table not found"
                                )
                        );

        if (request.getCapacity() <= 0) {
            throw new RuntimeException(
                    "Capacity must be greater than 0"
            );
        }

        if (!table.getTableNumber().equals(request.getTableNumber())
                && tableRepository.existsByTableNumber(request.getTableNumber())) {
            throw new RuntimeException(
                    "Table number already exists"
            );
        }

        table.setTableNumber(request.getTableNumber());
        table.setCapacity(request.getCapacity());

        tableRepository.save(table);
    }

    @Override
    @Transactional
    public void deleteTable(Long id) {

        RestaurantTable table =
                tableRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Table not found"
                                )
                        );

        if (table.getStatus() != TableStatus.EMPTY) {
            throw new RuntimeException(
                    "Cannot delete table that is not EMPTY"
            );
        }

        tableRepository.delete(table);
    }


    @Override
    public List<TableResponse> getTables() {
        // Single restaurant: always return all tables
        List<RestaurantTable> tables = tableRepository.findAll();
        return tables.stream()
                .map(this::mapToResponse)
                .toList();
    }

    private String generateConfirmationCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    @Override
    @Transactional
    public Map<String, Object> reserveTable(
            Long tableId,
            ReserveTableRequest request
    ) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new RuntimeException("Table not found"));

        if (table.getStatus() != TableStatus.EMPTY) {
            throw new RuntimeException("Table unavailable");
        }

        table.setStatus(TableStatus.RESERVED);
        tableRepository.save(table);

        // Generate a unique 6-digit confirmation code
        String code;
        do {
            code = generateConfirmationCode();
        } while (reservationRepository.findByConfirmationCode(code).isPresent());

        Reservation reservation = Reservation.builder()
                .customerName(request.getCustomerName())
                .phone(request.getPhone())
                .confirmationCode(code)
                .guestCount(request.getGuestCount())
                .reservationTime(request.getReservationTime())
                .note(request.getNote())
                .status(ReservationStatus.BOOKED)
                .createdAt(LocalDateTime.now())
                .table(table)
                .build();

        Reservation savedReservation = reservationRepository.save(reservation);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Reserve table success");
        result.put("reservationId", savedReservation.getId());
        result.put("confirmationCode", code);
        result.put("tableNumber", table.getTableNumber());
        result.put("status", savedReservation.getStatus().name());
        result.put("customerName", savedReservation.getCustomerName());
        return result;
    }

    private String generateReservationCode() {
        return "RB-" + String.format(
                "%06d",
                java.util.concurrent.ThreadLocalRandom.current().nextInt(100000, 1000000)
        );
    }

    private boolean isTableAvailableForSlot(RestaurantTable table, LocalDateTime start, LocalDateTime end, Long excludeReservationId) {
        // 1. Check reservation overlap
        List<Reservation> existingReservations = reservationRepository.findByTableId(table.getId());
        for (Reservation existing : existingReservations) {
            if (excludeReservationId != null && existing.getId().equals(excludeReservationId)) {
                continue;
            }
            boolean isBlockingStatus = existing.getStatus() == ReservationStatus.BOOKED 
                    || existing.getStatus() == ReservationStatus.SEATED;
            if (isBlockingStatus) {
                LocalDateTime extStart = existing.getTimeSlotStart() != null ? existing.getTimeSlotStart() : existing.getReservationTime();
                LocalDateTime extEnd = existing.getTimeSlotEnd() != null ? existing.getTimeSlotEnd() : extStart.plusHours(2);
                if (extStart.isBefore(end) && extEnd.isAfter(start)) {
                    return false;
                }
            }
        }
        
        // 2. Check active session overlap
        Optional<TableSession> activeSessionOpt = tableSessionRepository.findByTableIdAndStatus(table.getId(), SessionStatus.OPEN);
        if (activeSessionOpt.isPresent()) {
            TableSession session = activeSessionOpt.get();
            LocalDateTime sessionStart = session.getStartTime();
            LocalDateTime sessionEnd = sessionStart.plusHours(2);
            if (sessionStart.isBefore(end) && sessionEnd.isAfter(start)) {
                return false;
            }
        }
        return true;
    }

    @Override
    @Transactional
    public Map<String, Object> reserveSlot(ReserveTableRequest request) {
        LocalDateTime now = LocalDateTime.now();

        // Validate: reservation must be at least 2 hours in the future
        if (request.getReservationTime() != null && request.getReservationTime().isBefore(now.plusHours(2))) {
            throw new RuntimeException("Đặt bàn phải trước ít nhất 2 giờ.");
        }

        // Generate confirmation code for compatibility
        String legacyCode;
        do {
            legacyCode = generateConfirmationCode();
        } while (reservationRepository.findByConfirmationCode(legacyCode).isPresent());

        // Generate unique reservation code
        String reservationCode;
        do {
            reservationCode = generateReservationCode();
        } while (reservationRepository.findByReservationCode(reservationCode).isPresent());

        LocalDateTime timeSlotStart = request.getReservationTime();
        LocalDateTime timeSlotEnd = timeSlotStart.plusHours(2);
        LocalDateTime holdUntil = timeSlotStart.plusMinutes(10);

        Reservation reservation = Reservation.builder()
                .customerName(request.getCustomerName())
                .phone(request.getPhone())
                .confirmationCode(legacyCode)
                .reservationCode(reservationCode)
                .guestCount(request.getGuestCount())
                .reservationTime(request.getReservationTime())
                .timeSlotStart(timeSlotStart)
                .timeSlotEnd(timeSlotEnd)
                .note(request.getNote())
                .status(ReservationStatus.BOOKED)
                .createdAt(now)
                .confirmedAt(now)
                .holdUntil(holdUntil)
                .table(null)
                .build();

        Reservation savedReservation = reservationRepository.save(reservation);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Reserve slot success");
        result.put("reservationId", savedReservation.getId());
        result.put("confirmationCode", legacyCode);
        result.put("reservationCode", reservationCode);
        result.put("tableNumber", null);
        result.put("status", savedReservation.getStatus().name());
        result.put("customerName", savedReservation.getCustomerName());
        return result;
    }

    @Override
    public List<com.qrorder.dto.table.response.ReservationResponse> getReservations() {
        java.time.LocalDate today = java.time.LocalDate.now();
        return reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == ReservationStatus.BOOKED)
                .sorted((r1, r2) -> {
                    java.time.LocalDate d1 = r1.getReservationTime().toLocalDate();
                    java.time.LocalDate d2 = r2.getReservationTime().toLocalDate();
                    boolean isToday1 = d1.isEqual(today);
                    boolean isToday2 = d2.isEqual(today);

                    if (isToday1 && !isToday2) return -1;
                    if (!isToday1 && isToday2) return 1;
                    return r1.getReservationTime().compareTo(r2.getReservationTime());
                })
                .map(r -> com.qrorder.dto.table.response.ReservationResponse.builder()
                        .id(r.getId())
                        .customerName(r.getCustomerName())
                        .phone(r.getPhone())
                        .confirmationCode(r.getConfirmationCode())
                        .reservationCode(r.getReservationCode())
                        .guestCount(r.getGuestCount())
                        .reservationTime(r.getReservationTime())
                        .note(r.getNote())
                        .status(r.getStatus().name())
                        .createdAt(r.getCreatedAt())
                        .tableNumber(r.getTable() != null ? r.getTable().getTableNumber() : null)
                        .confirmedAt(r.getConfirmedAt())
                        .holdUntil(r.getHoldUntil())
                        .checkedInAt(r.getCheckedInAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public CheckInByCodeResponse checkInByCode(String confirmationCode) {

        Reservation reservation = reservationRepository
                .findByConfirmationCode(confirmationCode)
                .orElseThrow(() -> new RuntimeException(
                        "Mã xác nhận không hợp lệ hoặc đã được sử dụng!"
                ));

        if (reservation.getStatus() != ReservationStatus.BOOKED) {
            throw new RuntimeException(
                    "Mã xác nhận này đã được check-in hoặc đã bị huỷ!"
            );
        }

        RestaurantTable table = reservation.getTable();
        if (table == null) {
            // Find an EMPTY table with capacity >= guestCount
            List<RestaurantTable> emptyTables = tableRepository.findAll().stream()
                    .filter(t -> t.getStatus() == TableStatus.EMPTY
                            && t.getCapacity() >= reservation.getGuestCount())
                    .sorted(java.util.Comparator.comparingInt(RestaurantTable::getCapacity))
                    .toList();

            if (emptyTables.isEmpty()) {
                reservation.setStatus(ReservationStatus.BOOKED);
                reservationRepository.save(reservation);

                return CheckInByCodeResponse.builder()
                        .sessionId(null)
                        .tableNumber(null)
                        .customerName(reservation.getCustomerName())
                        .phone(reservation.getPhone())
                        .guestCount(reservation.getGuestCount())
                        .preOrderCount(0)
                        .message("Nhà hàng hiện tại đã hết bàn trống phù hợp!")
                        .build();
            }
            table = emptyTables.get(0);
            reservation.setTable(table);
            reservationRepository.save(reservation);
        }

        Long sessionId = checkIn(table.getId());

        // Promote all WAIT_CONFIRM items to PENDING so kitchen can see them
        List<Order> preOrders = orderRepository.findByReservationId(reservation.getId());
        int preOrderCount = 0;
        for (Order order : preOrders) {
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    if (item.getStatus() == OrderItemStatus.WAIT_CONFIRM) {
                        item.setStatus(OrderItemStatus.PENDING);
                        preOrderCount++;
                    }
                }
            }
        }
        orderRepository.saveAll(preOrders);

        return CheckInByCodeResponse.builder()
                .sessionId(sessionId)
                .tableNumber(table.getTableNumber())
                .customerName(reservation.getCustomerName())
                .phone(reservation.getPhone())
                .guestCount(reservation.getGuestCount())
                .preOrderCount(preOrderCount)
                .message("Check-in thành công! Có " + preOrderCount + " món đặt trước được chuyển cho bếp.")
                .build();
    }

    @Override
    @Transactional
    public Long checkIn(
            Long tableId
    ) {

        RestaurantTable table =

                tableRepository
                        .findById(tableId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Table not found"
                                )
                        );

        Optional<TableSession> existingSession =
                tableSessionRepository
                        .findByTableIdAndStatus(
                                tableId,
                                SessionStatus.OPEN
                        );

        if (existingSession.isPresent()) {
            return existingSession
                    .get()
                    .getId();
        }

        // Allowed if there is no active session (even if table status is OCCUPIED due to previous mismatch)

        List<Reservation> reservations =
                reservationRepository.findByTableId(tableId);

        Reservation activeReservation =
                reservations.stream()
                        .filter(reservation -> reservation.getStatus() == ReservationStatus.BOOKED)
                        .findFirst()
                        .orElse(null);

        reservations.forEach(reservation -> {
            if (reservation.getStatus() == ReservationStatus.BOOKED) {
                reservation.setStatus(ReservationStatus.SEATED);
            }
        });

        reservationRepository.saveAll(
                reservations
        );

        table.setStatus(
                TableStatus.OCCUPIED
        );

        tableRepository.save(
                table
        );

        TableSession session =

                TableSession.builder()

                        .table(table)

                        .status(
                                SessionStatus.OPEN
                        )

                        .startTime(
                                LocalDateTime.now()
                        )

                        .reservation(activeReservation)

                        .customerName(

                                activeReservation != null
                                        ? activeReservation.getCustomerName()
                                        : null
                        )

                        .customerPhone(

                                activeReservation != null
                                        ? activeReservation.getPhone()
                                        : null
                        )

                        .note(

                                activeReservation != null
                                        ? activeReservation.getNote()
                                        : null
                        )
                        .build();


        TableSession savedSession =
                tableSessionRepository
                        .save(session);

        if (activeReservation != null) {
            List<Order> preOrders = orderRepository.findByReservationId(activeReservation.getId());
            for (Order preOrder : preOrders) {
                preOrder.setSession(savedSession);
                // Promote WAIT_CONFIRM items to PENDING so kitchen sees them
                if (preOrder.getItems() != null) {
                    for (OrderItem item : preOrder.getItems()) {
                        if (item.getStatus() == OrderItemStatus.WAIT_CONFIRM) {
                            item.setStatus(OrderItemStatus.PENDING);
                        }
                    }
                }
            }
            orderRepository.saveAll(preOrders);
        }

        return savedSession.getId();
    }

    @Override
    @Transactional
    public void resetTable(Long tableId) {

        RestaurantTable table =
                tableRepository
                        .findById(tableId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Table not found"
                                )
                        );

        if (table.getStatus() == TableStatus.EMPTY) {
            throw new RuntimeException(
                    "Table already empty"
            );
        }

        if (table.getStatus() == TableStatus.RESERVED) {
            List<Reservation> reservations = reservationRepository.findByTableId(tableId);
            reservations.forEach(r -> {
                if (r.getStatus() == ReservationStatus.BOOKED) {
                    r.setStatus(ReservationStatus.CANCELLED);
                }
            });
            reservationRepository.saveAll(reservations);
        } else {
            TableSession session = tableSessionRepository
                    .findByTableIdAndStatus(
                            tableId,
                            SessionStatus.OPEN
                    )
                    .orElse(null);

            if (session != null) {
                session.setStatus(
                        SessionStatus.CLOSED
                );

                session.setEndTime(
                        LocalDateTime.now()
                );

                session.setClosedAt(
                        LocalDateTime.now()
                );

                tableSessionRepository.save(
                        session
                );
            }
        }

        table.setStatus(
                TableStatus.EMPTY
        );

        tableRepository.save(
                table
        );


    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public com.qrorder.dto.table.response.AdminLookupResponse adminLookup(String code) {
        Reservation reservation = reservationRepository.findByReservationCode(code.trim())
                .orElseThrow(() -> new RuntimeException("Reservation code not found"));


        if (reservation.getStatus() == ReservationStatus.CANCELLED || reservation.getStatus() == ReservationStatus.NO_SHOW) {
            throw new RuntimeException("Reservation is no longer valid");
        }
        if (reservation.getStatus() == ReservationStatus.SEATED || reservation.getStatus() == ReservationStatus.COMPLETED) {
            throw new RuntimeException("Reservation already checked in");
        }

        String tableNumFormatted = null;
        if (reservation.getTable() != null) {
            tableNumFormatted = String.format("A%02d", reservation.getTable().getTableNumber());
        }

        return com.qrorder.dto.table.response.AdminLookupResponse.builder()
                .reservationId(reservation.getId())
                .customerName(reservation.getCustomerName())
                .reservationCode(reservation.getReservationCode())
                .reservationTime(reservation.getReservationTime())
                .guestCount(reservation.getGuestCount())
                .tableNumber(tableNumFormatted)
                .status(reservation.getStatus().name())
                .build();
    }

    @Override
    @Transactional
    public com.qrorder.dto.table.response.AdminCheckInResponse adminCheckIn(String code) {
        java.util.Optional<Reservation> resOpt = reservationRepository.findByReservationCodeForUpdate(code.trim());
        if (resOpt.isEmpty()) {
            return com.qrorder.dto.table.response.AdminCheckInResponse.builder()
                    .success(false)
                    .message("Reservation code not found")
                    .build();
        }

        Reservation reservation = resOpt.get();

        if (reservation.getStatus() == ReservationStatus.CANCELLED || reservation.getStatus() == ReservationStatus.NO_SHOW) {
            return com.qrorder.dto.table.response.AdminCheckInResponse.builder()
                    .success(false)
                    .message("Reservation is no longer valid")
                    .build();
        }
        if (reservation.getStatus() == ReservationStatus.SEATED || reservation.getStatus() == ReservationStatus.COMPLETED) {
            return com.qrorder.dto.table.response.AdminCheckInResponse.builder()
                    .success(false)
                    .message("Reservation already checked in")
                    .build();
        }

        LocalDateTime now = LocalDateTime.now();

        RestaurantTable table = reservation.getTable();
        if (table == null) {
            return com.qrorder.dto.table.response.AdminCheckInResponse.builder()
                    .success(false)
                    .message("No table assigned to this reservation")
                    .build();
        }

        RestaurantTable lockedTable = tableRepository.findByIdForUpdate(table.getId())
                .orElseThrow(() -> new RuntimeException("Table not found"));

        if (lockedTable.getStatus() == TableStatus.OCCUPIED) {
            return com.qrorder.dto.table.response.AdminCheckInResponse.builder()
                    .success(false)
                    .message("Table is not available")
                    .build();
        }

        // Update reservation details
        reservation.setStatus(ReservationStatus.SEATED);
        reservation.setConfirmedAt(now);
        reservation.setCheckedInAt(now);
        reservationRepository.save(reservation);

        // Update table details
        lockedTable.setStatus(TableStatus.OCCUPIED);
        tableRepository.save(lockedTable);

        // Open TableSession using existing checkIn logic
        Long sessionId = checkIn(lockedTable.getId());

        String tableNumFormatted = String.format("A%02d", lockedTable.getTableNumber());

        return com.qrorder.dto.table.response.AdminCheckInResponse.builder()
                .success(true)
                .reservationId(reservation.getId())
                .tableId(lockedTable.getId())
                .tableNumber(tableNumFormatted)
                .guestCount(reservation.getGuestCount())
                .message("Check-in successful")
                .build();
    }

    @Override
    public Map<String, Object> getOccupancy(java.time.LocalDateTime dateTime) {
        LocalDateTime start = dateTime.minusHours(2);
        LocalDateTime end = dateTime.plusHours(2);

        List<Reservation> activeReservations = reservationRepository.findByReservationTimeBetween(start, end).stream()
                .filter(r -> r.getStatus() == ReservationStatus.BOOKED || r.getStatus() == ReservationStatus.SEATED)
                .toList();

        long count = activeReservations.size();
        long totalTables = tableRepository.count();
        if (totalTables <= 0) totalTables = 20;

        String status;
        String message;

        double ratio = (double) count / totalTables;
        if (ratio < 0.7) {
            status = "PLENTY";
            message = "Còn nhiều chỗ";
        } else if (ratio < 1.0) {
            status = "NEAR_FULL";
            message = "Khung giờ gần kín";
        } else {
            status = "CROWDED";
            message = "Khung giờ đã rất đông. Nhà hàng sẽ ưu tiên sắp xếp bàn khi quý khách đến. Nếu có thay đổi nhân viên sẽ liên hệ.";
        }

        Map<String, Object> result = new HashMap<>();
        result.put("status", status);
        result.put("message", message);
        result.put("count", count);
        result.put("totalTables", totalTables);
        return result;
    }
    @Override
    public TableSession getActiveSessionByTableKey(String tableKey) {
        RestaurantTable table = tableRepository.findByTableKey(tableKey)
                .orElseThrow(() -> new RuntimeException("TABLE_NOT_ACTIVE"));

        return tableSessionRepository.findFirstByTableIdAndStatus(table.getId(), SessionStatus.OPEN)
                .orElseThrow(() -> new RuntimeException("TABLE_NOT_ACTIVE"));
    }

    @Override
    public TableSession getSessionById(Long sessionId) {
        return tableSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
    }

    @Override
    @Transactional
    public void cancelReservation(Long id) {
        Reservation res = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đặt bàn."));

        if (res.getStatus() == ReservationStatus.CANCELLED || res.getStatus() == ReservationStatus.NO_SHOW) {
            return;
        }

        res.setStatus(ReservationStatus.CANCELLED);
        RestaurantTable table = res.getTable();
        if (table != null) {
            RestaurantTable lockedTable = tableRepository.findByIdForUpdate(table.getId()).orElse(null);
            if (lockedTable != null && lockedTable.getStatus() == TableStatus.RESERVED) {
                lockedTable.setStatus(TableStatus.EMPTY);
                tableRepository.save(lockedTable);
            }
        }
        reservationRepository.save(res);
    }

    @Override
    @Transactional
    public com.qrorder.dto.table.response.AdminCheckInResponse checkInReservation(Long id, Long tableId) {
        System.out.println("========== CHECK IN ==========");
        System.out.println("Reservation ID = " + id);
        System.out.println("Table ID = " + tableId);

        // Validation 1: Reservation exists
        Optional<Reservation> resOpt = reservationRepository.findById(id);
        System.out.println("Reservation Present = " + resOpt.isPresent());
        if (resOpt.isEmpty()) {
            System.out.println("FAIL: reservation not found");
            throw new com.qrorder.exception.CheckInException(
                    "RESERVATION_NOT_FOUND",
                    "Không tìm thấy đặt bàn với ID này.",
                    org.springframework.http.HttpStatus.BAD_REQUEST
            );
        }
        Reservation reservation = resOpt.get();
        System.out.println("Reservation = " + reservation);
        System.out.println("Reservation Status = " + reservation.getStatus());
        System.out.println("Assigned Table = " + reservation.getTable());

        // Validation 2: Reservation status == BOOKED
        if (reservation.getStatus() != ReservationStatus.BOOKED) {
            System.out.println("FAIL: reservation status is not BOOKED");
            System.out.println("FAIL: reservation already checked in or cancelled");
            throw new com.qrorder.exception.CheckInException(
                    "INVALID_RESERVATION_STATUS",
                    "Chỉ reservation BOOKED mới được check-in.",
                    org.springframework.http.HttpStatus.BAD_REQUEST
            );
        }

        // Validation 3: Selected table exists
        Optional<RestaurantTable> tableOpt = tableRepository.findByIdForUpdate(tableId);
        System.out.println("Table Present = " + tableOpt.isPresent());
        if (tableOpt.isEmpty()) {
            System.out.println("FAIL: Selected table does not exist");
            throw new com.qrorder.exception.CheckInException(
                    "TABLE_NOT_FOUND",
                    "Bàn không tồn tại.",
                    org.springframework.http.HttpStatus.BAD_REQUEST
            );
        }
        RestaurantTable lockedTable = tableOpt.get();
        System.out.println("Selected Table = " + lockedTable);
        System.out.println("Selected Table Status = " + lockedTable.getStatus());

        // Validation 4: No ACTIVE TableSession exists
        Optional<TableSession> activeSession = tableSessionRepository.findByTableIdAndStatus(tableId, SessionStatus.OPEN);
        System.out.println("Active Session = " + activeSession.orElse(null));

        if (activeSession.isPresent()) {
            if (lockedTable.getStatus() == TableStatus.EMPTY) {
                System.out.println("FAIL: Table state inconsistent: status=EMPTY activeSession exists");
                throw new com.qrorder.exception.CheckInException(
                        "TABLE_OCCUPIED",
                        "Bàn vẫn còn một phiên sử dụng chưa đóng.",
                        org.springframework.http.HttpStatus.CONFLICT
                );
            } else {
                System.out.println("FAIL: table occupied");
                throw new com.qrorder.exception.CheckInException(
                        "TABLE_NOT_EMPTY",
                        "Bàn đang được sử dụng.",
                        org.springframework.http.HttpStatus.BAD_REQUEST
                );
            }
        }

        // Assign the selected table to the reservation
        reservation.setTable(lockedTable);
        reservationRepository.save(reservation);

        // Open TableSession and link orders
        Long sessionId = checkIn(lockedTable.getId());

        // Update reservation details AFTER checkIn (since checkIn queries active reservations)
        reservation.setStatus(ReservationStatus.SEATED);
        reservation.setConfirmedAt(LocalDateTime.now());
        reservation.setCheckedInAt(LocalDateTime.now());
        reservationRepository.save(reservation);

        String tableNumFormatted = String.format("A%02d", lockedTable.getTableNumber());

        return com.qrorder.dto.table.response.AdminCheckInResponse.builder()
                .success(true)
                .reservationId(reservation.getId())
                .tableId(lockedTable.getId())
                .tableNumber(tableNumFormatted)
                .guestCount(reservation.getGuestCount())
                .message("Check-in thành công")
                .build();
    }

    @Override
    public List<com.qrorder.dto.table.response.ReservationResponse> getHistoryReservations() {
        return reservationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(r -> com.qrorder.dto.table.response.ReservationResponse.builder()
                        .id(r.getId())
                        .customerName(r.getCustomerName())
                        .phone(r.getPhone())
                        .confirmationCode(r.getConfirmationCode())
                        .reservationCode(r.getReservationCode())
                        .guestCount(r.getGuestCount())
                        .reservationTime(r.getReservationTime())
                        .note(r.getNote())
                        .status(r.getStatus().name())
                        .createdAt(r.getCreatedAt())
                        .tableNumber(r.getTable() != null ? r.getTable().getTableNumber() : null)
                        .confirmedAt(r.getConfirmedAt())
                        .holdUntil(r.getHoldUntil())
                        .checkedInAt(r.getCheckedInAt())
                        .build())
                .toList();
    }

    @Override
    public List<com.qrorder.dto.table.response.ReservationResponse> searchReservations(String q) {
        return reservationRepository.searchReservations(q.trim()).stream()
                .map(r -> com.qrorder.dto.table.response.ReservationResponse.builder()
                        .id(r.getId())
                        .customerName(r.getCustomerName())
                        .phone(r.getPhone())
                        .confirmationCode(r.getConfirmationCode())
                        .reservationCode(r.getReservationCode())
                        .guestCount(r.getGuestCount())
                        .reservationTime(r.getReservationTime())
                        .note(r.getNote())
                        .status(r.getStatus().name())
                        .createdAt(r.getCreatedAt())
                        .tableNumber(r.getTable() != null ? r.getTable().getTableNumber() : null)
                        .confirmedAt(r.getConfirmedAt())
                        .holdUntil(r.getHoldUntil())
                        .checkedInAt(r.getCheckedInAt())
                        .build())
                .toList();
    }

    @Override
    public Map<String, Object> getReservationDashboardStats() {
        java.time.LocalDate today = java.time.LocalDate.now();
        LocalDateTime startToday = today.atStartOfDay();
        LocalDateTime endToday = today.atTime(23, 59, 59);

        List<Reservation> allReservations = reservationRepository.findAll();

        // Stats for today
        long bookedToday = allReservations.stream()
                .filter(r -> r.getReservationTime().isAfter(startToday) && r.getReservationTime().isBefore(endToday))
                .filter(r -> r.getStatus() == ReservationStatus.BOOKED)
                .count();

        long seatedToday = allReservations.stream()
                .filter(r -> r.getReservationTime().isAfter(startToday) && r.getReservationTime().isBefore(endToday))
                .filter(r -> r.getStatus() == ReservationStatus.SEATED)
                .count();

        long completedToday = allReservations.stream()
                .filter(r -> r.getReservationTime().isAfter(startToday) && r.getReservationTime().isBefore(endToday))
                .filter(r -> r.getStatus() == ReservationStatus.COMPLETED)
                .count();

        long noShowToday = allReservations.stream()
                .filter(r -> r.getReservationTime().isAfter(startToday) && r.getReservationTime().isBefore(endToday))
                .filter(r -> r.getStatus() == ReservationStatus.NO_SHOW)
                .count();

        long cancelledToday = allReservations.stream()
                .filter(r -> r.getReservationTime().isAfter(startToday) && r.getReservationTime().isBefore(endToday))
                .filter(r -> r.getStatus() == ReservationStatus.CANCELLED)
                .count();

        long totalToday = allReservations.stream()
                .filter(r -> r.getReservationTime().isAfter(startToday) && r.getReservationTime().isBefore(endToday))
                .count();

        double successRate = totalToday > 0 ? (((double) (seatedToday + completedToday)) / totalToday) * 100 : 0.0;

        // Chart Data (7 Days and 30 Days)
        List<Map<String, Object>> chart7Days = new java.util.ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            java.time.LocalDate date = today.minusDays(i);
            chart7Days.add(getStatsForDate(allReservations, date));
        }

        List<Map<String, Object>> chart30Days = new java.util.ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            java.time.LocalDate date = today.minusDays(i);
            chart30Days.add(getStatsForDate(allReservations, date));
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalToday", totalToday);
        stats.put("bookedToday", bookedToday);
        stats.put("seatedToday", seatedToday);
        stats.put("completedToday", completedToday);
        stats.put("noShowToday", noShowToday);
        stats.put("cancelledToday", cancelledToday);
        stats.put("successRate", Math.round(successRate * 10.0) / 10.0);
        stats.put("chart7Days", chart7Days);
        stats.put("chart30Days", chart30Days);
        return stats;
    }

    private Map<String, Object> getStatsForDate(List<Reservation> all, java.time.LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(23, 59, 59);

        long booked = all.stream()
                .filter(r -> r.getReservationTime().isAfter(start) && r.getReservationTime().isBefore(end))
                .filter(r -> r.getStatus() == ReservationStatus.BOOKED)
                .count();

        long seated = all.stream()
                .filter(r -> r.getReservationTime().isAfter(start) && r.getReservationTime().isBefore(end))
                .filter(r -> r.getStatus() == ReservationStatus.SEATED)
                .count();

        long completed = all.stream()
                .filter(r -> r.getReservationTime().isAfter(start) && r.getReservationTime().isBefore(end))
                .filter(r -> r.getStatus() == ReservationStatus.COMPLETED)
                .count();

        long noShow = all.stream()
                .filter(r -> r.getReservationTime().isAfter(start) && r.getReservationTime().isBefore(end))
                .filter(r -> r.getStatus() == ReservationStatus.NO_SHOW)
                .count();

        long cancelled = all.stream()
                .filter(r -> r.getReservationTime().isAfter(start) && r.getReservationTime().isBefore(end))
                .filter(r -> r.getStatus() == ReservationStatus.CANCELLED)
                .count();

        Map<String, Object> dayStats = new HashMap<>();
        dayStats.put("date", date.toString());
        dayStats.put("booked", booked);
        dayStats.put("seated", seated);
        dayStats.put("completed", completed);
        dayStats.put("noShow", noShow);
        dayStats.put("cancelled", cancelled);
        return dayStats;
    }
}
