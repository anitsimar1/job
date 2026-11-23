package com.jobconnect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OfferDecisionRequest(
    @NotBlank(message = "Offer decision is required")
    @Pattern(regexp = "(?i)^(accepted|declined)$", message = "Offer decision must be 'accepted' or 'declined'")
    String decision
) {}
