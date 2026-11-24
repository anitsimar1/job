package com.jobconnect.dto;

import com.jobconnect.entity.JobStatus;
import jakarta.validation.constraints.NotNull;

public record JobStatusUpdateRequest(
    @NotNull(message = "Job status is required")
    JobStatus status
) {}
