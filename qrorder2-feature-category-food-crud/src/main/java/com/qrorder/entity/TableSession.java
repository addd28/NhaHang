package com.qrorder.entity;

import com.qrorder.entity.enums.SessionStatus;
import jakarta.persistence.*;
import lombok.*;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import com.qrorder.entity.enums.SessionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "table_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableSession {

    @Id
    @GeneratedValue(strategy =
            GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id")
    private RestaurantTable table;

    @Enumerated(EnumType.STRING)
    private SessionStatus status;

    @Column(unique = true)
    private LocalDateTime startTime;

    @Column(unique = true)
    private LocalDateTime endTime;

    @OneToMany( mappedBy = "session",
            cascade = CascadeType.ALL
    )
    @org.hibernate.annotations.BatchSize(size = 50)
    private List<Order> orders;


    private String customerName;

    private String customerPhone;

    private String note;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @Column
    private Double subtotal;

    @Column
    private Double serviceCharge;

    @Column
    private Double taxAmount;

    @Column
    private Double discountAmount;

    @Column
    private Double finalAmount;

    // Audit: who opened/closed this session
    @Column
    private Long openedByUserId;

    @Column
    private Long closedByUserId;

    @Column
    private LocalDateTime openedAt;

    @Column
    private LocalDateTime closedAt;

}