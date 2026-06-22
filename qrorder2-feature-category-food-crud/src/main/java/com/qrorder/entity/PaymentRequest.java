package com.qrorder.entity;

import com.qrorder.entity.enums.PaymentMethod;
import com.qrorder.entity.enums.PaymentRequestStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private TableSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id")
    private RestaurantTable table;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentRequestStatus status;

    @Column(nullable = false)
    private LocalDateTime requestedAt;

    @Column
    private LocalDateTime confirmedAt;

    @Column
    private Long confirmedByUserId;

    /**
     * True khi PayPal đã capture thành công — cashier chỉ cần xác nhận đóng bàn.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean alreadyPaid = false;
}
