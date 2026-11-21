package com.jobconnect.repository;

import com.jobconnect.entity.Job;
import com.jobconnect.entity.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, Long>, JpaSpecificationExecutor<Job> {
    Optional<Job> findBySlug(String slug);
    long countByStatus(JobStatus status);
}
