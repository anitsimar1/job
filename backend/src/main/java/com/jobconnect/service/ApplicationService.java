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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public ApplicationService(
            ApplicationRepository applicationRepository,
            UserRepository userRepository,
            JobRepository jobRepository,
            ResumeRepository resumeRepository,
            DtoMapper dtoMapper
    ) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.resumeRepository = resumeRepository;
        this.dtoMapper = dtoMapper;
    }

    @Transactional
    public ApplicationDto applyForJob(ApplicationRequest request, String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Job job = jobRepository.findById(request.jobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + request.jobId()));

        if (job.getStatus() != JobStatus.OPEN) {
            throw new BadRequestException("This job listing is no longer accepting applications");
        }

        if (applicationRepository.existsByUserIdAndJobId(user.getId(), job.getId())) {
            throw new DuplicateResourceException("You have already applied to this job");
        }

        Resume resume = null;
        if (request.resumeId() != null) {
            resume = resumeRepository.findByIdAndUserId(request.resumeId(), user.getId())
                    .orElseThrow(() -> new AccessDeniedException(
                            "Selected resume does not exist or belong to your account"));
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

        return dtoMapper.toApplicationDto(saved);
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

    @Transactional
    public ApplicationDto updateApplicationStatus(Long id, ApplicationStatus status) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + id));
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
