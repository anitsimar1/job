package com.jobconnect.dto;

import java.time.Instant;
import java.util.Map;

public record ApiErrorResponse(
    int status,
    String code,
    String message,
    String path,
    Instant timestamp,
    Map<String, String> fieldErrors
) {}
