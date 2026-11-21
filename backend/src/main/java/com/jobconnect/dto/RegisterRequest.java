package com.jobconnect.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
    String fullName,

    @NotBlank(message = "Email is required")
    @Email(message = "Please enter a valid email address")
    @Size(max = 190, message = "Email must not exceed 190 characters")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be at least 8 characters")
    String password,

    @NotBlank(message = "Password confirmation is required")
    String confirmPassword,

    @NotBlank(message = "Phone number is required")
    @Size(min = 6, max = 40, message = "Phone number must be between 6 and 40 characters")
    String phone
) {}
