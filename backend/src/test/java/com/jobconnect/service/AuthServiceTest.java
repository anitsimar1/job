package com.jobconnect.service;

import com.jobconnect.dto.LoginRequest;
import com.jobconnect.dto.RegisterRequest;
import com.jobconnect.entity.AuthProvider;
import com.jobconnect.entity.Role;
import com.jobconnect.entity.RoleName;
import com.jobconnect.entity.User;
import com.jobconnect.exception.BadRequestException;
import com.jobconnect.exception.DuplicateResourceException;
import com.jobconnect.repository.RevokedTokenRepository;
import com.jobconnect.repository.RoleRepository;
import com.jobconnect.repository.UserRepository;
import com.jobconnect.security.JwtProperties;
import com.jobconnect.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private RevokedTokenRepository revokedTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private JwtProperties jwtProperties;
    @Mock private DtoMapper dtoMapper;

    @InjectMocks
    private AuthService authService;

    private Role seekerRole;

    @BeforeEach
    void setUp() {
        seekerRole = new Role(RoleName.ROLE_JOB_SEEKER);
        seekerRole.setId(1L);
    }

    @Test
    void register_createsJobSeekerWithHashedPassword() {
        RegisterRequest req = new RegisterRequest(
                "Elena Rostova",
                "elena@techmail.io",
                "StrongPass123!",
                "StrongPass123!",
                "+1 555 234 8901"
        );

        when(userRepository.existsByEmailIgnoreCase("elena@techmail.io")).thenReturn(false);
        when(roleRepository.findByName(RoleName.ROLE_JOB_SEEKER)).thenReturn(Optional.of(seekerRole));
        when(passwordEncoder.encode("StrongPass123!")).thenReturn("$2a$12$hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(10L);
            return u;
        });
        when(jwtTokenProvider.generateToken(any(User.class))).thenReturn("jwt-token-value");
        when(jwtProperties.getCookieName()).thenReturn("jobconnect_jwt");
        when(jwtProperties.getCookieSameSite()).thenReturn("Lax");
        when(jwtProperties.getExpirationMs()).thenReturn(86400000L);

        AuthService.AuthResult result = authService.register(req);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();

        assertThat(saved.getPassword()).isEqualTo("$2a$12$hashed");
        assertThat(saved.getAuthProvider()).isEqualTo(AuthProvider.LOCAL);
        assertThat(saved.getRoles()).extracting(Role::getName).containsExactly(RoleName.ROLE_JOB_SEEKER);
        assertThat(result.response().role()).isEqualTo("ROLE_JOB_SEEKER");
        assertThat(result.cookie().getValue()).isEqualTo("jwt-token-value");
        assertThat(result.cookie().isHttpOnly()).isTrue();
    }

    @Test
    void register_rejectsDuplicateEmail() {
        RegisterRequest req = new RegisterRequest(
                "Elena Rostova",
                "elena@techmail.io",
                "StrongPass123!",
                "StrongPass123!",
                "+1 555 234 8901"
        );
        when(userRepository.existsByEmailIgnoreCase("elena@techmail.io")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already exists");
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_authenticatesValidCredentialsAndIssuesCookie() {
        User user = new User();
        user.setId(10L);
        user.setEmail("elena@techmail.io");
        user.setPassword("$2a$12$hashed");
        user.setFullName("Elena Rostova");
        user.setRoles(new HashSet<>(Set.of(seekerRole)));

        Authentication auth = new UsernamePasswordAuthenticationToken("elena@techmail.io", null);
        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(jwtTokenProvider.generateToken(user)).thenReturn("signed-jwt");
        when(jwtProperties.getCookieName()).thenReturn("jobconnect_jwt");
        when(jwtProperties.getCookieSameSite()).thenReturn("Lax");
        when(jwtProperties.getExpirationMs()).thenReturn(86400000L);

        AuthService.AuthResult result = authService.login(new LoginRequest("elena@techmail.io", "StrongPass123!", true));

        assertThat(result.response().role()).isEqualTo("ROLE_JOB_SEEKER");
        assertThat(result.cookie().getValue()).isEqualTo("signed-jwt");
        assertThat(result.cookie().isHttpOnly()).isTrue();
    }

    @Test
    void login_rejectsPasswordLoginForGoogleOnlyAccount() {
        User googleUser = new User();
        googleUser.setId(11L);
        googleUser.setEmail("oauth@techmail.io");
        googleUser.setPassword(null);
        googleUser.setAuthProvider(AuthProvider.GOOGLE);

        when(userRepository.findByEmailIgnoreCase("oauth@techmail.io")).thenReturn(Optional.of(googleUser));

        assertThatThrownBy(() ->
                authService.login(new LoginRequest("oauth@techmail.io", "SomePass123!", false)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Continue with Google");
    }

    @Test
    void login_rejectsInvalidCredentials() {
        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.empty());
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() ->
                authService.login(new LoginRequest("elena@techmail.io", "WrongPass!", false)))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void processGoogleOAuthLogin_createsNewJobSeekerAccount() {
        when(userRepository.findByGoogleSub("google-sub-123")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("alex@gmail.com")).thenReturn(Optional.empty());
        when(roleRepository.findByName(RoleName.ROLE_JOB_SEEKER)).thenReturn(Optional.of(seekerRole));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(22L);
            return u;
        });
        when(jwtTokenProvider.generateToken(any(User.class))).thenReturn("oauth-jwt");
        when(jwtProperties.getCookieName()).thenReturn("jobconnect_jwt");
        when(jwtProperties.getCookieSameSite()).thenReturn("Lax");
        when(jwtProperties.getExpirationMs()).thenReturn(86400000L);

        AuthService.AuthResult result = authService.processGoogleOAuthLogin(
                "google-sub-123",
                "Alex@gmail.com",
                true,
                "Alex Rivera",
                "https://lh3.googleusercontent.com/avatar.png"
        );

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();

        assertThat(saved.getGoogleSub()).isEqualTo("google-sub-123");
        assertThat(saved.getEmail()).isEqualTo("alex@gmail.com");
        assertThat(saved.getPassword()).isNull();
        assertThat(saved.getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(saved.isEmailVerified()).isTrue();
        assertThat(saved.getRoles()).extracting(Role::getName).containsExactly(RoleName.ROLE_JOB_SEEKER);
        assertThat(result.cookie().getValue()).isEqualTo("oauth-jwt");
        assertThat(result.cookie().isHttpOnly()).isTrue();
    }

    @Test
    void processGoogleOAuthLogin_linksExistingVerifiedEmailAccount() {
        User existing = new User();
        existing.setId(5L);
        existing.setEmail("elena@techmail.io");
        existing.setFullName("Elena Rostova");
        existing.setPassword("$2a$12$hashed");
        existing.setAuthProvider(AuthProvider.LOCAL);
        existing.setEnabled(true);
        existing.setRoles(new HashSet<>(Set.of(seekerRole)));

        when(userRepository.findByGoogleSub("google-sub-999")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(existing)).thenReturn("linked-jwt");
        when(jwtProperties.getCookieName()).thenReturn("jobconnect_jwt");
        when(jwtProperties.getCookieSameSite()).thenReturn("Lax");
        when(jwtProperties.getExpirationMs()).thenReturn(86400000L);

        AuthService.AuthResult result = authService.processGoogleOAuthLogin(
                "google-sub-999",
                "elena@techmail.io",
                true,
                "Elena Rostova",
                "https://lh3.googleusercontent.com/elena.png"
        );

        assertThat(existing.getGoogleSub()).isEqualTo("google-sub-999");
        assertThat(existing.isEmailVerified()).isTrue();
        assertThat(existing.getRoles()).extracting(Role::getName).containsExactly(RoleName.ROLE_JOB_SEEKER);
        assertThat(result.cookie().getValue()).isEqualTo("linked-jwt");
    }

    @Test
    void processGoogleOAuthLogin_rejectsUnverifiedEmail() {
        assertThatThrownBy(() -> authService.processGoogleOAuthLogin(
                "sub-1", "unverified@gmail.com", false, "User", null
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("verified");
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_rejectsMismatchedPasswords() {
        RegisterRequest req = new RegisterRequest(
                "Elena Rostova",
                "elena@techmail.io",
                "StrongPass123!",
                "DifferentPass123!",
                "+1 555 234 8901"
        );

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("do not match");
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_normalizesMixedCaseEmailAndCreatesDefaultRoleWhenAbsent() {
        RegisterRequest req = new RegisterRequest(
                "  Elena Rostova  ",
                "  ELENA.Rostova@TechMail.IO  ",
                "StrongPass123!",
                "StrongPass123!",
                "  +1 555 234 8901  "
        );

        when(userRepository.existsByEmailIgnoreCase("elena.rostova@techmail.io")).thenReturn(false);
        when(roleRepository.findByName(RoleName.ROLE_JOB_SEEKER)).thenReturn(Optional.empty());
        when(roleRepository.save(any(Role.class))).thenReturn(seekerRole);
        when(passwordEncoder.encode("StrongPass123!")).thenReturn("$2a$12$encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(42L);
            return u;
        });
        when(jwtTokenProvider.generateToken(any(User.class))).thenReturn("jwt-normalized");
        when(jwtProperties.getCookieName()).thenReturn("jobconnect_jwt");
        when(jwtProperties.getCookieSameSite()).thenReturn("Lax");
        when(jwtProperties.getExpirationMs()).thenReturn(86400000L);

        AuthService.AuthResult result = authService.register(req);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();

        assertThat(saved.getFullName()).isEqualTo("Elena Rostova");
        assertThat(saved.getEmail()).isEqualTo("elena.rostova@techmail.io");
        assertThat(saved.getPhone()).isEqualTo("+1 555 234 8901");
        assertThat(saved.getPassword()).isEqualTo("$2a$12$encoded");
        assertThat(saved.isEnabled()).isTrue();
        assertThat(result.cookie().getValue()).isEqualTo("jwt-normalized");
        assertThat(result.cookie().isHttpOnly()).isTrue();
    }

    @Test
    void processGoogleOAuthLogin_rejectsConflictingGoogleSubForExistingEmail() {
        User existing = new User();
        existing.setId(7L);
        existing.setEmail("elena@techmail.io");
        existing.setGoogleSub("existing-sub-111");
        existing.setEnabled(true);

        when(userRepository.findByGoogleSub("different-sub-222")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> authService.processGoogleOAuthLogin(
                "different-sub-222", "elena@techmail.io", true, "Elena", null
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("different Google account");
        verify(userRepository, never()).save(any());
    }

    @Test
    void processGoogleOAuthLogin_truncatesOversizedDisplayName() {
        String longName = "A".repeat(200);
        when(userRepository.findByGoogleSub("sub-long")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("long@gmail.com")).thenReturn(Optional.empty());
        when(roleRepository.findByName(RoleName.ROLE_JOB_SEEKER)).thenReturn(Optional.of(seekerRole));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(30L);
            return u;
        });
        when(jwtTokenProvider.generateToken(any(User.class))).thenReturn("oauth-jwt");
        when(jwtProperties.getCookieName()).thenReturn("jobconnect_jwt");
        when(jwtProperties.getCookieSameSite()).thenReturn("Lax");
        when(jwtProperties.getExpirationMs()).thenReturn(86400000L);

        authService.processGoogleOAuthLogin("sub-long", "long@gmail.com", true, longName, null);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getFullName()).hasSize(150);
    }
}
