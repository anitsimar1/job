package com.jobconnect.service;

import com.jobconnect.dto.JobDto;
import com.jobconnect.dto.JobRequest;
import com.jobconnect.entity.Job;
import com.jobconnect.entity.JobStatus;
import com.jobconnect.entity.SavedJob;
import com.jobconnect.entity.User;
import com.jobconnect.exception.BadRequestException;
import com.jobconnect.exception.ResourceNotFoundException;
import com.jobconnect.repository.ApplicationRepository;
import com.jobconnect.repository.JobRepository;
import com.jobconnect.repository.SavedJobRepository;
import com.jobconnect.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class JobService {

    private static final List<JobStatus> PUBLIC_VISIBLE_STATUSES = List.of(JobStatus.OPEN, JobStatus.CLOSED);

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final SavedJobRepository savedJobRepository;
    private final ApplicationRepository applicationRepository;
    private final DtoMapper dtoMapper;

    public JobService(
            JobRepository jobRepository,
            UserRepository userRepository,
            SavedJobRepository savedJobRepository,
            ApplicationRepository applicationRepository,
            DtoMapper dtoMapper
    ) {
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.savedJobRepository = savedJobRepository;
        this.applicationRepository = applicationRepository;
        this.dtoMapper = dtoMapper;
    }

    @Transactional(readOnly = true)
    public Page<JobDto> getJobs(Pageable pageable) {
        return getJobs(null, pageable);
    }

    @Transactional(readOnly = true)
    public Page<JobDto> getJobs(String statusFilter, Pageable pageable) {
        JobStatus requestedStatus = parsePublicStatusFilter(statusFilter);
        return jobRepository.findAll(
                (root, query, cb) -> requestedStatus != null
                        ? cb.equal(root.get("status"), requestedStatus)
                        : root.get("status").in(PUBLIC_VISIBLE_STATUSES),
                pageable
        ).map(this::toLiveJobDto);
    }

    @Transactional(readOnly = true)
    public JobDto getJobById(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
        return toLiveJobDto(job);
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
        return searchJobs(queryText, location, experience, employmentType, workplace, sector, minSalaryK, null, pageable);
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
            String statusFilter,
            Pageable pageable
    ) {
        JobStatus requestedStatus = parsePublicStatusFilter(statusFilter);
        Specification<Job> spec = (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (requestedStatus != null) {
                predicates.add(cb.equal(root.get("status"), requestedStatus));
            } else {
                predicates.add(root.get("status").in(PUBLIC_VISIBLE_STATUSES));
            }

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

        return jobRepository.findAll(spec, pageable).map(this::toLiveJobDto);
    }

    @Transactional(readOnly = true)
    public List<JobDto> getJobsByPoster(String posterEmail) {
        User poster = userRepository.findByEmailIgnoreCase(posterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return jobRepository.findByCreatedByIdOrderByCreatedAtDesc(poster.getId())
                .stream()
                .map(this::toLiveJobDto)
                .toList();
    }

    @Transactional
    public JobDto createJob(JobRequest request, String posterEmail) {
        User poster = userRepository.findByEmailIgnoreCase(posterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Job job = new Job();
        job.setSlug(generateSlug(request.title(), request.company()));
        applyRequest(job, request);
        if (!StringUtils.hasText(job.getCompany()) && StringUtils.hasText(poster.getCompanyName())) {
            job.setCompany(poster.getCompanyName().trim());
        }
        job.setCreatedBy(poster);
        job.setApplicantsCount(0);
        JobStatus requestedStatus = request.status();
        if (requestedStatus == JobStatus.CLOSED || requestedStatus == JobStatus.PAUSED) {
            job.setStatus(requestedStatus);
        } else {
            job.setStatus(JobStatus.OPEN);
        }

        return dtoMapper.toJobDto(jobRepository.save(job));
    }

    @Transactional
    public JobDto updateJob(Long id, JobRequest request) {
        return updateJob(id, request, null, true);
    }

    @Transactional
    public JobDto updateJob(Long id, JobRequest request, String requesterEmail, boolean isAdmin) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
        verifyOwnership(job, requesterEmail, isAdmin);

        applyRequest(job, request);
        if (request.status() != null) {
            if (!isAdmin && request.status() != JobStatus.OPEN && request.status() != JobStatus.CLOSED && request.status() != JobStatus.PAUSED) {
                throw new BadRequestException("Job status must be OPEN, PAUSED, or CLOSED");
            }
            job.setStatus(request.status());
        }
        return toLiveJobDto(jobRepository.save(job));
    }

    @Transactional
    public JobDto updateJobStatus(Long id, JobStatus newStatus, String requesterEmail, boolean isAdmin) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
        verifyOwnership(job, requesterEmail, isAdmin);

        if (!isAdmin && newStatus != JobStatus.OPEN && newStatus != JobStatus.CLOSED && newStatus != JobStatus.PAUSED) {
            throw new BadRequestException("Job posters may only set status to OPEN, CLOSED, or PAUSED");
        }
        job.setStatus(newStatus);
        return toLiveJobDto(jobRepository.save(job));
    }

    @Transactional
    public void deleteJob(Long id) {
        deleteJob(id, null, true);
    }

    @Transactional
    public void deleteJob(Long id, String requesterEmail, boolean isAdmin) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
        verifyOwnership(job, requesterEmail, isAdmin);
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

    private void verifyOwnership(Job job, String requesterEmail, boolean isAdmin) {
        if (isAdmin) {
            return;
        }
        if (!StringUtils.hasText(requesterEmail)
                || job.getCreatedBy() == null
                || !job.getCreatedBy().getEmail().equalsIgnoreCase(requesterEmail)) {
            throw new AccessDeniedException("You are only permitted to manage jobs you posted");
        }
    }

    private JobStatus parsePublicStatusFilter(String statusFilter) {
        if (!StringUtils.hasText(statusFilter) || "ALL".equalsIgnoreCase(statusFilter.trim())) {
            return null;
        }
        String normalized = statusFilter.trim().toUpperCase();
        if ("OPEN".equals(normalized)) {
            return JobStatus.OPEN;
        }
        if ("CLOSED".equals(normalized)) {
            return JobStatus.CLOSED;
        }
        return null;
    }

    private JobDto toLiveJobDto(Job job) {
        if (applicationRepository != null && job.getId() != null) {
            long dbCount = applicationRepository.countByJobId(job.getId());
            int existingCount = job.getApplicantsCount() != null ? job.getApplicantsCount() : 0;
            if (dbCount > existingCount) {
                job.setApplicantsCount(Math.toIntExact(dbCount));
            }
        }
        return dtoMapper.toJobDto(job);
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
