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

    @Column(name = "transaction_code", length = 100, unique = true)
    private String transactionCode;

    @Column(name = "payment_status", length = 50)
    private String paymentStatus; // PENDING, SUCCESS, FAILED, EXPIRED, CANCELLED

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account", length = 100)
    private String bankAccount;

    @Column(name = "account_name", length = 100)
    private String accountName;

    @Column(name = "qr_url", length = 500)
    private String qrUrl;

    @Column(name = "transfer_content", length = 200)
    private String transferContent;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    @Column(name = "confirmed_by", length = 100)
    private String confirmedBy;

    /**
     * True khi PayPal đã capture thành công — cashier chỉ cần xác nhận đóng bàn.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean alreadyPaid = false;
}
