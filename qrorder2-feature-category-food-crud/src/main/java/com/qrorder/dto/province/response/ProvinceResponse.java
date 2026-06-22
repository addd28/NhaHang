package com.qrorder.dto.province.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProvinceResponse {

    private Long id;

    private String name;

    private LocalDateTime createdAt;

    private int branchCount;
}
