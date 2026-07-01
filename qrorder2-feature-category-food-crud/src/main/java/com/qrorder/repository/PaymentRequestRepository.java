package com.qrorder.repository;

import com.qrorder.entity.PaymentRequest;
import com.qrorder.entity.enums.PaymentRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRequestRepository extends JpaRepository<PaymentRequest, Long> {

    List<PaymentRequest> findByStatusOrderByRequestedAtDesc(PaymentRequestStatus status);

    Optional<PaymentRequest> findBySessionIdAndStatus(Long sessionId, PaymentRequestStatus status);

    boolean existsBySessionIdAndStatus(Long sessionId, PaymentRequestStatus status);

    Optional<PaymentRequest> findTopBySessionIdOrderByRequestedAtDesc(Long sessionId);

    Optional<PaymentRequest> findByTransactionCode(String transactionCode);

    boolean existsByTransactionCode(String transactionCode);

    List<PaymentRequest> findByTransactionCodeContainingIgnoreCase(String query);

    @org.springframework.data.jpa.repository.Query("SELECT MAX(p.transactionCode) FROM PaymentRequest p WHERE p.transactionCode LIKE :prefix")
    String findMaxTransactionCodeByPrefix(@org.springframework.data.repository.query.Param("prefix") String prefix);
}
