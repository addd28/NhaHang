package com.qrorder.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "item_options",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"option_group_id", "option_code"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_group_id", nullable = false)
    private OptionGroup optionGroup;

    @Column(name = "option_code", nullable = false)
    private String optionCode;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double price;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(nullable = false)
    private Boolean available;

    @Column(nullable = false)
    private Boolean deleted;

    @Version
    private Long version;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (available == null) {
            available = true;
        }
        if (deleted == null) {
            deleted = false;
        }
        if (displayOrder == null) {
            displayOrder = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
