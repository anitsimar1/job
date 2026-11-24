package com.jobconnect.controller;

import com.jobconnect.dto.ApiResponse;
import com.jobconnect.dto.ApplicationDto;
import com.jobconnect.dto.ApplicationRequest;
import com.jobconnect.dto.OfferDecisionRequest;
import com.jobconnect.dto.OfferDecisionResponse;
import com.jobconnect.dto.UpdateApplicationStatusRequest;
import com.jobconnect.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('JOB_SEEKER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ApplicationDto>> apply(
            @Valid @RequestBody ApplicationRequest request,
            Authentication authentication
    ) {
        ApplicationDto created = applicationService.applyForJob(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Application submitted successfully", created));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ApplicationDto>>> myApplications(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(applicationService.getMyApplications(authentication.getName())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ApplicationDto>> getById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        return ResponseEntity.ok(ApiResponse.ok(
                applicationService.getApplicationById(id, authentication.getName(), isAdmin)
        ));
    }

    @PatchMapping("/{id}/withdraw")
    @PreAuthorize("hasAnyRole('JOB_SEEKER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ApplicationDto>> withdrawApplication(
            @PathVariable Long id,
            Authentication authentication
    ) {
        ApplicationDto withdrawn = applicationService.withdrawApplication(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Application withdrawn successfully", withdrawn));
    }

    @PatchMapping("/offers/{offerId}/decision")
    @PreAuthorize("hasAnyRole('JOB_SEEKER', 'ADMIN')")
    public ResponseEntity<ApiResponse<OfferDecisionResponse>> respondToOffer(
            @PathVariable String offerId,
            @Valid @RequestBody OfferDecisionRequest request,
            Authentication authentication
    ) {
        OfferDecisionResponse result =
                applicationService.respondToOffer(offerId, request.decision(), authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Offer decision recorded", result));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('EMPLOYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ApplicationDto>> updateApplicationStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateApplicationStatusRequest request,
            Authentication authentication
    ) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        ApplicationDto updated = applicationService.updateApplicationStatusForPoster(
                id, request.status(), authentication.getName(), isAdmin
        );
        return ResponseEntity.ok(ApiResponse.ok("Application status updated", updated));
    }
}
