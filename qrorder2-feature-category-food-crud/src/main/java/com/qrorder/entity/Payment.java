package com.qrorder.entity;

import com.qrorder.entity.enums.PaymentMethod;
import com.qrorder.entity.enums.PaymentStatus;
import jakarta.persistence.*;

import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")

@Getter
@Setter

@Builder
@NoArgsConstructor
@AllArgsConstructor

public class Payment {

    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "session_id",
            nullable = false,
            unique = true
    )
    private TableSession session;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private LocalDateTime paidAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus paymentStatus;

    @Column(name = "transaction_code", length = 100)
    private String transactionCode;

    @Column(name = "payment_request_id")
    private Long paymentRequestId;
}