package com.jobconnect.dto;

public record AuthResponse(
    UserSummaryDto user,
    String role,
    long expiresInMs,
    String accessToken
) {
    public AuthResponse(UserSummaryDto user, String role, long expiresInMs) {
        this(user, role, expiresInMs, null);
    }
}
