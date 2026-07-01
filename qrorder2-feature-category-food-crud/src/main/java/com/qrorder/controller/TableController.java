package com.qrorder.controller;

import com.qrorder.dto.table.request.CreateTableRequest;
import com.qrorder.dto.table.request.UpdateTableRequest;
import com.qrorder.dto.table.request.ReserveTableRequest;
import com.qrorder.dto.table.response.CheckInByCodeResponse;
import com.qrorder.dto.table.response.TableResponse;

import com.qrorder.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tables")
@RequiredArgsConstructor
public class TableController {

    private final TableService tableService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public String createTable(
            @Valid
            @RequestBody CreateTableRequest request
    ) {
        tableService.createTable(request);
        return "Create table success";
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{tableId}")
    public Map<String, String> updateTable(
            @PathVariable Long tableId,
            @Valid
            @RequestBody UpdateTableRequest request
    ) {
        tableService.updateTable(tableId, request);
        return Map.of(
                "message",
                "Update table success"
        );
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{tableId}")
    public Map<String, String> deleteTable(
            @PathVariable Long tableId
    ) {
        tableService.deleteTable(tableId);
        return Map.of(
                "message",
                "Delete table success"
        );
    }

    @PostMapping("/{tableId}/reserve")
    public ResponseEntity<Map<String, Object>> reserveTable(
            @PathVariable Long tableId,
            @Valid @RequestBody ReserveTableRequest request
    ) {
        Map<String, Object> result = tableService.reserveTable(tableId, request);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/reserve")
    public ResponseEntity<Map<String, Object>> reserveSlot(
            @Valid @RequestBody ReserveTableRequest request
    ) {
        Map<String, Object> result = tableService.reserveSlot(request);
        return ResponseEntity.ok(result);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'WAITER', 'CASHIER')")
    @GetMapping("/reservations")
    public List<com.qrorder.dto.table.response.ReservationResponse> getReservations() {
        return tableService.getReservations();
    }

    @PostMapping("/checkin-by-code")
    public ResponseEntity<CheckInByCodeResponse> checkInByCode(
            @RequestBody Map<String, String> body
    ) {
        String code = body.get("confirmationCode");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            CheckInByCodeResponse response = tableService.checkInByCode(code.trim());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(CheckInByCodeResponse.builder()
                            .message(e.getMessage())
                            .build());
        }
    }

    @GetMapping
    public List<TableResponse> getTables() {
        return tableService.getTables();
    }

    @PostMapping("/{tableId}/checkin")
    public Map<String, Object> checkIn(@PathVariable Long tableId) {
        Long sessionId = tableService.checkIn(tableId);
        com.qrorder.entity.TableSession session = tableService.getSessionById(sessionId);
        return Map.of(
                "sessionId", sessionId,
                "tableNumber", session.getTable().getTableNumber()
        );
    }

    @GetMapping("/current-session")
    public ResponseEntity<?> getCurrentSession(
            @RequestParam String tableKey
    ) {
        try {
            com.qrorder.entity.TableSession session = tableService.getActiveSessionByTableKey(tableKey);
            return ResponseEntity.ok(Map.of(
                    "active", true,
                    "tableNumber", session.getTable().getTableNumber(),
                    "sessionId", session.getId()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of("active", false));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    @PutMapping("/{tableId}/reset")
    public String resetTable(@PathVariable Long tableId) {
        tableService.resetTable(tableId);
        return "Table reset success";
    }
}