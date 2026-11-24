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
    Instant createdAt,
    Long createdById,
    String createdByName
) {
    public JobDto(
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
    ) {
        this(
            id, slug, title, company, companyTagline, companySize, companyLogo,
            verified, location, workplace, description, requirements, salary,
            minSalaryK, maxSalaryK, employmentType, experience, yearsRequired,
            sector, skills, matchScore, applicantsCount, featured, status,
            createdAt, null, null
        );
    }
}
