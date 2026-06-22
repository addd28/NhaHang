package com.qrorder.service;

import com.qrorder.dto.auth.LoginRequest;
import com.qrorder.dto.auth.LoginResponse;
import com.qrorder.dto.auth.RegisterRequest;

public interface AuthService {

    LoginResponse login(LoginRequest request);
    LoginResponse register(RegisterRequest request);
}