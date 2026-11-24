package com.jobconnect.dto;

import java.time.Instant;
import java.util.Set;

public record UserSummaryDto(
    Long id,
    String fullName,
    String email,
    String phone,
    String profileImage,
    Set<String> roles,
    boolean enabled,
    Instant createdAt,
    String authProvider,
    boolean emailVerified,
    String companyName
) {
    public UserSummaryDto(
        Long id,
        String fullName,
        String email,
        String phone,
        String profileImage,
        Set<String> roles,
        boolean enabled,
        Instant createdAt,
        String authProvider,
        boolean emailVerified
    ) {
        this(id, fullName, email, phone, profileImage, roles, enabled, createdAt, authProvider, emailVerified, null);
    }
}
