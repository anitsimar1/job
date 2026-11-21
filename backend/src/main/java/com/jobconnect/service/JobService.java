package com.jobconnect.service;

import com.jobconnect.dto.JobDto;
import com.jobconnect.dto.JobRequest;
import com.jobconnect.entity.Job;
import com.jobconnect.entity.JobStatus;
import com.jobconnect.entity.SavedJob;
import com.jobconnect.entity.User;
import com.jobconnect.exception.ResourceNotFoundException;
import com.jobconnect.repository.JobRepository;
import com.jobconnect.repository.SavedJobRepository;
import com.jobconnect.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final SavedJobRepository savedJobRepository;
    private final DtoMapper dtoMapper;

    public JobService(
            JobRepository jobRepository,
            UserRepository userRepository,
            SavedJobRepository savedJobRepository,
            DtoMapper dtoMapper
    ) {
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.savedJobRepository = savedJobRepository;
        this.dtoMapper = dtoMapper;
    }

    @Transactional(readOnly = true)
    public Page<JobDto> getJobs(Pageable pageable) {
        return jobRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("status"), JobStatus.OPEN),
                pageable
        ).map(dtoMapper::toJobDto);
    }

    @Transactional(readOnly = true)
    public JobDto getJobById(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
        return dtoMapper.toJobDto(job);
    }

    @Transactional(readOnly = true)
    public Page<JobDto> searchJobs(
            String queryText,
            String location,
            String experience,
            String employmentType,
            String workplace,
            String sector,
            Integer minSalaryK,
            Pageable pageable
    ) {
        Specification<Job> spec = (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), JobStatus.OPEN));

            if (StringUtils.hasText(queryText)) {
                String pattern = "%" + queryText.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("company")), pattern),
                        cb.like(cb.lower(root.get("skills")), pattern)
                ));
            }
            if (StringUtils.hasText(location) && !"remote, worldwide".equalsIgnoreCase(location.trim())) {
                String locPattern = "%" + location.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("location")), locPattern),
                        cb.like(cb.lower(root.get("workplace")), locPattern)
                ));
            }
            if (StringUtils.hasText(experience) && !"All".equalsIgnoreCase(experience)) {
                predicates.add(cb.like(cb.lower(root.get("experience")),
                        "%" + experience.trim().toLowerCase() + "%"));
            }
            if (StringUtils.hasText(employmentType) && !"All".equalsIgnoreCase(employmentType)) {
                predicates.add(cb.equal(cb.lower(root.get("employmentType")),
                        employmentType.trim().toLowerCase()));
            }
            if (StringUtils.hasText(workplace) && !"All".equalsIgnoreCase(workplace)) {
                predicates.add(cb.equal(cb.lower(root.get("workplace")),
                        workplace.trim().toLowerCase()));
            }
            if (StringUtils.hasText(sector) && !"All".equalsIgnoreCase(sector)) {
                predicates.add(cb.equal(cb.lower(root.get("sector")),
                        sector.trim().toLowerCase()));
            }
            if (minSalaryK != null && minSalaryK > 0) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("maxSalaryK"), minSalaryK));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return jobRepository.findAll(spec, pageable).map(dtoMapper::toJobDto);
    }

    @Transactional
    public JobDto createJob(JobRequest request, String adminEmail) {
        User admin = userRepository.findByEmailIgnoreCase(adminEmail).orElse(null);

        Job job = new Job();
        job.setSlug(generateSlug(request.title(), request.company()));
        applyRequest(job, request);
        job.setCreatedBy(admin);
        job.setStatus(request.status() != null ? request.status() : JobStatus.OPEN);

        return dtoMapper.toJobDto(jobRepository.save(job));
    }

    @Transactional
    public JobDto updateJob(Long id, JobRequest request) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
        applyRequest(job, request);
        if (request.status() != null) {
            job.setStatus(request.status());
        }
        return dtoMapper.toJobDto(jobRepository.save(job));
    }

    @Transactional
    public void deleteJob(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
        jobRepository.delete(job);
    }

    @Transactional
    public void bookmarkJob(Long jobId, String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + jobId));
        if (savedJobRepository.findByUserIdAndJobId(user.getId(), jobId).isEmpty()) {
            SavedJob saved = new SavedJob();
            saved.setUser(user);
            saved.setJob(job);
            savedJobRepository.save(saved);
        }
    }

    @Transactional
    public void unbookmarkJob(Long jobId, String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        savedJobRepository.deleteByUserIdAndJobId(user.getId(), jobId);
    }

    private void applyRequest(Job job, JobRequest request) {
        job.setTitle(request.title().trim());
        job.setCompany(request.company().trim());
        job.setCompanyTagline(request.companyTagline());
        job.setCompanySize(request.companySize());
        job.setCompanyLogo(request.companyLogo());
        job.setLocation(request.location().trim());
        job.setWorkplace(StringUtils.hasText(request.workplace()) ? request.workplace().trim() : "Remote");
        job.setDescription(request.description().trim());
        job.setRequirements(request.requirements().trim());
        job.setSalary(request.salary().trim());
        job.setMinSalaryK(request.minSalaryK());
        job.setMaxSalaryK(request.maxSalaryK());
        job.setEmploymentType(request.employmentType().trim());
        job.setExperience(request.experience().trim());
        job.setYearsRequired(request.yearsRequired());
        job.setSector(request.sector());
        job.setSkills(request.skills() != null ? String.join(",", request.skills()) : "");
        job.setFeatured(Boolean.TRUE.equals(request.featured()));
    }

    private String generateSlug(String title, String company) {
        String raw = (company + "-" + title).toLowerCase().replaceAll("[^a-z0-9]+", "-");
        raw = raw.replaceAll("(^-|-$)", "");
        if (raw.length() > 90) raw = raw.substring(0, 90);
        return raw + "-" + UUID.randomUUID().toString().substring(0, 6);
    }
}
