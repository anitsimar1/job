package com.jobconnect.controller;

import com.jobconnect.config.SecurityConfig;
import com.jobconnect.dto.ApplicationDto;
import com.jobconnect.dto.AuthResponse;
import com.jobconnect.dto.JobDto;
import com.jobconnect.dto.OfferDecisionResponse;
import com.jobconnect.dto.UserSummaryDto;
import com.jobconnect.entity.ApplicationStatus;
import com.jobconnect.entity.JobStatus;
import com.jobconnect.repository.RevokedTokenRepository;
import com.jobconnect.security.CustomUserDetailsService;
import com.jobconnect.security.HttpCookieOAuth2AuthorizationRequestRepository;
import com.jobconnect.security.JwtAuthenticationFilter;
import com.jobconnect.security.JwtProperties;
import com.jobconnect.security.JwtTokenProvider;
import com.jobconnect.security.OAuth2AuthenticationFailureHandler;
import com.jobconnect.security.OAuth2AuthenticationSuccessHandler;
import com.jobconnect.security.RestSecurityHandlers;
import com.jobconnect.service.ApplicationService;
import com.jobconnect.service.AuthService;
import com.jobconnect.service.JobService;
import com.jobconnect.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AuthController.class, JobController.class, ApplicationController.class, AdminController.class, UserController.class, HealthController.class})
@Import({
    SecurityConfig.class,
    JwtAuthenticationFilter.class,
    JwtTokenProvider.class,
    JwtProperties.class,
    RestSecurityHandlers.class,
    HttpCookieOAuth2AuthorizationRequestRepository.class,
    OAuth2AuthenticationSuccessHandler.class,
    OAuth2AuthenticationFailureHandler.class
})
@ActiveProfiles("test")
class SecurityAuthorizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean private AuthService authService;
    @MockBean private JobService jobService;
    @MockBean private ApplicationService applicationService;
    @MockBean private UserService userService;
    @MockBean private CustomUserDetailsService customUserDetailsService;
    @MockBean private RevokedTokenRepository revokedTokenRepository;

    @Test
    void registerEndpoint_allowsAnonymousPostAndSetsCookie() throws Exception {
        UserSummaryDto summary = new UserSummaryDto(
                1L, "Alex Rivera", "alex@techmail.io", "+1 555 010 9988",
                null, Set.of("ROLE_JOB_SEEKER"), true, Instant.now(), "LOCAL", false
        );
        AuthResponse authRes = new AuthResponse(summary, "ROLE_JOB_SEEKER", 86400000L);
        ResponseCookie cookie = ResponseCookie.from("jobconnect_jwt", "jwt-val").httpOnly(true).path("/").build();

        when(authService.register(any())).thenReturn(new AuthService.AuthResult(authRes, cookie));

        String payload = """
            {
              "fullName": "Alex Rivera",
              "email": "alex@techmail.io",
              "password": "Password123!",
              "confirmPassword": "Password123!",
              "phone": "+1 555 010 9988"
            }
            """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("jobconnect_jwt=")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.role").value("ROLE_JOB_SEEKER"));
    }

    @Test
    void registerEndpoint_returns400WithFieldErrorsOnInvalidInput() throws Exception {
        String invalidPayload = """
            {
              "fullName": "A",
              "email": "not-an-email",
              "password": "short",
              "confirmPassword": "",
              "phone": "123"
            }
            """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.fullName").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists())
                .andExpect(jsonPath("$.fieldErrors.phone").exists());
    }

    @Test
    void healthEndpoint_allowsAnonymousGet() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void authMeEndpoint_rejectsUnauthenticatedWithJson401NotOAuthRedirect() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void registerEndpoint_returns409OnDuplicateEmail() throws Exception {
        when(authService.register(any()))
                .thenThrow(new com.jobconnect.exception.DuplicateResourceException("An account with email alex@techmail.io already exists"));

        String payload = """
            {
              "fullName": "Alex Rivera",
              "email": "alex@techmail.io",
              "password": "Password123!",
              "confirmPassword": "Password123!",
              "phone": "+1 555 010 9988"
            }
            """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_RESOURCE"));
    }

    @Test
    void publicJobsEndpoint_allowsAnonymousGet() throws Exception {
        when(jobService.getJobs(any())).thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/jobs"))
                .andExpect(status().isOk());
    }

    @Test
    void profileEndpoint_rejectsUnauthenticatedRequestsWithJson401() throws Exception {
        mockMvc.perform(get("/api/users/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @WithMockUser(username = "seeker@techmail.io", roles = "JOB_SEEKER")
    void jobCreation_forbidsJobSeekerRole() throws Exception {
        String payload = """
            {
              "title": "Test Role",
              "company": "Acme",
              "location": "Remote",
              "description": "Build systems",
              "requirements": "5+ years",
              "salary": "$150k",
              "employmentType": "Full-time",
              "experience": "Senior Level"
            }
            """;

        mockMvc.perform(post("/api/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "seeker@techmail.io", roles = "JOB_SEEKER")
    void adminEndpoints_forbidJobSeekerRole() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@jobconnect.io", roles = "ADMIN")
    void jobCreation_allowsAdminRole() throws Exception {
        when(jobService.createJob(any(), any())).thenReturn(new JobDto(
                1L, "acme-test", "Test Role", "Acme", null, null, null, true,
                "Remote", "Remote", "Build systems", "5+ years", "$150k", 150, 150,
                "Full-time", "Senior Level", "5+", "Backend", List.of(), 90, 0, false,
                JobStatus.OPEN, Instant.now()
        ));

        String payload = """
            {
              "title": "Test Role",
              "company": "Acme",
              "location": "Remote",
              "description": "Build systems",
              "requirements": "5+ years",
              "salary": "$150k",
              "employmentType": "Full-time",
              "experience": "Senior Level"
            }
            """;

        mockMvc.perform(post("/api/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = "seeker@techmail.io", roles = "JOB_SEEKER")
    void applicationEndpoints_allowApplyWithdrawAndOfferDecision() throws Exception {
        ApplicationDto appDto = new ApplicationDto(
                11L, 5L, "Seeker", "seeker@techmail.io", 8L, "new-post", "Staff Engineer",
                "Anthropic", null, "Remote", "$180k", null, null, "Pitch",
                "5-7 yrs", true, false, "2 Weeks", ApplicationStatus.APPLIED,
                Instant.now(), Instant.now()
        );
        when(applicationService.applyForJob(any(), eq("seeker@techmail.io"))).thenReturn(appDto);
        when(applicationService.withdrawApplication(11L, "seeker@techmail.io")).thenReturn(appDto);
        when(applicationService.respondToOffer("offer-vercel-lead", "accepted", "seeker@techmail.io"))
                .thenReturn(new OfferDecisionResponse("offer-vercel-lead", "accepted", null));

        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"jobId": 8, "resumeId": null, "coverLetter": "Pitch"}
                            """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(11));

        mockMvc.perform(patch("/api/applications/11/withdraw"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(patch("/api/applications/offers/offer-vercel-lead/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"decision": "accepted"}
                            """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("accepted"));
    }

    @Test
    void offerDecisionEndpoint_rejectsUnauthenticatedWith401() throws Exception {
        mockMvc.perform(patch("/api/applications/offers/offer-vercel-lead/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"decision": "accepted"}
                            """))
                .andExpect(status().isUnauthorized());
    }
}
