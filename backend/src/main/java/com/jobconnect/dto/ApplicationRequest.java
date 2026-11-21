package com.jobconnect.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ApplicationRequest(
    @NotNull(message = "Job ID is required")
    Long jobId,

    Long resumeId,

    @Size(max = 5000, message = "Cover letter must not exceed 5000 characters")
    String coverLetter,

    String experienceYears,
    Boolean workAuthorized,
    Boolean requiresSponsorship,
    String noticePeriod
) {}
