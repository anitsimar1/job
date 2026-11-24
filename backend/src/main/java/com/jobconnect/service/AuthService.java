package com.jobconnect.service;

import com.jobconnect.dto.AuthResponse;
import com.jobconnect.dto.LoginRequest;
import com.jobconnect.dto.RegisterRequest;
import com.jobconnect.dto.UserSummaryDto;
import com.jobconnect.entity.AuthProvider;
import com.jobconnect.entity.RevokedToken;
import com.jobconnect.entity.Role;
import com.jobconnect.entity.RoleName;
import com.jobconnect.entity.User;
import com.jobconnect.exception.BadRequestException;
import com.jobconnect.exception.DuplicateResourceException;
import com.jobconnect.exception.ResourceNotFoundException;
import com.jobconnect.repository.RevokedTokenRepository;
import com.jobconnect.repository.RoleRepository;
import com.jobconnect.repository.UserRepository;
import com.jobconnect.security.JwtProperties;
import com.jobconnect.security.JwtTokenProvider;
import org.springframework.http.ResponseCookie;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RevokedTokenRepository revokedTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final DtoMapper dtoMapper;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            RevokedTokenRepository revokedTokenRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenProvider jwtTokenProvider,
            JwtProperties jwtProperties,
            DtoMapper dtoMapper
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.revokedTokenRepository = revokedTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.jwtProperties = jwtProperties;
        this.dtoMapper = dtoMapper;
    }

    public record AuthResult(AuthResponse response, ResponseCookie cookie) {}

    @Transactional
    public AuthResult register(RegisterRequest request) {
        if (!isStrongPassword(request.password())) {
            throw new BadRequestException(
                    "Password must be at least 8 characters and include letters, digits, and a special character"
            );
        }
        if (!request.password().equals(request.confirmPassword())) {
            throw new BadRequestException("Password and confirm password do not match");
        }

        String normalizedEmail = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateResourceException("An account with email " + normalizedEmail + " already exists");
        }

        RoleName requestedRoleName = resolveRegistrationRole(request.accountType());
        if (requestedRoleName == RoleName.ROLE_EMPLOYER && !StringUtils.hasText(request.companyName())) {
            throw new BadRequestException("Company or organization name is required for job poster accounts");
        }

        // Public registration strictly assigns ROLE_JOB_SEEKER or ROLE_EMPLOYER; ADMIN cannot be self-assigned.
        Role assignedRole = roleRepository.findByName(requestedRoleName)
                .orElseGet(() -> roleRepository.save(new Role(requestedRoleName)));

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setPhone(request.phone().trim());
        if (StringUtils.hasText(request.companyName())) {
            user.setCompanyName(request.companyName().trim());
        }
        if (StringUtils.hasText(request.targetRoles())) {
            user.setTargetRoles(request.targetRoles().trim());
        }
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setEmailVerified(false);
        user.setEnabled(true);
        user.setRoles(new HashSet<>(Set.of(assignedRole)));

        User saved = userRepository.save(user);
        String token = jwtTokenProvider.generateToken(saved);
        boolean remember = request.rememberMe() == null || request.rememberMe();
        ResponseCookie cookie = buildAuthCookie(token, remember);
        AuthResponse response = new AuthResponse(
                dtoMapper.toUserSummary(saved),
                requestedRoleName.name(),
                jwtProperties.getExpirationMs(),
                token
        );
        return new AuthResult(response, cookie);
    }

    private static RoleName resolveRegistrationRole(String accountType) {
        if (!StringUtils.hasText(accountType)) {
            return RoleName.ROLE_JOB_SEEKER;
        }
        String normalized = accountType.trim().toUpperCase();
        if ("EMPLOYER".equals(normalized)
                || "ROLE_EMPLOYER".equals(normalized)
                || "JOB_POSTER".equals(normalized)
                || "POSTER".equals(normalized)) {
            return RoleName.ROLE_EMPLOYER;
        }
        return RoleName.ROLE_JOB_SEEKER;
    }

    private static boolean isStrongPassword(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        boolean hasLetter = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;
        for (int i = 0; i < password.length(); i++) {
            char ch = password.charAt(i);
            if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')) {
                hasLetter = true;
            } else if (ch >= '0' && ch <= '9') {
                hasDigit = true;
            } else if (!Character.isWhitespace(ch)) {
                hasSpecial = true;
            }
        }
        return hasLetter && hasDigit && hasSpecial;
    }

    @Transactional(readOnly = true)
    public AuthResult login(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
            if (!StringUtils.hasText(existing.getPassword())) {
                throw new BadRequestException(
                        "This account uses Google Sign-In. Please click 'Continue with Google'."
                );
            }
        });

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizedEmail, request.password())
        );

        User user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));

        validateRequestedLoginRole(user, request.loginAs());

        String token = jwtTokenProvider.generateToken(user);
        boolean remember = request.rememberMe() == null || request.rememberMe();
        ResponseCookie cookie = buildAuthCookie(token, remember);

        String primaryRole = resolvePrimaryRole(user);

        AuthResponse response = new AuthResponse(
                dtoMapper.toUserSummary(user),
                primaryRole,
                jwtProperties.getExpirationMs(),
                token
        );
        return new AuthResult(response, cookie);
    }

    private void validateRequestedLoginRole(User user, String loginAs) {
        if (!StringUtils.hasText(loginAs)) {
            return;
        }
        String requested = loginAs.trim().toUpperCase();
        boolean hasAdmin = user.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ROLE_ADMIN);
        boolean hasEmployer = user.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ROLE_EMPLOYER);
        boolean hasSeeker = user.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ROLE_JOB_SEEKER);

        if ("EMPLOYER".equals(requested)
                || "ROLE_EMPLOYER".equals(requested)
                || "JOB_POSTER".equals(requested)
                || "POSTER".equals(requested)
                || "ADMIN".equals(requested)
                || "ROLE_ADMIN".equals(requested)) {
            if (!hasEmployer && !hasAdmin) {
                throw new BadRequestException(
                        "This account is registered as a Candidate. Please select 'Candidate' to sign in."
                );
            }
            return;
        }

        if ("JOB_SEEKER".equals(requested)
                || "ROLE_JOB_SEEKER".equals(requested)
                || "CANDIDATE".equals(requested)) {
            if (!hasSeeker && hasEmployer && !hasAdmin) {
                throw new BadRequestException(
                        "This account is registered as Admin (Job Poster). Please select 'Admin' to sign in."
                );
            }
        }
    }

    @Transactional
    public AuthResult processGoogleOAuthLogin(
            String googleSub,
            String email,
            boolean emailVerified,
            String fullName,
            String picture
    ) {
        if (!StringUtils.hasText(googleSub)) {
            throw new BadRequestException("Google account subject identifier is missing.");
        }
        if (!StringUtils.hasText(email)) {
            throw new BadRequestException("Google account email address is missing.");
        }
        if (!emailVerified) {
            throw new BadRequestException("Your Google email address must be verified before signing in.");
        }

        String normalizedSub = googleSub.trim();
        String normalizedEmail = email.trim().toLowerCase();
        int atIdx = normalizedEmail.indexOf('@');
        String fallbackName = atIdx > 0 ? normalizedEmail.substring(0, atIdx) : normalizedEmail;
        String rawName = StringUtils.hasText(fullName) ? fullName.trim() : fallbackName;
        String displayName = rawName.length() > 150 ? rawName.substring(0, 150) : rawName;
        String safePicture = (StringUtils.hasText(picture) && picture.trim().length() <= 512)
                ? picture.trim()
                : null;

        User user = userRepository.findByGoogleSub(normalizedSub).orElse(null);

        if (user == null) {
            User existingByEmail = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
            if (existingByEmail != null) {
                if (!existingByEmail.isEnabled()) {
                    throw new BadRequestException("This JobConnect account has been disabled.");
                }
                if (StringUtils.hasText(existingByEmail.getGoogleSub())
                        && !existingByEmail.getGoogleSub().equals(normalizedSub)) {
                    throw new BadRequestException(
                            "This email is already linked to a different Google account."
                    );
                }
                // Securely link Google identity to existing verified email account without elevating roles.
                existingByEmail.setGoogleSub(normalizedSub);
                existingByEmail.setEmailVerified(true);
                if (!StringUtils.hasText(existingByEmail.getProfileImage()) && safePicture != null) {
                    existingByEmail.setProfileImage(safePicture);
                }
                user = userRepository.save(existingByEmail);
            } else {
                // OAuth registration strictly assigns ROLE_JOB_SEEKER; ADMIN cannot be self-assigned.
                Role seekerRole = roleRepository.findByName(RoleName.ROLE_JOB_SEEKER)
                        .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_JOB_SEEKER)));

                User newUser = new User();
                newUser.setFullName(displayName);
                newUser.setEmail(normalizedEmail);
                newUser.setPassword(null);
                newUser.setAuthProvider(AuthProvider.GOOGLE);
                newUser.setGoogleSub(normalizedSub);
                newUser.setEmailVerified(true);
                if (safePicture != null) {
                    newUser.setProfileImage(safePicture);
                }
                newUser.setEnabled(true);
                newUser.setRoles(new HashSet<>(Set.of(seekerRole)));
                user = userRepository.save(newUser);
            }
        } else {
            if (!user.isEnabled()) {
                throw new BadRequestException("This JobConnect account has been disabled.");
            }
            boolean changed = false;
            if (!user.isEmailVerified()) {
                user.setEmailVerified(true);
                changed = true;
            }
            if (!StringUtils.hasText(user.getProfileImage()) && safePicture != null) {
                user.setProfileImage(safePicture);
                changed = true;
            }
            if (changed) {
                user = userRepository.save(user);
            }
        }

        String token = jwtTokenProvider.generateToken(user);
        ResponseCookie cookie = buildAuthCookie(token, true);
        AuthResponse response = new AuthResponse(
                dtoMapper.toUserSummary(user),
                resolvePrimaryRole(user),
                jwtProperties.getExpirationMs(),
                token
        );
        return new AuthResult(response, cookie);
    }

    @Transactional
    public ResponseCookie logout(String token) {
        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            String jti = jwtTokenProvider.getJtiFromToken(token);
            Instant exp = jwtTokenProvider.getExpirationFromToken(token);
            if (jti != null && !revokedTokenRepository.existsByTokenJti(jti)) {
                revokedTokenRepository.save(new RevokedToken(jti, exp));
            }
        }
        return buildLogoutCookie();
    }

    @Transactional(readOnly = true)
    public UserSummaryDto getCurrentUser(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return dtoMapper.toUserSummary(user);
    }

    public ResponseCookie buildAuthCookie(String token, boolean rememberMe) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(jwtProperties.getCookieName(), token)
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .path("/")
                .sameSite(jwtProperties.getCookieSameSite());

        if (rememberMe) {
            builder.maxAge(jwtProperties.getExpirationMs() / 1000);
        }
        return builder.build();
    }

    public ResponseCookie buildLogoutCookie() {
        return ResponseCookie.from(jwtProperties.getCookieName(), "")
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .path("/")
                .sameSite(jwtProperties.getCookieSameSite())
                .maxAge(0)
                .build();
    }

    private String resolvePrimaryRole(User user) {
        boolean isAdmin = user.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ROLE_ADMIN);
        if (isAdmin) {
            return RoleName.ROLE_ADMIN.name();
        }
        boolean isEmployer = user.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ROLE_EMPLOYER);
        if (isEmployer) {
            return RoleName.ROLE_EMPLOYER.name();
        }
        return RoleName.ROLE_JOB_SEEKER.name();
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void purgeExpiredRevokedTokens() {
        revokedTokenRepository.deleteByExpiresAtBefore(Instant.now());
    }
}
