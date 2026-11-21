package com.jobconnect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 150)
    String fullName,

    @Size(max = 40)
    String phone,

    @Size(max = 160)
    String title,

    @Size(max = 160)
    String location,

    @Size(max = 4000)
    String professionalSummary,

    @Size(max = 4000)
    String skills,

    @Size(max = 8000)
    String experience,

    @Size(max = 4000)
    String education,

    @Size(max = 1000)
    String targetRoles,

    Integer desiredSalaryMin,
    Integer desiredSalaryMax,

    @Size(max = 1000)
    String workArrangements,

    @Size(max = 255)
    String githubUrl,

    @Size(max = 255)
    String linkedinUrl,

    @Size(max = 255)
    String portfolioUrl
) {}
