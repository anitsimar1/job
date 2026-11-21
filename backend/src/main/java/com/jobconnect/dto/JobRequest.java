package com.jobconnect.dto;

import com.jobconnect.entity.JobStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record JobRequest(
    @NotBlank(message = "Job title is required")
    @Size(max = 200)
    String title,

    @NotBlank(message = "Company name is required")
    @Size(max = 160)
    String company,

    String companyTagline,
    String companySize,
    String companyLogo,

    @NotBlank(message = "Location is required")
    @Size(max = 160)
    String location,

    String workplace,

    @NotBlank(message = "Description is required")
    String description,

    @NotBlank(message = "Requirements are required")
    String requirements,

    @NotBlank(message = "Salary range is required")
    @Size(max = 120)
    String salary,

    Integer minSalaryK,
    Integer maxSalaryK,

    @NotBlank(message = "Employment type is required")
    String employmentType,

    @NotBlank(message = "Experience level is required")
    String experience,

    String yearsRequired,
    String sector,
    List<String> skills,
    Boolean featured,
    JobStatus status
) {}
