package com.qrorder.entity;

import com.qrorder.entity.enums.OrderItemStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_item_id")
    private MenuItem menuItem;

    private Integer quantity;

    private String note;

    @Enumerated(EnumType.STRING)
    private OrderItemStatus status;

    @Column(name = "price_at_order")
    private Double priceAtOrder;

    @Column(name = "menu_item_name")
    private String menuItemName;

    @OneToMany(mappedBy = "orderItem", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 50)
    private List<OrderItemOption> options;

    @Transient
    public Double getPrice() {
        double basePrice =
                priceAtOrder != null
                        ? priceAtOrder
                        : (menuItem != null && menuItem.getPrice() != null
                                ? menuItem.getPrice()
                                : 0.0);
        double optionsSum = 0.0;
        if (options != null) {
            optionsSum = options.stream()
                    .mapToDouble(opt -> opt.getOptionPrice() != null ? opt.getOptionPrice() : 0.0)
                    .sum();
        }
        return basePrice + optionsSum;
    }

    private LocalDateTime orderedTime;
    private LocalDateTime preparingTime;
    private LocalDateTime doneTime;
    private LocalDateTime deliveringTime;
    private LocalDateTime servedTime;

    @PrePersist
    protected void onCreate() {
        if (this.orderedTime == null) {
            this.orderedTime = LocalDateTime.now();
        }
        if (this.status == OrderItemStatus.DONE && this.doneTime == null) {
            this.doneTime = LocalDateTime.now();
        }
    }

    public void setStatus(OrderItemStatus status) {
        this.status = status;
        if (status == OrderItemStatus.PREPARING) {
            this.preparingTime = LocalDateTime.now();
        } else if (status == OrderItemStatus.DONE) {
            this.doneTime = LocalDateTime.now();
        } else if (status == OrderItemStatus.SERVED) {
            this.servedTime = LocalDateTime.now();
        }
    }
}