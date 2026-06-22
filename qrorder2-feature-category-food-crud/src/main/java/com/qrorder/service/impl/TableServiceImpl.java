package com.qrorder.service.impl;

import com.qrorder.dto.table.request.CreateTableRequest;
import com.qrorder.dto.table.request.UpdateTableRequest;
import com.qrorder.dto.table.request.ReserveTableRequest;
import com.qrorder.dto.table.response.CheckInByCodeResponse;
import com.qrorder.dto.table.response.TableResponse;

import com.qrorder.entity.Branch;
import com.qrorder.entity.Order;
import com.qrorder.entity.OrderItem;
import com.qrorder.entity.Reservation;
import com.qrorder.entity.RestaurantTable;
import com.qrorder.entity.TableSession;

import com.qrorder.entity.enums.OrderItemStatus;
import com.qrorder.entity.enums.ReservationStatus;
import com.qrorder.entity.enums.SessionStatus;
import com.qrorder.entity.enums.TableStatus;

import com.qrorder.repository.BranchRepository;
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

    private final BranchRepository branchRepository;

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

        if (table.getBranch() != null) {
            response.setBranchId(table.getBranch().getId());
            response.setBranchName(table.getBranch().getName());
        }

        if (table.getStatus() == TableStatus.RESERVED) {
            List<Reservation> reservations = reservationRepository.findByTableId(table.getId());
            reservations.stream()
                    .filter(r -> r.getStatus() == ReservationStatus.PENDING || r.getStatus() == ReservationStatus.BOOKED)
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

        if (request.getBranchId() == null) {
            throw new RuntimeException(
                    "Branch ID is required"
            );
        }

        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found"));

        boolean exists = tableRepository.existsByTableNumberAndBranchId(
                request.getTableNumber(),
                request.getBranchId()
        );

        if (exists) {
            throw new RuntimeException(
                    "Table number already exists in this branch"
            );
        }

        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder randomSuffix = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < 4; i++) {
            randomSuffix.append(chars.charAt(random.nextInt(chars.length())));
        }
        String tableKey = "BR" + branch.getId() + "-TB" + request.getTableNumber() + "-" + randomSuffix.toString();

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
                        .branch(
                                branch
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

        // Check uniqueness per branch
        if (request.getBranchId() != null && (table.getBranch() == null || !table.getBranch().getId().equals(request.getBranchId()))) {
            Branch newBranch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new RuntimeException("Branch not found"));

            if (tableRepository.existsByTableNumberAndBranchId(request.getTableNumber(), request.getBranchId())) {
                throw new RuntimeException(
                        "Table number already exists in the destination branch"
                );
            }
            table.setBranch(newBranch);
        } else {
            if (!table.getTableNumber().equals(request.getTableNumber())
                    && table.getBranch() != null
                    && tableRepository.existsByTableNumberAndBranchId(request.getTableNumber(), table.getBranch().getId())) {
                throw new RuntimeException(
                        "Table number already exists in this branch"
                );
            }
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
    public List<TableResponse> getTables(Long branchId) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            boolean isBranchManager = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_BRANCH_MANAGER"));
            if (isBranchManager) {
                com.qrorder.entity.User user = userRepository.findByUsername(auth.getName()).orElse(null);
                if (user != null && user.getBranch() != null) {
                    branchId = user.getBranch().getId();
                }
            }
        }

        List<RestaurantTable> tables;
        if (branchId != null) {
            tables = tableRepository.findByBranchId(branchId);
        } else {
            tables = tableRepository.findAll();
        }
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

        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found"));

        if (!table.getBranch().getId().equals(branch.getId())) {
            throw new RuntimeException("Table does not belong to reservation branch");
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
                .status(ReservationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .branch(branch)
                .table(table)
                .build();

        Reservation savedReservation = reservationRepository.save(reservation);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Reserve table success");
        result.put("reservationId", savedReservation.getId());
        result.put("confirmationCode", code);
        result.put("tableNumber", table.getTableNumber());
        result.put("branchId", savedReservation.getBranch().getId());
        result.put("branchName", savedReservation.getBranch().getName());
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
                    || existing.getStatus() == ReservationStatus.SEATED
                    || existing.getStatus() == ReservationStatus.PENDING;
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
        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found"));

        // Generate confirmation code for compatibility
        String legacyCode;
        do {
            legacyCode = generateConfirmationCode();
        } while (reservationRepository.findByConfirmationCode(legacyCode).isPresent());

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime timeSlotStart = request.getReservationTime();
        LocalDateTime timeSlotEnd = timeSlotStart.plusHours(2);

        // Fetch all tables in the branch ordered by capacity
        List<RestaurantTable> allTables = tableRepository.findByBranchIdForUpdate(branch.getId());
        RestaurantTable assignedTable = null;

        for (RestaurantTable t : allTables) {
            if (t.getCapacity() >= request.getGuestCount()) {
                if (isTableAvailableForSlot(t, timeSlotStart, timeSlotEnd, null)) {
                    assignedTable = t;
                    break;
                }
            }
        }

        String reservationCode = null;
        ReservationStatus status;
        LocalDateTime holdUntil = null;
        LocalDateTime confirmedAt = null;

        if (assignedTable != null) {
            status = ReservationStatus.BOOKED;
            holdUntil = timeSlotStart.isBefore(now) ? now.plusMinutes(15) : timeSlotStart.plusMinutes(15);
            confirmedAt = now;
            
            // Generate unique reservation code
            do {
                reservationCode = generateReservationCode();
            } while (reservationRepository.findByReservationCode(reservationCode).isPresent());

            // If the reservation start time is within 30 minutes from now, update physical table status to RESERVED
            if (!timeSlotStart.isAfter(now.plusMinutes(30))) {
                assignedTable.setStatus(TableStatus.RESERVED);
                tableRepository.save(assignedTable);
            }
        } else {
            status = ReservationStatus.WAITLIST;
        }

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
                .status(status)
                .createdAt(now)
                .confirmedAt(confirmedAt)
                .holdUntil(holdUntil)
                .branch(branch)
                .table(assignedTable)
                .build();

        Reservation savedReservation = reservationRepository.save(reservation);

        Map<String, Object> result = new HashMap<>();
        result.put("message", assignedTable != null ? "Reserve slot success" : "Added to waitlist");
        result.put("reservationId", savedReservation.getId());
        result.put("confirmationCode", legacyCode);
        result.put("reservationCode", reservationCode);
        result.put("tableNumber", assignedTable != null ? assignedTable.getTableNumber() : null);
        result.put("branchId", savedReservation.getBranch().getId());
        result.put("branchName", savedReservation.getBranch().getName());
        result.put("status", savedReservation.getStatus().name());
        result.put("customerName", savedReservation.getCustomerName());
        return result;
    }

    @Override
    public List<com.qrorder.dto.table.response.ReservationResponse> getReservations() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long userBranchId = null;
        if (auth != null && auth.isAuthenticated()) {
            boolean restrictsBranch = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_BRANCH_MANAGER")
                            || a.getAuthority().equals("ROLE_WAITER")
                            || a.getAuthority().equals("ROLE_CASHIER")
                            || a.getAuthority().equals("ROLE_KITCHEN"));
            if (restrictsBranch) {
                com.qrorder.entity.User user = userRepository.findByUsername(auth.getName()).orElse(null);
                if (user != null && user.getBranch() != null) {
                    userBranchId = user.getBranch().getId();
                }
            }
        }

        final Long filterBranchId = userBranchId;
        return reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == ReservationStatus.PENDING || r.getStatus() == ReservationStatus.BOOKED)
                .filter(r -> filterBranchId == null || (r.getBranch() != null && r.getBranch().getId().equals(filterBranchId)))
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
                        .branchId(r.getBranch() != null ? r.getBranch().getId() : null)
                        .branchName(r.getBranch() != null ? r.getBranch().getName() : null)
                        .confirmedAt(r.getConfirmedAt())
                        .holdUntil(r.getHoldUntil())
                        .checkedInAt(r.getCheckedInAt())
                        .build())
                .sorted(java.util.Comparator.comparing(com.qrorder.dto.table.response.ReservationResponse::getCreatedAt))
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

        if (reservation.getStatus() != ReservationStatus.PENDING
                && reservation.getStatus() != ReservationStatus.BOOKED) {
            throw new RuntimeException(
                    "Mã xác nhận này đã được check-in hoặc đã bị huỷ!"
            );
        }

        RestaurantTable table = reservation.getTable();
        if (table != null) {
            if (table.getBranch() == null || !table.getBranch().getId().equals(reservation.getBranch().getId())) {
                throw new RuntimeException("Bàn đã chọn không thuộc cùng chi nhánh với đặt chỗ!");
            }
        } else {
            // Find an EMPTY table with capacity >= guestCount inside the same branch
            List<RestaurantTable> emptyTables = tableRepository.findAll().stream()
                    .filter(t -> t.getStatus() == TableStatus.EMPTY 
                            && t.getCapacity() >= reservation.getGuestCount()
                            && t.getBranch().getId().equals(reservation.getBranch().getId()))
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
                        .message("Nhà hàng hiện tại đã hết bàn trống phù hợp! Khách hàng đã được xếp vào hàng đợi.")
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

        if (table.getStatus() != TableStatus.EMPTY && table.getStatus() != TableStatus.RESERVED) {
            throw new RuntimeException(
                    "Table is not empty or reserved"
            );
        }

        List<Reservation> reservations =

                reservationRepository
                        .findByTableId(
                                tableId
                        );

        Reservation activeReservation =

                reservations
                        .stream()
                        .filter(reservation ->

                                reservation.getStatus()
                                        == ReservationStatus.PENDING

                                        ||

                                        reservation.getStatus()
                                                == ReservationStatus.BOOKED
                        )
                        .findFirst()
                        .orElse(null);

        reservations.forEach(reservation -> {

            if (reservation.getStatus()
                    == ReservationStatus.PENDING

                    ||

                    reservation.getStatus()
                            == ReservationStatus.BOOKED) {

                reservation.setStatus(
                        ReservationStatus.SEATED
                );
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

                        .branch(table.getBranch())

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
                preOrder.setBranch(savedSession.getBranch());
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
                if (r.getStatus() == ReservationStatus.PENDING || r.getStatus() == ReservationStatus.BOOKED) {
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
                    .orElseThrow(
                            () -> new RuntimeException(
                                     "No active session found"
                            )
                    );

            session.setStatus(
                    SessionStatus.CLOSED
            );

            session.setEndTime(
                    LocalDateTime.now()
            );

            tableSessionRepository.save(
                    session
            );
        }

        table.setStatus(
                TableStatus.EMPTY
        );

        tableRepository.save(
                table
        );

        promoteWaitlist();
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public com.qrorder.dto.table.response.AdminLookupResponse adminLookup(String code) {
        Reservation reservation = reservationRepository.findByReservationCode(code.trim())
                .orElseThrow(() -> new RuntimeException("Reservation code not found"));

        if (reservation.getStatus() == ReservationStatus.WAITLIST) {
            throw new RuntimeException("Customer is still on waitlist");
        }
        if (reservation.getStatus() == ReservationStatus.CANCELLED || reservation.getStatus() == ReservationStatus.CANCELLED_NO_SHOW) {
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
        if (reservation.getStatus() == ReservationStatus.WAITLIST) {
            return com.qrorder.dto.table.response.AdminCheckInResponse.builder()
                    .success(false)
                    .message("Customer is still on waitlist")
                    .build();
        }
        if (reservation.getStatus() == ReservationStatus.CANCELLED || reservation.getStatus() == ReservationStatus.CANCELLED_NO_SHOW) {
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
    @Transactional
    public void promoteWaitlist() {
        LocalDateTime now = LocalDateTime.now();
        List<Reservation> waitlist = reservationRepository.findByStatusOrderByCreatedAtAsc(ReservationStatus.WAITLIST);
        
        for (Reservation res : waitlist) {
            LocalDateTime start = res.getTimeSlotStart() != null ? res.getTimeSlotStart() : res.getReservationTime();
            LocalDateTime end = res.getTimeSlotEnd() != null ? res.getTimeSlotEnd() : start.plusHours(2);
            
            if (end.isBefore(now)) {
                res.setStatus(ReservationStatus.CANCELLED);
                reservationRepository.save(res);
                continue;
            }
            
            List<RestaurantTable> branchTables = tableRepository.findByBranchIdForUpdate(res.getBranch().getId());
            RestaurantTable assignedTable = null;
            for (RestaurantTable t : branchTables) {
                if (t.getCapacity() >= res.getGuestCount()) {
                    if (isTableAvailableForSlot(t, start, end, res.getId())) {
                        assignedTable = t;
                        break;
                    }
                }
            }
            
            if (assignedTable != null) {
                RestaurantTable lockedTable = tableRepository.findByIdForUpdate(assignedTable.getId()).orElse(null);
                if (lockedTable != null) {
                    res.setTable(lockedTable);
                    res.setStatus(ReservationStatus.BOOKED);
                    res.setHoldUntil(start.isBefore(now) ? now.plusMinutes(15) : start.plusMinutes(15));
                    res.setConfirmedAt(now);
                    
                    String code;
                    do {
                        code = generateReservationCode();
                    } while (reservationRepository.findByReservationCode(code).isPresent());
                    res.setReservationCode(code);
                    
                    reservationRepository.save(res);
                    
                    if (!start.isAfter(now.plusMinutes(30))) {
                        lockedTable.setStatus(TableStatus.RESERVED);
                        tableRepository.save(lockedTable);
                    }
                }
            }
        }
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
    public List<com.qrorder.dto.table.response.WaitlistResponse> getWaitlist() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long userBranchId = null;
        if (auth != null && auth.isAuthenticated()) {
            boolean restrictsBranch = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_BRANCH_MANAGER")
                            || a.getAuthority().equals("ROLE_WAITER")
                            || a.getAuthority().equals("ROLE_CASHIER")
                            || a.getAuthority().equals("ROLE_KITCHEN"));
            if (restrictsBranch) {
                com.qrorder.entity.User user = userRepository.findByUsername(auth.getName()).orElse(null);
                if (user != null && user.getBranch() != null) {
                    userBranchId = user.getBranch().getId();
                }
            }
        }

        final Long filterBranchId = userBranchId;
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        
        return reservationRepository.findByStatusOrderByCreatedAtAsc(ReservationStatus.WAITLIST).stream()
                .filter(r -> filterBranchId == null || (r.getBranch() != null && r.getBranch().getId().equals(filterBranchId)))
                .map(r -> {
                    long waitingMinutes = r.getCreatedAt() != null 
                            ? java.time.Duration.between(r.getCreatedAt(), now).toMinutes() 
                            : 0L;
                    return com.qrorder.dto.table.response.WaitlistResponse.builder()
                            .reservationId(r.getId())
                            .customerName(r.getCustomerName())
                            .phoneNumber(r.getPhone())
                            .guestCount(r.getGuestCount())
                            .reservationTime(r.getReservationTime())
                            .waitingMinutes(waitingMinutes)
                            .build();
                })
                .toList();
    }
}
