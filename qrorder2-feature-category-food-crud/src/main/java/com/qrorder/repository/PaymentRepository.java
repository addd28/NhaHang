package com.qrorder.repository;

import com.qrorder.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository
        extends JpaRepository<Payment, Long> {

    boolean existsBySessionId(Long sessionId);

    Optional<Payment> findBySessionId(Long sessionId);

    List<Payment> findAllByOrderByPaidAtDesc();

    List<Payment> findByPaidAtBetween(LocalDateTime start, LocalDateTime end);

    List<Payment> findBySessionIdIn(Collection<Long> sessionIds);
}
