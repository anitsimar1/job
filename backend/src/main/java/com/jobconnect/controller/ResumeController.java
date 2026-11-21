package com.jobconnect.controller;

import com.jobconnect.dto.ApiResponse;
import com.jobconnect.dto.ResumeDto;
import com.jobconnect.service.ResumeService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ResumeDto>> uploadResume(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        ResumeDto uploaded = resumeService.uploadResume(file, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Resume uploaded successfully", uploaded));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ResumeDto>>> myResumes(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(resumeService.getMyResumes(authentication.getName())));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadResume(
            @PathVariable Long id,
            Authentication authentication
    ) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        ResumeService.DownloadedResume downloaded =
                resumeService.downloadResume(id, authentication.getName(), isAdmin);

        String safeFileName = downloaded.fileName().replace("\"", "");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(downloaded.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeFileName + "\"")
                .body(downloaded.resource());
    }

    @PatchMapping("/{id}/default")
    public ResponseEntity<ApiResponse<Void>> setDefault(
            @PathVariable Long id,
            Authentication authentication
    ) {
        resumeService.setDefaultResume(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Default resume updated", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteResume(
            @PathVariable Long id,
            Authentication authentication
    ) {
        resumeService.deleteResume(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Resume deleted successfully", null));
    }
}
