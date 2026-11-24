package com.jobconnect.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
    @Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z\\d\\s]).{8,100}$",
        message = "Password must be at least 8 characters and include letters, digits, and a special character"
    )
    String password,

    @NotBlank(message = "Password confirmation is required")
    String confirmPassword,

    @NotBlank(message = "Phone number is required")
    @Size(min = 6, max = 40, message = "Phone number must be between 6 and 40 characters")
    String phone,

    @Size(max = 1000, message = "Target roles must not exceed 1000 characters")
    String targetRoles,

    Boolean rememberMe,

    @Size(max = 40, message = "Account type must not exceed 40 characters")
    String accountType,

    @Size(max = 160, message = "Company name must not exceed 160 characters")
    String companyName
) {
    public RegisterRequest(
        String fullName,
        String email,
        String password,
        String confirmPassword,
        String phone
    ) {
        this(fullName, email, password, confirmPassword, phone, null, true, null, null);
    }

    public RegisterRequest(
        String fullName,
        String email,
        String password,
        String confirmPassword,
        String phone,
        String targetRoles
    ) {
        this(fullName, email, password, confirmPassword, phone, targetRoles, true, null, null);
    }

    public RegisterRequest(
        String fullName,
        String email,
        String password,
        String confirmPassword,
        String phone,
        String targetRoles,
        Boolean rememberMe
    ) {
        this(fullName, email, password, confirmPassword, phone, targetRoles, rememberMe, null, null);
    }
}
