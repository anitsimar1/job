package com.jobconnect.dto;

import com.jobconnect.entity.ApplicationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateApplicationStatusRequest(
    @NotNull(message = "Application status is required")
    ApplicationStatus status
) {}
