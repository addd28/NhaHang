package com.qrorder.entity;

import com.qrorder.entity.enums.OptionGroupType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "order_item_options")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @Column(name = "item_option_id")
    private Long itemOptionId;

    @Column(name = "option_code")
    private String optionCode;

    @Column(name = "option_name", nullable = false)
    private String optionName;

    @Column(name = "option_price", nullable = false)
    private Double optionPrice;

    @Column(name = "option_group_id")
    private Long optionGroupId;

    @Column(name = "option_group_name")
    private String optionGroupName;

    @Enumerated(EnumType.STRING)
    @Column(name = "option_group_type")
    private OptionGroupType optionGroupType;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double subtotal;
}
