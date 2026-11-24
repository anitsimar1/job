package com.jobconnect.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Please enter a valid email address")
    String email,

    @NotBlank(message = "Password is required")
    String password,

    Boolean rememberMe,

    @Size(max = 40, message = "Login role must not exceed 40 characters")
    String loginAs
) {
    public LoginRequest(String email, String password, Boolean rememberMe) {
        this(email, password, rememberMe, null);
    }
}
