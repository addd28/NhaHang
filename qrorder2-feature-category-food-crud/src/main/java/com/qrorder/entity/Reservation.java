package com.qrorder.entity;


import com.qrorder.entity.enums.ReservationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")

@Getter
@Setter
@Builder

@NoArgsConstructor
@AllArgsConstructor

public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerName;

    @Column(nullable = false)
    private String phone;

    @Column(unique = true, nullable = false)
    private String confirmationCode;

    @Column(name = "reservation_code", unique = true)
    private String reservationCode;

    @Column(nullable = false)
    private Integer guestCount;

    @Column(nullable = false)
    private LocalDateTime reservationTime;

    private String note;

    @Enumerated(EnumType.STRING)
    private ReservationStatus status;

    private LocalDateTime createdAt;

    private LocalDateTime timeSlotStart;
    private LocalDateTime timeSlotEnd;
    private LocalDateTime holdUntil;
    private LocalDateTime confirmedAt;
    private LocalDateTime checkedInAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false, foreignKey = @ForeignKey(name = "fk_reservation_branch"))
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id")
    private RestaurantTable table;
}
