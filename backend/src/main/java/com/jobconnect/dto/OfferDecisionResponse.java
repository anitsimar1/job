package com.jobconnect.dto;

public record OfferDecisionResponse(
    String offerId,
    String status,
    Long applicationId
) {}
