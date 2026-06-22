package com.qrorder.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.
        UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.*;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http
                .cors(cors -> {})
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/customer/**", "/tables/*/current-session").permitAll()
                        // Public: khách gửi yêu cầu và kiểm tra trạng thái
                        .requestMatchers("/payments/request", "/payments/request/status").permitAll()
                        .requestMatchers("/waiter/**").hasAnyRole("ADMIN", "WAITER", "BRANCH_MANAGER")
                        .requestMatchers("/admin/reservations/**").hasAnyRole("ADMIN", "BRANCH_MANAGER", "WAITER", "CASHIER")
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        // Cashier + Waiter có thể đóng bàn
                        .requestMatchers("/cashier/close-session/**")
                            .hasAnyRole("ADMIN", "CASHIER", "BRANCH_MANAGER", "WAITER")
                        // Danh sách + xác nhận payment request — chỉ Cashier/Admin
                        .requestMatchers("/cashier/payment-requests/**")
                            .hasAnyRole("ADMIN", "CASHIER", "BRANCH_MANAGER")
                        .requestMatchers("/cashier/**").hasAnyRole("ADMIN", "CASHIER", "BRANCH_MANAGER")
                        .requestMatchers("/kitchen/**").hasAnyRole("ADMIN", "KITCHEN")
                        .requestMatchers("/orders/items/*/status").hasAnyRole("ADMIN", "WAITER", "KITCHEN")
                        .requestMatchers("/reports/branch/**").hasAnyRole("ADMIN", "BRANCH_MANAGER")
                        // Secure modify endpoints and dashboard
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/menu-items", "/menu-items/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.PUT, "/menu-items/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/menu-items/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/menu-items/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/option-groups", "/option-groups/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.PUT, "/option-groups/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/option-groups/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/option-groups/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/item-options", "/item-options/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.PUT, "/item-options/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/item-options/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/item-options/**").hasRole("ADMIN")
                        .requestMatchers("/dashboard/**").hasAnyRole("ADMIN", "BRANCH_MANAGER")
                        .requestMatchers("/**").permitAll()
                        .anyRequest().authenticated()
                )

                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource
    corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOrigins(
                List.of("http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:8080", "http://127.0.0.1:5173", "http://192.168.102.8:5173")
        );

        configuration.setAllowedMethods(
                List.of("*")
        );

        configuration.setAllowedHeaders(
                List.of("*")
        );

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration
        );

        return source;
    }
}