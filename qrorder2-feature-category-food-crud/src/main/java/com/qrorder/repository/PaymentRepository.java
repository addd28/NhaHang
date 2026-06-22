package com.qrorder.repository;

import com.qrorder.entity.Payment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PaymentRepository
        extends JpaRepository<Payment, Long> {

    boolean existsBySessionId(
            Long sessionId
    );

    java.util.Optional<Payment> findBySessionId(Long sessionId);

    List<Payment> findAllByOrderByPaidAtDesc();

    List<Payment> findByPaidAtBetween(
            LocalDateTime start,
            LocalDateTime end
    );

    List<Payment> findByBranchIdOrderByPaidAtDesc(Long branchId);

    List<Payment> findByBranchIdAndPaidAtBetween(Long branchId, LocalDateTime start, LocalDateTime end);

    List<Payment> findBySessionIdIn(java.util.Collection<Long> sessionIds);
}
