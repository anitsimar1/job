package com.jobconnect.service;

import com.jobconnect.dto.*;
import com.jobconnect.entity.*;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class DtoMapper {

    public UserSummaryDto toUserSummary(User user) {
        Set<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());
        return new UserSummaryDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getProfileImage(),
                roleNames,
                user.isEnabled(),
                user.getCreatedAt(),
                user.getAuthProvider() != null ? user.getAuthProvider().name() : AuthProvider.LOCAL.name(),
                user.isEmailVerified(),
                user.getCompanyName()
        );
    }

    public UserProfileDto toUserProfile(User user, List<Resume> resumes) {
        Set<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());
        List<ResumeDto> resumeDtos = resumes.stream().map(this::toResumeDto).toList();
        return new UserProfileDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getProfileImage(),
                user.getTitle(),
                user.getLocation(),
                user.getProfessionalSummary(),
                user.getSkills(),
                user.getExperience(),
                user.getEducation(),
                user.getTargetRoles(),
                user.getDesiredSalaryMin(),
                user.getDesiredSalaryMax(),
                user.getWorkArrangements(),
                user.getGithubUrl(),
                user.getLinkedinUrl(),
                user.getPortfolioUrl(),
                roleNames,
                resumeDtos,
                user.getCompanyName()
        );
    }

    public ResumeDto toResumeDto(Resume resume) {
        return new ResumeDto(
                resume.getId(),
                resume.getFileName(),
                resume.getContentType(),
                resume.getFileSizeBytes(),
                resume.isDefault(),
                resume.getAtsScore(),
                resume.getUploadedAt()
        );
    }

    public JobDto toJobDto(Job job) {
        List<String> skillList = (job.getSkills() == null || job.getSkills().isBlank())
                ? Collections.emptyList()
                : Arrays.stream(job.getSkills().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList();

        User poster = job.getCreatedBy();
        return new JobDto(
                job.getId(),
                job.getSlug(),
                job.getTitle(),
                job.getCompany(),
                job.getCompanyTagline(),
                job.getCompanySize(),
                job.getCompanyLogo(),
                job.isVerified(),
                job.getLocation(),
                job.getWorkplace(),
                job.getDescription(),
                job.getRequirements(),
                job.getSalary(),
                job.getMinSalaryK(),
                job.getMaxSalaryK(),
                job.getEmploymentType(),
                job.getExperience(),
                job.getYearsRequired(),
                job.getSector(),
                skillList,
                job.getMatchScore(),
                job.getApplicantsCount(),
                job.isFeatured(),
                job.getStatus(),
                job.getCreatedAt(),
                poster != null ? poster.getId() : null,
                poster != null ? poster.getFullName() : null
        );
    }

    public ApplicationDto toApplicationDto(Application app) {
        Job job = app.getJob();
        User user = app.getUser();
        Resume resume = app.getResume();

        return new ApplicationDto(
                app.getId(),
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                job.getId(),
                job.getSlug(),
                job.getTitle(),
                job.getCompany(),
                job.getCompanyLogo(),
                job.getLocation(),
                job.getSalary(),
                resume != null ? resume.getId() : null,
                resume != null ? resume.getFileName() : null,
                app.getCoverLetter(),
                app.getExperienceYears(),
                app.getWorkAuthorized(),
                app.getRequiresSponsorship(),
                app.getNoticePeriod(),
                app.getStatus(),
                app.getAppliedAt(),
                app.getUpdatedAt()
        );
    }
}
