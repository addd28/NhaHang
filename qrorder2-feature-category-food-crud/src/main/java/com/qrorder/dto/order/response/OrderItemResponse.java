package com.qrorder.dto.order.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderItemResponse {

    private Long menuItemId;

    private String menuItemName;

    private Integer quantity;

    private String note;

    private String status;

    private Long itemId;

    private String type;

    private Double price;

    private LocalDateTime orderedTime;

    private LocalDateTime preparingTime;

    private LocalDateTime doneTime;

    private LocalDateTime deliveringTime;

    private LocalDateTime servedTime;

    private String totalPreparationDuration;

    private Integer tableNumber;

    private List<String> options;
}