package com.qrorder.entity;

import java.time.LocalDateTime;
import java.util.List;

import com.qrorder.entity.enums.TableStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "restaurant_tables", uniqueConstraints = {
    @UniqueConstraint(name = "uq_table_number", columnNames = {"table_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestaurantTable {

    @Id
    @GeneratedValue(strategy =
            GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer tableNumber;

    @Column(unique = true)
    private String qrToken;

    @Column(unique = true, nullable = false)
    private String tableKey;

    @Enumerated(EnumType.STRING)
    private TableStatus status;

    @OneToMany(mappedBy = "table", fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore
    @org.hibernate.annotations.BatchSize(size = 50)
    private List<TableSession> sessions;

    @OneToMany(mappedBy = "table", fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore
    @org.hibernate.annotations.BatchSize(size = 50)
    private List<Reservation> reservations;

    @Column(nullable = false)
    private Integer capacity;
}