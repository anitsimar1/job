package com.jobconnect.dto;

import com.jobconnect.entity.ApplicationStatus;

import java.time.Instant;

public record ApplicationDto(
    Long id,
    Long userId,
    String applicantName,
    String applicantEmail,
    Long jobId,
    String jobSlug,
    String jobTitle,
    String company,
    String companyLogo,
    String location,
    String salary,
    Long resumeId,
    String resumeFileName,
    String coverLetter,
    String experienceYears,
    Boolean workAuthorized,
    Boolean requiresSponsorship,
    String noticePeriod,
    ApplicationStatus status,
    Instant appliedAt,
    Instant updatedAt
) {}
