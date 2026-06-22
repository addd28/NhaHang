package com.qrorder.dto.branch.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchResponse {

    private Long id;

    private String name;

    private String address;

    private String phone;

    private Long provinceId;

    private String provinceName;

    private LocalDateTime createdAt;
}
