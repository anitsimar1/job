package com.jobconnect.service;

import com.jobconnect.dto.ResumeDto;
import com.jobconnect.entity.Resume;
import com.jobconnect.entity.User;
import com.jobconnect.exception.BadRequestException;
import com.jobconnect.exception.ResourceNotFoundException;
import com.jobconnect.repository.ResumeRepository;
import com.jobconnect.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class ResumeService {

    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "docx");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final DtoMapper dtoMapper;
    private final Path uploadRoot;

    public ResumeService(
            ResumeRepository resumeRepository,
            UserRepository userRepository,
            DtoMapper dtoMapper,
            @Value("${app.upload.dir:./storage/resumes}") String uploadDir
    ) {
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.dtoMapper = dtoMapper;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional
    public ResumeDto uploadResume(MultipartFile file, String userEmail) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Resume file must not be empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("Resume exceeds maximum size of 10MB");
        }

        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "resume.pdf"
        );
        String ext = getExtension(originalName);
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new BadRequestException("Only PDF and DOCX resume files are supported");
        }

        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Invalid resume MIME type. Allowed: PDF or DOCX");
        }

        validateMagicBytes(file, ext);

        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        try {
            Path userDir = uploadRoot.resolve("user-" + user.getId()).normalize();
            if (!userDir.startsWith(uploadRoot)) {
                throw new BadRequestException("Invalid storage path");
            }
            Files.createDirectories(userDir);

            String storedName = UUID.randomUUID() + "." + ext;
            Path destination = userDir.resolve(storedName).normalize();
            if (!destination.startsWith(userDir)) {
                throw new BadRequestException("Invalid destination path");
            }

            try (InputStream in = file.getInputStream()) {
                Files.copy(in, destination, StandardCopyOption.REPLACE_EXISTING);
            }

            List<Resume> existing = resumeRepository.findByUserIdOrderByUploadedAtDesc(user.getId());
            Resume resume = new Resume();
            resume.setUser(user);
            resume.setFileName(originalName);
            resume.setStoredFileName(storedName);
            resume.setFilePath(destination.toString());
            resume.setContentType(contentType);
            resume.setFileSizeBytes(file.getSize());
            resume.setDefault(existing.isEmpty());
            resume.setAtsScore(94);

            return dtoMapper.toResumeDto(resumeRepository.save(resume));
        } catch (IOException ex) {
            throw new BadRequestException("Failed to store resume file safely");
        }
    }

    @Transactional(readOnly = true)
    public List<ResumeDto> getMyResumes(String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return resumeRepository.findByUserIdOrderByUploadedAtDesc(user.getId())
                .stream()
                .map(dtoMapper::toResumeDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public DownloadedResume downloadResume(Long resumeId, String requesterEmail, boolean isAdmin) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found"));

        if (!isAdmin && !resume.getUser().getEmail().equalsIgnoreCase(requesterEmail)) {
            throw new AccessDeniedException("You are not authorized to access another user's resume");
        }

        try {
            Path filePath = Paths.get(resume.getFilePath()).toAbsolutePath().normalize();
            if (!filePath.startsWith(uploadRoot)) {
                throw new AccessDeniedException("Invalid resume storage path");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("Resume file not found on storage");
            }
            return new DownloadedResume(resource, resume.getFileName(), resume.getContentType());
        } catch (MalformedURLException ex) {
            throw new ResourceNotFoundException("Unable to read resume file");
        }
    }

    @Transactional
    public void setDefaultResume(Long resumeId, String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<Resume> resumes = resumeRepository.findByUserIdOrderByUploadedAtDesc(user.getId());
        boolean found = false;
        for (Resume r : resumes) {
            if (r.getId().equals(resumeId)) {
                r.setDefault(true);
                found = true;
            } else {
                r.setDefault(false);
            }
        }
        if (!found) {
            throw new ResourceNotFoundException("Resume not found for user");
        }
        resumeRepository.saveAll(resumes);
    }

    @Transactional
    public void deleteResume(Long resumeId, String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found"));

        if (!resume.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You can only delete your own resumes");
        }

        try {
            Path filePath = Paths.get(resume.getFilePath()).toAbsolutePath().normalize();
            if (filePath.startsWith(uploadRoot)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException ignored) {
            // Proceed with database cleanup
        }

        resumeRepository.delete(resume);
    }

    private String getExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        if (idx < 0 || idx == filename.length() - 1) return "";
        return filename.substring(idx + 1).toLowerCase();
    }

    private void validateMagicBytes(MultipartFile file, String ext) {
        try (InputStream is = file.getInputStream()) {
            byte[] header = is.readNBytes(4);
            if (header.length < 4) {
                throw new BadRequestException("Corrupted or empty file");
            }
            if ("pdf".equals(ext)) {
                if (!(header[0] == '%' && header[1] == 'P' && header[2] == 'D' && header[3] == 'F')) {
                    throw new BadRequestException("File contents do not match PDF signature");
                }
            } else if ("docx".equals(ext)) {
                if (!(header[0] == 'P' && header[1] == 'K')) {
                    throw new BadRequestException("File contents do not match DOCX archive signature");
                }
            }
        } catch (IOException ex) {
            throw new BadRequestException("Unable to inspect uploaded file");
        }
    }

    public record DownloadedResume(Resource resource, String fileName, String contentType) {}
}
