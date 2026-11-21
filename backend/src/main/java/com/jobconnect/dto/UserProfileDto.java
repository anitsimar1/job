package com.jobconnect.dto;

import java.util.List;
import java.util.Set;

public record UserProfileDto(
    Long id,
    String fullName,
    String email,
    String phone,
    String profileImage,
    String title,
    String location,
    String professionalSummary,
    String skills,
    String experience,
    String education,
    String targetRoles,
    Integer desiredSalaryMin,
    Integer desiredSalaryMax,
    String workArrangements,
    String githubUrl,
    String linkedinUrl,
    String portfolioUrl,
    Set<String> roles,
    List<ResumeDto> resumes
) {}
