package org.miniproject.expensetracker.auth.controller;

import lombok.RequiredArgsConstructor;
import org.miniproject.expensetracker.auth.dto.AuthResponse;
import org.miniproject.expensetracker.auth.dto.LoginRequest;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.auth.security.JwtFilter;
import org.miniproject.expensetracker.auth.service.UserService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    public User register(@RequestBody User request) {
        return userService.register(
                request.getFullName(),
                request.getEmail(),
                request.getPassword()
        );
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return userService.login(request.getEmail(), request.getPassword());
    }

    @GetMapping("/test")
    public String test(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return "Hello " + user.getEmail();
    }
}