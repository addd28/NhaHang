package com.qrorder.dto.user.request;

import com.qrorder.entity.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUserRequest {

    @NotBlank(message = "Username is required")
    private String username;

    private String password; // Optional password change

    @NotNull(message = "Role is required")
    private Role role;

    private Long branchId;
}
