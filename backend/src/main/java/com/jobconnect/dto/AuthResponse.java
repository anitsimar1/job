package com.jobconnect.dto;

public record AuthResponse(
    UserSummaryDto user,
    String role,
    long expiresInMs
) {}
