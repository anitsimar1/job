package com.jobconnect.service;

import com.jobconnect.dto.JobDto;
import com.jobconnect.dto.JobRequest;
import com.jobconnect.entity.Job;
import com.jobconnect.entity.JobStatus;
import com.jobconnect.entity.User;
import com.jobconnect.repository.JobRepository;
import com.jobconnect.repository.SavedJobRepository;
import com.jobconnect.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock private JobRepository jobRepository;
    @Mock private UserRepository userRepository;
    @Mock private SavedJobRepository savedJobRepository;
    @Spy private DtoMapper dtoMapper = new DtoMapper();

    @InjectMocks
    private JobService jobService;

    @Test
    void createJob_persistsOpenListingAndReturnsDto() {
        User admin = new User();
        admin.setId(1L);
        admin.setEmail("admin@jobconnect.io");

        JobRequest req = new JobRequest(
                "Principal Backend Architect",
                "Stripe",
                "Financial Infrastructure",
                "5000+",
                null,
                "San Francisco, CA",
                "Hybrid",
                "Architect distributed payment ledgers.",
                "8+ years distributed systems.",
                "$210k - $250k",
                210,
                250,
                "Full-time",
                "Principal",
                "8+ Years",
                "Backend",
                List.of("Java", "Spring Boot", "MySQL"),
                true,
                JobStatus.OPEN
        );

        when(userRepository.findByEmailIgnoreCase("admin@jobconnect.io")).thenReturn(Optional.of(admin));
        when(jobRepository.save(any(Job.class))).thenAnswer(inv -> {
            Job j = inv.getArgument(0);
            j.setId(101L);
            return j;
        });

        JobDto created = jobService.createJob(req, "admin@jobconnect.io");

        assertThat(created.id()).isEqualTo(101L);
        assertThat(created.title()).isEqualTo("Principal Backend Architect");
        assertThat(created.skills()).containsExactly("Java", "Spring Boot", "MySQL");
        assertThat(created.status()).isEqualTo(JobStatus.OPEN);
    }

    @Test
    @SuppressWarnings("unchecked")
    void searchJobs_executesSpecificationQueryWithPagination() {
        Job job = new Job();
        job.setId(5L);
        job.setTitle("Senior React Engineer");
        job.setCompany("Vercel");
        job.setLocation("Remote");
        job.setWorkplace("Remote");
        job.setEmploymentType("Full-time");
        job.setExperience("Senior Level");
        job.setSalary("$160k - $190k");
        job.setSkills("React,TypeScript");
        job.setDescription("Build developer cloud UI.");
        job.setRequirements("5+ years React.");
        job.setStatus(JobStatus.OPEN);

        PageRequest pageable = PageRequest.of(0, 10);
        when(jobRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(job), pageable, 1));

        Page<JobDto> page = jobService.searchJobs(
                "React", "Remote", "Senior", "Full-time", "Remote", "Frontend", 140, pageable
        );

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).company()).isEqualTo("Vercel");
        verify(jobRepository).findAll(any(Specification.class), any(Pageable.class));
    }
}
