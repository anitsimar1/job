package com.jobconnect.service;

import com.jobconnect.dto.ApplicationDto;
import com.jobconnect.dto.ApplicationRequest;
import com.jobconnect.dto.OfferDecisionResponse;
import com.jobconnect.entity.*;
import com.jobconnect.exception.BadRequestException;
import com.jobconnect.exception.DuplicateResourceException;
import com.jobconnect.exception.ResourceNotFoundException;
import com.jobconnect.repository.ApplicationRepository;
import com.jobconnect.repository.JobRepository;
import com.jobconnect.repository.ResumeRepository;
import com.jobconnect.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ApplicationService {

    private static final Pattern NUMERIC_OFFER_ID_PATTERN =
            Pattern.compile("^(?:(?:app|offer)-)?(\\d+)$", Pattern.CASE_INSENSITIVE);

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final ResumeRepository resumeRepository;
    private final DtoMapper dtoMapper;
    private final EmailNotificationService emailNotificationService;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            UserRepository userRepository,
            JobRepository jobRepository,
            ResumeRepository resumeRepository,
            DtoMapper dtoMapper
    ) {
        this(applicationRepository, userRepository, jobRepository, resumeRepository, dtoMapper, null);
    }

    @Autowired
    public ApplicationService(
            ApplicationRepository applicationRepository,
            UserRepository userRepository,
            JobRepository jobRepository,
            ResumeRepository resumeRepository,
            DtoMapper dtoMapper,
            EmailNotificationService emailNotificationService
    ) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.resumeRepository = resumeRepository;
        this.dtoMapper = dtoMapper;
        this.emailNotificationService = emailNotificationService;
    }

    @Transactional
    public ApplicationDto applyForJob(ApplicationRequest request, String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isEmployerOnly = user.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ROLE_EMPLOYER)
                && user.getRoles().stream()
                        .noneMatch(r -> r.getName() == RoleName.ROLE_JOB_SEEKER || r.getName() == RoleName.ROLE_ADMIN);
        if (isEmployerOnly) {
            throw new AccessDeniedException("Job poster accounts cannot apply for jobs");
        }

        Job job = jobRepository.findById(request.jobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + request.jobId()));

        if (job.getStatus() != JobStatus.OPEN) {
            throw new BadRequestException("This job listing is no longer accepting applications");
        }

        if (applicationRepository.existsByUserIdAndJobId(user.getId(), job.getId())) {
            throw new DuplicateResourceException("You have already applied to this job");
        }

        Resume resume = null;
        if (request.resumeId() != null && request.resumeId() > 0) {
            resume = resumeRepository.findByIdAndUserId(request.resumeId(), user.getId())
                    .orElse(null);
            if (resume == null) {
                if (resumeRepository.existsById(request.resumeId())) {
                    throw new AccessDeniedException(
                            "Selected resume does not exist or belong to your account");
                }
                List<Resume> userResumes = resumeRepository.findByUserIdOrderByUploadedAtDesc(user.getId());
                resume = userResumes.stream()
                        .filter(Resume::isDefault)
                        .findFirst()
                        .orElse(userResumes.isEmpty() ? null : userResumes.get(0));
            }
        }

        Application app = new Application();
        app.setUser(user);
        app.setJob(job);
        app.setResume(resume);
        app.setCoverLetter(request.coverLetter());
        app.setExperienceYears(request.experienceYears());
        app.setWorkAuthorized(request.workAuthorized() != null ? request.workAuthorized() : Boolean.TRUE);
        app.setRequiresSponsorship(
                request.requiresSponsorship() != null ? request.requiresSponsorship() : Boolean.FALSE);
        app.setNoticePeriod(request.noticePeriod());
        app.setStatus(ApplicationStatus.APPLIED);

        Application saved = applicationRepository.save(app);

        job.setApplicantsCount((job.getApplicantsCount() != null ? job.getApplicantsCount() : 0) + 1);
        jobRepository.save(job);

        dispatchApplicationEmails(saved, user, job, resume);

        return dtoMapper.toApplicationDto(saved);
    }

    private void dispatchApplicationEmails(Application saved, User candidate, Job job, Resume resume) {
        if (emailNotificationService == null) {
            return;
        }
        User poster = job.getCreatedBy();
        EmailNotificationService.ApplicationNotificationPayload payload =
                new EmailNotificationService.ApplicationNotificationPayload(
                        saved.getId(),
                        candidate.getFullName(),
                        candidate.getEmail(),
                        candidate.getPhone(),
                        job.getId(),
                        job.getTitle(),
                        job.getCompany(),
                        job.getLocation(),
                        job.getSalary(),
                        poster != null ? poster.getFullName() : null,
                        poster != null ? poster.getEmail() : null,
                        resume != null ? resume.getFileName() : null,
                        saved.getExperienceYears(),
                        saved.getNoticePeriod(),
                        saved.getCoverLetter()
                );

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    emailNotificationService.sendApplicationEmails(payload);
                }
            });
        } else {
            emailNotificationService.sendApplicationEmails(payload);
        }
    }

    @Transactional(readOnly = true)
    public List<ApplicationDto> getMyApplications(String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return applicationRepository.findByUserIdOrderByAppliedAtDesc(user.getId())
                .stream()
                .map(dtoMapper::toApplicationDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ApplicationDto getApplicationById(Long id, String requesterEmail, boolean isAdmin) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + id));

        if (!isAdmin && !app.getUser().getEmail().equalsIgnoreCase(requesterEmail)) {
            throw new AccessDeniedException("You cannot view another user's application");
        }

        return dtoMapper.toApplicationDto(app);
    }

    @Transactional(readOnly = true)
    public Page<ApplicationDto> getAllApplicationsAdmin(Pageable pageable) {
        return applicationRepository.findAllByOrderByAppliedAtDesc(pageable)
                .map(dtoMapper::toApplicationDto);
    }

    @Transactional(readOnly = true)
    public List<ApplicationDto> getApplicationsForJob(Long jobId, String requesterEmail, boolean isAdmin) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + jobId));

        if (!isAdmin && (job.getCreatedBy() == null || !job.getCreatedBy().getEmail().equalsIgnoreCase(requesterEmail))) {
            throw new AccessDeniedException("You can only view applications for jobs you posted");
        }

        return applicationRepository.findByJobIdOrderByAppliedAtDesc(jobId)
                .stream()
                .map(dtoMapper::toApplicationDto)
                .toList();
    }

    @Transactional
    public ApplicationDto updateApplicationStatus(Long id, ApplicationStatus status) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + id));
        app.setStatus(status);
        return dtoMapper.toApplicationDto(applicationRepository.save(app));
    }

    @Transactional
    public ApplicationDto updateApplicationStatusForPoster(
            Long id,
            ApplicationStatus status,
            String requesterEmail,
            boolean isAdmin
    ) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + id));

        User createdBy = app.getJob().getCreatedBy();
        if (!isAdmin && (createdBy == null || !createdBy.getEmail().equalsIgnoreCase(requesterEmail))) {
            throw new AccessDeniedException("You can only update applications for jobs you posted");
        }

        app.setStatus(status);
        return dtoMapper.toApplicationDto(applicationRepository.save(app));
    }

    @Transactional
    public ApplicationDto withdrawApplication(Long id, String userEmail) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + id));

        if (!app.getUser().getEmail().equalsIgnoreCase(userEmail)) {
            throw new AccessDeniedException("You can only withdraw your own applications");
        }

        app.setStatus(ApplicationStatus.REJECTED);
        return dtoMapper.toApplicationDto(applicationRepository.save(app));
    }

    @Transactional
    public OfferDecisionResponse respondToOffer(String offerId, String decision, String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (decision == null) {
            throw new BadRequestException("Offer decision must be 'accepted' or 'declined'");
        }
        String normalizedDecision = decision.trim().toLowerCase(Locale.ROOT);
        if (!"accepted".equals(normalizedDecision) && !"declined".equals(normalizedDecision)) {
            throw new BadRequestException("Offer decision must be 'accepted' or 'declined'");
        }

        Long applicationId = extractNumericApplicationId(offerId);
        if (applicationId != null) {
            Application app = applicationRepository.findById(applicationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Offer application not found with id: " + applicationId));

            if (!app.getUser().getId().equals(user.getId())) {
                throw new AccessDeniedException("You cannot respond to another user's offer");
            }

            app.setStatus("accepted".equals(normalizedDecision)
                    ? ApplicationStatus.HIRED
                    : ApplicationStatus.REJECTED);
            applicationRepository.save(app);
            return new OfferDecisionResponse(offerId, normalizedDecision, app.getId());
        }

        return new OfferDecisionResponse(offerId, normalizedDecision, null);
    }

    private Long extractNumericApplicationId(String offerId) {
        if (offerId == null) {
            return null;
        }
        Matcher matcher = NUMERIC_OFFER_ID_PATTERN.matcher(offerId.trim());
        if (!matcher.matches()) {
            return null;
        }
        try {
            return Long.parseLong(matcher.group(1));
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
