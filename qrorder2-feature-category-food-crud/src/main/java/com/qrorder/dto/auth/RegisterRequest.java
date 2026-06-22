package com.qrorder.dto.auth;

import lombok.Data;

import javax.management.relation.Role;

@Data
public class RegisterRequest {

    private String username;

    private String password;
}