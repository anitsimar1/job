package com.jobconnect.security;

import com.jobconnect.entity.Role;
import com.jobconnect.entity.RoleName;
import com.jobconnect.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private JwtProperties jwtProperties;

    @BeforeEach
    void setUp() {
        jwtProperties = new JwtProperties();
        jwtProperties.setSecret("dGhpcy1pcy1hLXZlcnktc2VjdXJlLXRlc3Qtand0LXNlY3JldC1rZXktMzItYnl0ZXM=");
        jwtProperties.setExpirationMs(3600_000L);
        jwtTokenProvider = new JwtTokenProvider(jwtProperties);
    }

    @Test
    void generateAndValidateToken_succeedsForValidUser() {
        User user = new User();
        user.setId(42L);
        user.setEmail("elena@techmail.io");
        user.setFullName("Elena Rostova");
        user.setRoles(Set.of(new Role(RoleName.ROLE_JOB_SEEKER)));

        String token = jwtTokenProvider.generateToken(user);

        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getEmailFromToken(token)).isEqualTo("elena@techmail.io");
        assertThat(jwtTokenProvider.getJtiFromToken(token)).isNotBlank();
    }

    @Test
    void validateToken_rejectsTamperedToken() {
        User user = new User();
        user.setId(42L);
        user.setEmail("elena@techmail.io");
        user.setFullName("Elena Rostova");
        user.setRoles(Set.of(new Role(RoleName.ROLE_JOB_SEEKER)));

        String token = jwtTokenProvider.generateToken(user);
        String tampered = token.substring(0, token.length() - 4) + "abcd";

        assertThat(jwtTokenProvider.validateToken(tampered)).isFalse();
    }

    @Test
    void validateToken_rejectsExpiredToken() {
        jwtProperties.setExpirationMs(-10_000L);
        JwtTokenProvider expiredProvider = new JwtTokenProvider(jwtProperties);

        User user = new User();
        user.setId(1L);
        user.setEmail("expired@techmail.io");
        user.setFullName("Expired User");
        user.setRoles(Set.of(new Role(RoleName.ROLE_JOB_SEEKER)));

        String expiredToken = expiredProvider.generateToken(user);

        assertThat(jwtTokenProvider.validateToken(expiredToken)).isFalse();
    }
}
