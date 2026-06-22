package com.qrorder.entity;

import com.qrorder.entity.enums.OptionGroupType;
import com.qrorder.entity.enums.SelectionType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "option_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OptionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OptionGroupType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "selection_type", nullable = false)
    private SelectionType selectionType;

    @Column(nullable = false)
    private Boolean required;

    @Column(name = "min_select")
    private Integer minSelect;

    @Column(name = "max_select")
    private Integer maxSelect;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    @OneToMany(mappedBy = "optionGroup", cascade = CascadeType.ALL)
    @org.hibernate.annotations.BatchSize(size = 50)
    private List<ItemOption> options;

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
        if (required == null) {
            required = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
