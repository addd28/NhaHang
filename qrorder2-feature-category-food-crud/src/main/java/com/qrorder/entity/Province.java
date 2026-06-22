package com.qrorder.entity;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "provinces")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Province {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;

    @OneToMany(mappedBy = "province", fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore
    @org.hibernate.annotations.BatchSize(size = 50)
    private List<Branch> branches;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
