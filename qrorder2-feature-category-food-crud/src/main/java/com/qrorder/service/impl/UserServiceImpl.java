package com.qrorder.service.impl;

import com.qrorder.dto.user.request.CreateUserRequest;
import com.qrorder.dto.user.request.UpdateUserRequest;
import com.qrorder.dto.user.response.UserResponse;
import com.qrorder.entity.User;
import com.qrorder.entity.Branch;
import com.qrorder.repository.UserRepository;
import com.qrorder.repository.BranchRepository;
import com.qrorder.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BranchRepository branchRepository;

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void createUser(CreateUserRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        Branch branch = null;
        if (request.getBranchId() != null) {
            branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new RuntimeException("Branch not found"));
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .branch(branch)
                .build();

        userRepository.save(user);
    }

    @Override
    public void updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        userRepository.findByUsername(request.getUsername()).ifPresent(existingUser -> {
            if (!existingUser.getId().equals(id)) {
                throw new RuntimeException("Username already exists");
            }
        });

        Branch branch = null;
        if (request.getBranchId() != null) {
            branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new RuntimeException("Branch not found"));
        }

        user.setUsername(request.getUsername());
        user.setRole(request.getRole());
        user.setBranch(branch);

        // Update password only if provided
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        userRepository.save(user);
    }

    @Override
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        userRepository.delete(user);
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .branchId(user.getBranch() != null ? user.getBranch().getId() : null)
                .branchName(user.getBranch() != null ? user.getBranch().getName() : null)
                .build();
    }
}
