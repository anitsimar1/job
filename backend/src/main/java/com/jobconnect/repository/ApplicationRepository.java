package com.jobconnect.repository;

import com.jobconnect.entity.Application;
import com.jobconnect.entity.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    boolean existsByUserIdAndJobId(Long userId, Long jobId);
    List<Application> findByUserIdOrderByAppliedAtDesc(Long userId);
    Page<Application> findAllByOrderByAppliedAtDesc(Pageable pageable);
    long countByStatus(ApplicationStatus status);
}
