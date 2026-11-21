package com.jobconnect.dto;

import com.jobconnect.entity.JobStatus;

import java.time.Instant;
import java.util.List;

public record JobDto(
    Long id,
    String slug,
    String title,
    String company,
    String companyTagline,
    String companySize,
    String companyLogo,
    boolean verified,
    String location,
    String workplace,
    String description,
    String requirements,
    String salary,
    Integer minSalaryK,
    Integer maxSalaryK,
    String employmentType,
    String experience,
    String yearsRequired,
    String sector,
    List<String> skills,
    Integer matchScore,
    Integer applicantsCount,
    boolean featured,
    JobStatus status,
    Instant createdAt
) {}
