package com.jobconnect.controller;

import com.jobconnect.dto.ApiResponse;
import com.jobconnect.dto.ApplicationDto;
import com.jobconnect.dto.JobDto;
import com.jobconnect.dto.JobRequest;
import com.jobconnect.dto.JobStatusUpdateRequest;
import com.jobconnect.service.ApplicationService;
import com.jobconnect.service.JobService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;
    private final ApplicationService applicationService;

    public JobController(JobService jobService, ApplicationService applicationService) {
        this.jobService = jobService;
        this.applicationService = applicationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<JobDto>>> listJobs(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Pageable pageable = buildPageable(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.ok(jobService.getJobs(status, pageable)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<JobDto>>> searchJobs(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String experience,
            @RequestParam(required = false) String employmentType,
            @RequestParam(required = false) String workplace,
            @RequestParam(required = false) String sector,
            @RequestParam(required = false) Integer minSalaryK,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Pageable pageable = buildPageable(page, size, sortBy, direction);
        Page<JobDto> results = jobService.searchJobs(
                q, location, experience, employmentType, workplace, sector, minSalaryK, status, pageable
        );
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('EMPLOYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<JobDto>>> myPostedJobs(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(jobService.getJobsByPoster(authentication.getName())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobDto>> getJobById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(jobService.getJobById(id)));
    }

    @GetMapping("/{id}/applications")
    @PreAuthorize("hasAnyRole('EMPLOYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<ApplicationDto>>> getJobApplications(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                applicationService.getApplicationsForJob(id, authentication.getName(), isAdmin(authentication))
        ));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('EMPLOYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<JobDto>> createJob(
            @Valid @RequestBody JobRequest request,
            Authentication authentication
    ) {
        JobDto created = jobService.createJob(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Job created successfully", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<JobDto>> updateJob(
            @PathVariable Long id,
            @Valid @RequestBody JobRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Job updated successfully",
                jobService.updateJob(id, request, authentication.getName(), isAdmin(authentication))
        ));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('EMPLOYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<JobDto>> updateJobStatus(
            @PathVariable Long id,
            @Valid @RequestBody JobStatusUpdateRequest request,
            Authentication authentication
    ) {
        JobDto updated = jobService.updateJobStatus(
                id, request.status(), authentication.getName(), isAdmin(authentication)
        );
        return ResponseEntity.ok(ApiResponse.ok("Job status updated", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteJob(
            @PathVariable Long id,
            Authentication authentication
    ) {
        jobService.deleteJob(id, authentication.getName(), isAdmin(authentication));
        return ResponseEntity.ok(ApiResponse.ok("Job deleted successfully", null));
    }

    @PostMapping("/{id}/bookmark")
    @PreAuthorize("hasAnyRole('JOB_SEEKER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> bookmarkJob(
            @PathVariable Long id, Authentication authentication) {
        jobService.bookmarkJob(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Job bookmarked", null));
    }

    @DeleteMapping("/{id}/bookmark")
    @PreAuthorize("hasAnyRole('JOB_SEEKER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> unbookmarkJob(
            @PathVariable Long id, Authentication authentication) {
        jobService.unbookmarkJob(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Bookmark removed", null));
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    private Pageable buildPageable(int page, int size, String sortBy, String direction) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 50);
        String safeSort = switch (sortBy) {
            case "id", "maxSalaryK", "minSalaryK", "applicantsCount", "matchScore", "title", "company", "createdAt" -> sortBy;
            default -> "createdAt";
        };
        Sort primarySort = "asc".equalsIgnoreCase(direction)
                ? Sort.by(safeSort).ascending()
                : Sort.by(safeSort).descending();
        Sort deterministicSort = "id".equals(safeSort)
                ? primarySort
                : primarySort.and(Sort.by("id").ascending());
        return PageRequest.of(safePage, safeSize, deterministicSort);
    }
}
