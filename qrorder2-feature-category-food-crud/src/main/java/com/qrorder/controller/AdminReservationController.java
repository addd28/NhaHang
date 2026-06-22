package com.qrorder.controller;

import com.qrorder.dto.table.response.AdminCheckInResponse;
import com.qrorder.dto.table.response.AdminLookupResponse;
import com.qrorder.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/reservations")
@RequiredArgsConstructor
public class AdminReservationController {

    private final TableService tableService;

    @GetMapping("/waitlist")
    public ResponseEntity<?> getWaitlist() {
        return ResponseEntity.ok(tableService.getWaitlist());
    }

    @GetMapping("/lookup")
    public ResponseEntity<?> lookupReservation(@RequestParam String code) {
        try {
            AdminLookupResponse response = tableService.adminLookup(code);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/check-in")
    public ResponseEntity<?> checkInReservation(@RequestBody Map<String, String> requestBody) {
        String code = requestBody.get("reservationCode");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Mã đặt bàn là bắt buộc"));
        }
        try {
            AdminCheckInResponse response = tableService.adminCheckIn(code);
            if (!response.isSuccess()) {
                return ResponseEntity.badRequest().body(response);
            }
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
