package com.qrorder.service;

import com.qrorder.dto.user.request.CreateUserRequest;
import com.qrorder.dto.user.request.UpdateUserRequest;
import com.qrorder.dto.user.response.UserResponse;

import java.util.List;

public interface UserService {
    List<UserResponse> getAllUsers();
    void createUser(CreateUserRequest request);
    void updateUser(Long id, UpdateUserRequest request);
    void deleteUser(Long id);
}
