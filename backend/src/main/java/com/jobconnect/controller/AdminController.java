package com.jobconnect.controller;

import com.jobconnect.dto.*;
import com.jobconnect.service.ApplicationService;
import com.jobconnect.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final ApplicationService applicationService;
    private final UserService userService;

    public AdminController(ApplicationService applicationService, UserService userService) {
        this.applicationService = applicationService;
        this.userService = userService;
    }

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<AdminMetricsDto>> getMetrics() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAdminMetrics()));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserSummaryDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsersAdmin()));
    }

    @GetMapping("/applications")
    public ResponseEntity<ApiResponse<Page<ApplicationDto>>> getAllApplications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        return ResponseEntity.ok(ApiResponse.ok(
                applicationService.getAllApplicationsAdmin(PageRequest.of(safePage, safeSize))
        ));
    }

    @PutMapping("/applications/{id}/status")
    public ResponseEntity<ApiResponse<ApplicationDto>> updateApplicationStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateApplicationStatusRequest request
    ) {
        ApplicationDto updated = applicationService.updateApplicationStatus(id, request.status());
        return ResponseEntity.ok(ApiResponse.ok("Application status updated", updated));
    }
}
