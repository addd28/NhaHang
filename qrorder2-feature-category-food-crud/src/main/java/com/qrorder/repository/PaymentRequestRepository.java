package com.qrorder.repository;

import com.qrorder.entity.PaymentRequest;
import com.qrorder.entity.enums.PaymentRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRequestRepository extends JpaRepository<PaymentRequest, Long> {

    List<PaymentRequest> findByStatusOrderByRequestedAtDesc(PaymentRequestStatus status);

    List<PaymentRequest> findByBranchIdAndStatusOrderByRequestedAtDesc(
            Long branchId,
            PaymentRequestStatus status
    );

    Optional<PaymentRequest> findBySessionIdAndStatus(
            Long sessionId,
            PaymentRequestStatus status
    );

    boolean existsBySessionIdAndStatus(
            Long sessionId,
            PaymentRequestStatus status
    );

    Optional<PaymentRequest> findTopBySessionIdOrderByRequestedAtDesc(Long sessionId);
}
