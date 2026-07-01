package com.qrorder.controller;

import com.qrorder.dto.table.request.ReserveTableRequest;
import com.qrorder.dto.table.response.AdminCheckInResponse;
import com.qrorder.dto.table.response.ReservationResponse;
import com.qrorder.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final TableService tableService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createReservation(
            @Valid @RequestBody ReserveTableRequest request
    ) {
        Map<String, Object> result = tableService.reserveSlot(request);
        Map<String, Object> response = new HashMap<>();
        response.put("id", result.get("reservationId"));
        response.put("customerName", result.get("customerName"));
        response.put("status", result.get("status"));
        response.put("confirmationCode", result.get("confirmationCode"));
        response.put("reservationCode", result.get("reservationCode"));
        response.put("tableNumber", result.get("tableNumber"));
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<ReservationResponse>> getReservations() {
        return ResponseEntity.ok(tableService.getReservations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReservationResponse> getReservationById(@PathVariable Long id) {
        // Find in history/all to get by ID
        ReservationResponse res = tableService.getHistoryReservations().stream()
                .filter(r -> r.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đặt bàn với ID này"));
        return ResponseEntity.ok(res);
    }

    @GetMapping("/search")
    public ResponseEntity<List<ReservationResponse>> searchReservations(@RequestParam String q) {
        return ResponseEntity.ok(tableService.searchReservations(q));
    }

    @PostMapping("/checkin/{id}")
    public ResponseEntity<?> checkInReservation(
            @PathVariable Long id,
            @RequestParam Long tableId
    ) {
        try {
            AdminCheckInResponse response = tableService.checkInReservation(id, tableId);
            return ResponseEntity.ok(response);
        } catch (com.qrorder.exception.CheckInException e) {
            throw e;
        } catch (Exception e) {
            Map<String, Object> error = new java.util.HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/occupancy")
    public ResponseEntity<Map<String, Object>> getOccupancy(@RequestParam String dateTime) {
        try {
            java.time.LocalDateTime parsedTime = java.time.LocalDateTime.parse(dateTime);
            return ResponseEntity.ok(tableService.getOccupancy(parsedTime));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/cancel/{id}")
    public ResponseEntity<Map<String, Object>> cancelReservation(@PathVariable Long id) {
        try {
            tableService.cancelReservation(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Hủy đặt bàn thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<ReservationResponse>> getHistory() {
        return ResponseEntity.ok(tableService.getHistoryReservations());
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        return ResponseEntity.ok(tableService.getReservationDashboardStats());
    }
}
