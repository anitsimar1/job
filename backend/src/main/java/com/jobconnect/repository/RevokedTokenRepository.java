package com.jobconnect.repository;

import com.jobconnect.entity.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, Long> {
    boolean existsByTokenJti(String tokenJti);
    void deleteByExpiresAtBefore(Instant cutoff);
}
