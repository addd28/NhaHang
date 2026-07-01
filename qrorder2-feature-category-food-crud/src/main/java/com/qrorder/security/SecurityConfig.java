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
                        .requestMatchers("/payments/request", "/payments/request/**", "/payments/request/status").permitAll()
                        .requestMatchers("/payments/confirm/**", "/payments/cancel/**").hasAnyRole("ADMIN", "CASHIER")
                        .requestMatchers("/payments/history", "/payments/history/**", "/payments/statistics", "/payments/top-items", "/payments/export/**").hasAnyRole("ADMIN", "CASHIER")
                        .requestMatchers("/waiter/**").hasAnyRole("ADMIN", "WAITER")
                        .requestMatchers("/admin/reservations/**").hasAnyRole("ADMIN", "WAITER", "CASHIER")
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/reservations").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/reservations/occupancy").permitAll()
                        .requestMatchers("/reservations/checkin/**", "/reservations/cancel/**").hasAnyRole("ADMIN", "CASHIER")
                        .requestMatchers("/reservations/**").hasAnyRole("ADMIN", "WAITER", "CASHIER")
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        // Cashier + Waiter có thể đóng bàn
                        .requestMatchers("/cashier/close-session/**")
                            .hasAnyRole("ADMIN", "CASHIER", "WAITER")
                        // Danh sách + xác nhận payment request — chỉ Cashier/Admin
                        .requestMatchers("/cashier/payment-requests/**")
                            .hasAnyRole("ADMIN", "CASHIER")
                        .requestMatchers("/cashier/**").hasAnyRole("ADMIN", "CASHIER")
                        .requestMatchers("/kitchen/**").hasAnyRole("ADMIN", "KITCHEN")
                        .requestMatchers("/orders/items/*/status").hasAnyRole("ADMIN", "WAITER", "KITCHEN")
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
                        .requestMatchers("/dashboard/**").hasRole("ADMIN")
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