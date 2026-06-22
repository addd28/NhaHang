package com.qrorder.controller;

import com.qrorder.dto.auth.LoginRequest;
import com.qrorder.dto.auth.LoginResponse;
import com.qrorder.dto.auth.RegisterRequest;
import com.qrorder.entity.User;
import com.qrorder.repository.UserRepository;
import com.qrorder.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    public LoginResponse register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
        }
        String username = auth.getName();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "role", user.getRole().name(),
                "authorities", auth.getAuthorities().stream()
                        .map(a -> a.getAuthority()).toList(),
                "branchId", user.getBranchId() != null ? user.getBranchId() : "null"
        ));
    }
}