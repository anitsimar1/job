package com.jobconnect.controller;

import com.jobconnect.dto.ApiResponse;
import com.jobconnect.dto.JobDto;
import com.jobconnect.dto.JobRequest;
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

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<JobDto>>> listJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Pageable pageable = buildPageable(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.ok(jobService.getJobs(pageable)));
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
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Pageable pageable = buildPageable(page, size, sortBy, direction);
        Page<JobDto> results = jobService.searchJobs(
                q, location, experience, employmentType, workplace, sector, minSalaryK, pageable
        );
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobDto>> getJobById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(jobService.getJobById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<JobDto>> createJob(
            @Valid @RequestBody JobRequest request,
            Authentication authentication
    ) {
        JobDto created = jobService.createJob(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Job created successfully", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<JobDto>> updateJob(
            @PathVariable Long id,
            @Valid @RequestBody JobRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Job updated successfully", jobService.updateJob(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteJob(@PathVariable Long id) {
        jobService.deleteJob(id);
        return ResponseEntity.ok(ApiResponse.ok("Job deleted successfully", null));
    }

    @PostMapping("/{id}/bookmark")
    public ResponseEntity<ApiResponse<Void>> bookmarkJob(
            @PathVariable Long id, Authentication authentication) {
        jobService.bookmarkJob(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Job bookmarked", null));
    }

    @DeleteMapping("/{id}/bookmark")
    public ResponseEntity<ApiResponse<Void>> unbookmarkJob(
            @PathVariable Long id, Authentication authentication) {
        jobService.unbookmarkJob(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Bookmark removed", null));
    }

    private Pageable buildPageable(int page, int size, String sortBy, String direction) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 50);
        String safeSort = switch (sortBy) {
            case "maxSalaryK", "minSalaryK", "applicantsCount", "matchScore", "title", "company", "createdAt" -> sortBy;
            default -> "createdAt";
        };
        Sort sort = "asc".equalsIgnoreCase(direction)
                ? Sort.by(safeSort).ascending()
                : Sort.by(safeSort).descending();
        return PageRequest.of(safePage, safeSize, sort);
    }
}
