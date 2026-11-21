package com.jobconnect.service;

import com.jobconnect.dto.AdminMetricsDto;
import com.jobconnect.dto.UpdateProfileRequest;
import com.jobconnect.dto.UserProfileDto;
import com.jobconnect.dto.UserSummaryDto;
import com.jobconnect.entity.ApplicationStatus;
import com.jobconnect.entity.JobStatus;
import com.jobconnect.entity.Resume;
import com.jobconnect.entity.User;
import com.jobconnect.exception.ResourceNotFoundException;
import com.jobconnect.repository.ApplicationRepository;
import com.jobconnect.repository.JobRepository;
import com.jobconnect.repository.ResumeRepository;
import com.jobconnect.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final DtoMapper dtoMapper;

    public UserService(
            UserRepository userRepository,
            ResumeRepository resumeRepository,
            JobRepository jobRepository,
            ApplicationRepository applicationRepository,
            DtoMapper dtoMapper
    ) {
        this.userRepository = userRepository;
        this.resumeRepository = resumeRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.dtoMapper = dtoMapper;
    }

    @Transactional(readOnly = true)
    public UserProfileDto getProfile(String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<Resume> resumes = resumeRepository.findByUserIdOrderByUploadedAtDesc(user.getId());
        return dtoMapper.toUserProfile(user, resumes);
    }

    @Transactional
    public UserProfileDto updateProfile(String userEmail, UpdateProfileRequest request) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone());
        user.setTitle(request.title());
        user.setLocation(request.location());
        user.setProfessionalSummary(request.professionalSummary());
        user.setSkills(request.skills());
        user.setExperience(request.experience());
        user.setEducation(request.education());
        user.setTargetRoles(request.targetRoles());
        user.setDesiredSalaryMin(request.desiredSalaryMin());
        user.setDesiredSalaryMax(request.desiredSalaryMax());
        user.setWorkArrangements(request.workArrangements());
        user.setGithubUrl(request.githubUrl());
        user.setLinkedinUrl(request.linkedinUrl());
        user.setPortfolioUrl(request.portfolioUrl());

        User saved = userRepository.save(user);
        List<Resume> resumes = resumeRepository.findByUserIdOrderByUploadedAtDesc(saved.getId());
        return dtoMapper.toUserProfile(saved, resumes);
    }

    @Transactional(readOnly = true)
    public List<UserSummaryDto> getAllUsersAdmin() {
        return userRepository.findAll()
                .stream()
                .map(dtoMapper::toUserSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminMetricsDto getAdminMetrics() {
        long activeJobs = jobRepository.countByStatus(JobStatus.OPEN);
        long totalCandidates = userRepository.count();
        long applicationsSubmitted = applicationRepository.count();
        long placementsMade = applicationRepository.countByStatus(ApplicationStatus.HIRED);
        long underReview = applicationRepository.countByStatus(ApplicationStatus.UNDER_REVIEW);
        long shortlisted = applicationRepository.countByStatus(ApplicationStatus.SHORTLISTED);
        long rejected = applicationRepository.countByStatus(ApplicationStatus.REJECTED);

        return new AdminMetricsDto(
                activeJobs,
                totalCandidates,
                applicationsSubmitted,
                placementsMade,
                underReview,
                shortlisted,
                rejected
        );
    }
}
