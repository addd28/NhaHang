package com.qrorder.security;

import com.qrorder.entity.User;
import com.qrorder.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService
        implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        User user =
                userRepository.findByUsername(
                        username
                ).orElseThrow(() ->

                        new UsernameNotFoundException(
                                "User not found"
                        )
                );

        if(user == null) {
            throw new UsernameNotFoundException("User not found");
        }

        return org.springframework.security.core.userdetails.User
                .builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .roles(user.getRole().name())
                .build();
    }
}