package com.qrorder.controller;

import com.qrorder.dto.table.request.ReserveTableRequest;
import com.qrorder.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
        response.put("branchId", result.get("branchId"));
        response.put("branchName", result.get("branchName"));
        response.put("status", result.get("status"));
        response.put("confirmationCode", result.get("confirmationCode"));
        response.put("reservationCode", result.get("reservationCode"));
        response.put("tableNumber", result.get("tableNumber"));
        return ResponseEntity.ok(response);
    }
}
