package com.qrorder.entity;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "branches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Branch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;

    private String address;

    private String phone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "province_id")
    private Province province;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "branch")
    @com.fasterxml.jackson.annotation.JsonIgnore
    @org.hibernate.annotations.BatchSize(size = 50)
    private List<Reservation> reservations;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
