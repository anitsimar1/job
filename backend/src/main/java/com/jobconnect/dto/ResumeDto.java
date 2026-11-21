package com.jobconnect.dto;

import java.time.Instant;

public record ResumeDto(
    Long id,
    String fileName,
    String contentType,
    Long fileSizeBytes,
    boolean isDefault,
    Integer atsScore,
    Instant uploadedAt
) {}
