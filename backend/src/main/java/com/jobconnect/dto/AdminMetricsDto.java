package com.jobconnect.dto;

public record AdminMetricsDto(
    long activeJobs,
    long totalCandidates,
    long applicationsSubmitted,
    long placementsMade,
    long underReviewCount,
    long shortlistedCount,
    long rejectedCount
) {}
