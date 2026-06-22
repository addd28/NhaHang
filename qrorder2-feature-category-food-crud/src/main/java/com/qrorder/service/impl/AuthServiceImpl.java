
package com.qrorder.service.impl;

import com.qrorder.dto.auth.LoginRequest;
import com.qrorder.dto.auth.LoginResponse;
import com.qrorder.dto.auth.RegisterRequest;
import com.qrorder.dto.auth.UserDTO;
import com.qrorder.entity.User;
import com.qrorder.repository.UserRepository;
import com.qrorder.service.AuthService;
import com.qrorder.util.JwtUtil;
import com.qrorder.entity.enums.Role;
import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl
        implements AuthService {

    private final UserRepository
            userRepository;

    private final PasswordEncoder
            passwordEncoder;

    private final JwtUtil
            jwtUtil;

    @Override
    public LoginResponse login(
            LoginRequest request
    ) {

        User user =
                userRepository.findByUsername(
                        request.getUsername()
                ).orElseThrow(() ->

                        new RuntimeException(
                                "User not found"
                        )
                );

        boolean checkPassword =
                passwordEncoder.matches(

                        request.getPassword(),

                        user.getPassword()
                );

        if(!checkPassword) {

            throw new RuntimeException(
                    "Wrong password"
            );
        }

        String token =
                jwtUtil.generateToken(
                        user.getUsername()
                );

        return LoginResponse.builder()

                .accessToken(token)

                .user(UserDTO.from(user))

                .build();
    }

    @Override
    public LoginResponse register(
            RegisterRequest request
    ) {

        User existingUser =
                userRepository.findByUsername(
                        request.getUsername()
                ).orElse(null);

        if(existingUser != null) {

            throw new RuntimeException(
                    "Username already exists"
            );
        }

        User user = User.builder()

                .username(
                        request.getUsername()
                )

                .password(
                        passwordEncoder.encode(
                                request.getPassword()
                        )
                )

                .role(
                        Role.USER
                )

                .build();

        // save user

        userRepository.save(user);

        // generate token

        String token =
                jwtUtil.generateToken(
                        user.getUsername()
                );

        // return response

        return LoginResponse.builder()

                .accessToken(token)

                .user(UserDTO.from(user))

                .build();
    }
}
