package com.jobconnect.service;

import com.jobconnect.dto.ApplicationDto;
import com.jobconnect.dto.ApplicationRequest;
import com.jobconnect.dto.OfferDecisionResponse;
import com.jobconnect.entity.*;
import com.jobconnect.exception.DuplicateResourceException;
import com.jobconnect.repository.ApplicationRepository;
import com.jobconnect.repository.JobRepository;
import com.jobconnect.repository.ResumeRepository;
import com.jobconnect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private JobRepository jobRepository;
    @Mock private ResumeRepository resumeRepository;
    @Spy private DtoMapper dtoMapper = new DtoMapper();

    @InjectMocks
    private ApplicationService applicationService;

    private User seeker;
    private Job openJob;
    private Resume resume;

    @BeforeEach
    void setUp() {
        seeker = new User();
        seeker.setId(10L);
        seeker.setEmail("elena@techmail.io");
        seeker.setFullName("Elena Rostova");

        openJob = new Job();
        openJob.setId(55L);
        openJob.setTitle("Senior Frontend Engineer");
        openJob.setCompany("Apex Cloud Systems");
        openJob.setLocation("Remote");
        openJob.setSalary("$160k - $190k");
        openJob.setStatus(JobStatus.OPEN);
        openJob.setApplicantsCount(24);

        resume = new Resume();
        resume.setId(7L);
        resume.setUser(seeker);
        resume.setFileName("Elena_Resume.pdf");
    }

    @Test
    void applyForJob_createsApplicationAndIncrementsApplicantsCount() {
        ApplicationRequest req = new ApplicationRequest(
                55L, 7L, "Excited to contribute to Apex.", "5-7 yrs", true, false, "2 Weeks"
        );

        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(seeker));
        when(jobRepository.findById(55L)).thenReturn(Optional.of(openJob));
        when(applicationRepository.existsByUserIdAndJobId(10L, 55L)).thenReturn(false);
        when(resumeRepository.findByIdAndUserId(7L, 10L)).thenReturn(Optional.of(resume));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> {
            Application a = inv.getArgument(0);
            a.setId(99L);
            return a;
        });

        ApplicationDto result = applicationService.applyForJob(req, "elena@techmail.io");

        assertThat(result.id()).isEqualTo(99L);
        assertThat(result.status()).isEqualTo(ApplicationStatus.APPLIED);
        assertThat(openJob.getApplicantsCount()).isEqualTo(25);
        verify(jobRepository).save(openJob);
    }

    @Test
    void applyForJob_allowsApplyingWithoutResume() {
        ApplicationRequest req = new ApplicationRequest(
                55L, null, "Applying directly with profile.", "5-7 yrs", true, false, "2 Weeks"
        );

        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(seeker));
        when(jobRepository.findById(55L)).thenReturn(Optional.of(openJob));
        when(applicationRepository.existsByUserIdAndJobId(10L, 55L)).thenReturn(false);
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> {
            Application a = inv.getArgument(0);
            a.setId(101L);
            return a;
        });

        ApplicationDto result = applicationService.applyForJob(req, "elena@techmail.io");

        assertThat(result.id()).isEqualTo(101L);
        assertThat(result.resumeId()).isNull();
        verify(resumeRepository, never()).findByIdAndUserId(any(), any());
    }

    @Test
    void applyForJob_fallsBackWhenResumeIdDoesNotExistAndRejectsOtherUsersResume() {
        ApplicationRequest staleReq = new ApplicationRequest(
                55L, 999L, "Stale resume id.", "5-7 yrs", true, false, "2 Weeks"
        );

        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(seeker));
        when(jobRepository.findById(55L)).thenReturn(Optional.of(openJob));
        when(applicationRepository.existsByUserIdAndJobId(10L, 55L)).thenReturn(false);
        when(resumeRepository.findByIdAndUserId(999L, 10L)).thenReturn(Optional.empty());
        when(resumeRepository.existsById(999L)).thenReturn(false);
        when(resumeRepository.findByUserIdOrderByUploadedAtDesc(10L)).thenReturn(List.of());
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> {
            Application a = inv.getArgument(0);
            a.setId(102L);
            return a;
        });

        ApplicationDto fallbackResult = applicationService.applyForJob(staleReq, "elena@techmail.io");
        assertThat(fallbackResult.id()).isEqualTo(102L);
        assertThat(fallbackResult.resumeId()).isNull();

        ApplicationRequest otherUserReq = new ApplicationRequest(
                55L, 888L, "Other user resume.", "5-7 yrs", true, false, "2 Weeks"
        );
        when(resumeRepository.findByIdAndUserId(888L, 10L)).thenReturn(Optional.empty());
        when(resumeRepository.existsById(888L)).thenReturn(true);

        assertThatThrownBy(() -> applicationService.applyForJob(otherUserReq, "elena@techmail.io"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Selected resume does not exist or belong to your account");
    }

    @Test
    void applyForJob_preventsDuplicateApplicationForSameJob() {
        ApplicationRequest req = new ApplicationRequest(55L, null, "Duplicate attempt", null, true, false, null);

        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(seeker));
        when(jobRepository.findById(55L)).thenReturn(Optional.of(openJob));
        when(applicationRepository.existsByUserIdAndJobId(10L, 55L)).thenReturn(true);

        assertThatThrownBy(() -> applicationService.applyForJob(req, "elena@techmail.io"))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already applied");
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void getApplicationById_enforcesUserDataIsolation() {
        Application app = new Application();
        app.setId(88L);
        app.setUser(seeker);
        app.setJob(openJob);
        app.setStatus(ApplicationStatus.APPLIED);

        when(applicationRepository.findById(88L)).thenReturn(Optional.of(app));

        assertThatThrownBy(() ->
                applicationService.getApplicationById(88L, "other.user@techmail.io", false))
                .isInstanceOf(AccessDeniedException.class);

        ApplicationDto ownResult = applicationService.getApplicationById(88L, "elena@techmail.io", false);
        assertThat(ownResult.id()).isEqualTo(88L);
    }

    @Test
    void withdrawApplication_marksOwnedApplicationRejected() {
        Application app = new Application();
        app.setId(88L);
        app.setUser(seeker);
        app.setJob(openJob);
        app.setStatus(ApplicationStatus.APPLIED);

        when(applicationRepository.findById(88L)).thenReturn(Optional.of(app));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() ->
                applicationService.withdrawApplication(88L, "other.user@techmail.io"))
                .isInstanceOf(AccessDeniedException.class);

        ApplicationDto withdrawn = applicationService.withdrawApplication(88L, "elena@techmail.io");
        assertThat(withdrawn.status()).isEqualTo(ApplicationStatus.REJECTED);
    }

    @Test
    void respondToOffer_updatesNumericApplicationAndHandlesSpotlightOffer() {
        Application app = new Application();
        app.setId(42L);
        app.setUser(seeker);
        app.setJob(openJob);
        app.setStatus(ApplicationStatus.HIRED);

        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(seeker));
        when(applicationRepository.findById(42L)).thenReturn(Optional.of(app));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        OfferDecisionResponse accepted = applicationService.respondToOffer("42", "accepted", "elena@techmail.io");
        assertThat(accepted.status()).isEqualTo("accepted");
        assertThat(accepted.applicationId()).isEqualTo(42L);
        assertThat(app.getStatus()).isEqualTo(ApplicationStatus.HIRED);

        OfferDecisionResponse declined = applicationService.respondToOffer("42", "declined", "elena@techmail.io");
        assertThat(declined.status()).isEqualTo("declined");
        assertThat(app.getStatus()).isEqualTo(ApplicationStatus.REJECTED);

        OfferDecisionResponse spotlight = applicationService.respondToOffer("offer-vercel-lead", "accepted", "elena@techmail.io");
        assertThat(spotlight.offerId()).isEqualTo("offer-vercel-lead");
        assertThat(spotlight.status()).isEqualTo("accepted");
        assertThat(spotlight.applicationId()).isNull();
    }
}
