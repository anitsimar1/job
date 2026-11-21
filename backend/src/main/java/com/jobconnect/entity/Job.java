package com.jobconnect.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(
    name = "jobs",
    indexes = {
        @Index(name = "idx_jobs_status", columnList = "status"),
        @Index(name = "idx_jobs_location", columnList = "location"),
        @Index(name = "idx_jobs_employment_type", columnList = "employment_type"),
        @Index(name = "idx_jobs_experience", columnList = "experience")
    }
)
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 120)
    private String slug;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 160)
    private String company;

    @Column(name = "company_tagline", length = 200)
    private String companyTagline;

    @Column(name = "company_size", length = 80)
    private String companySize;

    @Column(name = "company_logo", length = 512)
    private String companyLogo;

    @Column(nullable = false)
    private boolean verified = true;

    @Column(nullable = false, length = 160)
    private String location;

    @Column(nullable = false, length = 40)
    private String workplace = "Remote";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String requirements;

    @Column(nullable = false, length = 120)
    private String salary;

    @Column(name = "min_salary_k")
    private Integer minSalaryK;

    @Column(name = "max_salary_k")
    private Integer maxSalaryK;

    @Column(name = "employment_type", nullable = false, length = 60)
    private String employmentType;

    @Column(nullable = false, length = 80)
    private String experience;

    @Column(name = "years_required", length = 80)
    private String yearsRequired;

    @Column(length = 80)
    private String sector;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String skills;

    @Column(name = "match_score")
    private Integer matchScore = 92;

    @Column(name = "applicants_count", nullable = false)
    private Integer applicantsCount = 0;

    @Column(nullable = false)
    private boolean featured = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private JobStatus status = JobStatus.OPEN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getCompanyTagline() { return companyTagline; }
    public void setCompanyTagline(String companyTagline) { this.companyTagline = companyTagline; }

    public String getCompanySize() { return companySize; }
    public void setCompanySize(String companySize) { this.companySize = companySize; }

    public String getCompanyLogo() { return companyLogo; }
    public void setCompanyLogo(String companyLogo) { this.companyLogo = companyLogo; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getWorkplace() { return workplace; }
    public void setWorkplace(String workplace) { this.workplace = workplace; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRequirements() { return requirements; }
    public void setRequirements(String requirements) { this.requirements = requirements; }

    public String getSalary() { return salary; }
    public void setSalary(String salary) { this.salary = salary; }

    public Integer getMinSalaryK() { return minSalaryK; }
    public void setMinSalaryK(Integer minSalaryK) { this.minSalaryK = minSalaryK; }

    public Integer getMaxSalaryK() { return maxSalaryK; }
    public void setMaxSalaryK(Integer maxSalaryK) { this.maxSalaryK = maxSalaryK; }

    public String getEmploymentType() { return employmentType; }
    public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }

    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }

    public String getYearsRequired() { return yearsRequired; }
    public void setYearsRequired(String yearsRequired) { this.yearsRequired = yearsRequired; }

    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }

    public String getSkills() { return skills; }
    public void setSkills(String skills) { this.skills = skills; }

    public Integer getMatchScore() { return matchScore; }
    public void setMatchScore(Integer matchScore) { this.matchScore = matchScore; }

    public Integer getApplicantsCount() { return applicantsCount; }
    public void setApplicantsCount(Integer applicantsCount) { this.applicantsCount = applicantsCount; }

    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }

    public JobStatus getStatus() { return status; }
    public void setStatus(JobStatus status) { this.status = status; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
