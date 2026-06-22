package com.qrorder.controller;

import com.qrorder.entity.TableSession;
import com.qrorder.entity.User;
import com.qrorder.repository.UserRepository;
import com.qrorder.service.TableSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/sessions")
@RequiredArgsConstructor
public class TableSessionController {

    private final TableSessionService tableSessionService;
    private final UserRepository userRepository;

    /**
     * Waiter / Admin mở bàn walk-in.
     * KHÔNG cho CUSTOMER gọi endpoint này.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'BRANCH_MANAGER', 'WAITER')")
    @PostMapping("/open/{tableId}")
    public Map<String, Object> openSession(
            @PathVariable Long tableId
    ) {
        Long userId = getCurrentUserId();
        TableSession session = tableSessionService.openSession(tableId, userId);

        return Map.of(
                "sessionId", session.getId(),
                "tableNumber", session.getTable().getTableNumber(),
                "message", "Mở bàn thành công"
        );
    }

    @GetMapping("/table/{tableId}/active")
    public Map<String, Long> getActiveSession(
            @PathVariable Long tableId
    ) {
        TableSession session = tableSessionService.getActiveSession(tableId);
        return Map.of("sessionId", session.getId());
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            User user = userRepository.findByUsername(auth.getName()).orElse(null);
            if (user != null) return user.getId();
        }
        return null;
    }
}