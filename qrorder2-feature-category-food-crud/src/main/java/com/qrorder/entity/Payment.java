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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false, foreignKey = @ForeignKey(name = "fk_payment_branch"))
    private Branch branch;

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
}