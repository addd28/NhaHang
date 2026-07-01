package com.qrorder.dto.dashboard;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class DashboardRecentFeedbackResponse {
    private Integer rating;
    private String customerName;
    private String comment;
    private LocalDateTime createdAt;
}
