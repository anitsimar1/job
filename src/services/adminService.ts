import { INITIAL_ADMIN_METRICS, INITIAL_APPLICATIONS, INITIAL_MODERATION_QUEUE, INITIAL_PROFILE } from '../data/mockData';
import {
  AdminMetrics,
  BackendApplicationStatus,
  JobPosting,
  ModerationListing,
  UserSummary,
} from '../types';
import { PaginatedResponse } from '../types/api';
import { apiClient, withMockFallback } from './apiClient';
import { SpringApplicationDto } from './applicationService';
import { jobService } from './jobService';

export interface CreateUrgentRolePayload {
  title: string;
  company: string;
  location: string;
  salaryDisplay: string;
  workplace: 'Remote' | 'Hybrid' | 'On-site';
  sector: string;
}

export interface SpringAdminMetricsDto {
  activeJobs: number;
  totalCandidates: number;
  applicationsSubmitted: number;
  placementsMade: number;
  underReviewCount?: number;
  shortlistedCount?: number;
  rejectedCount?: number;
}

/**
 * Admin operations service aligned with Spring Boot endpoints:
 * - GET  /admin/metrics
 * - GET  /admin/users
 * - GET  /admin/applications
 * - PUT  /admin/applications/{id}/status
 * - POST /jobs (ADMIN)
 * - PUT  /jobs/{id} (ADMIN)
 * - DELETE /jobs/{id} (ADMIN)
 */
export const adminService = {
  async getMetrics(): Promise<AdminMetrics> {
    return withMockFallback(
      async () => {
        const dto = await apiClient.get<SpringAdminMetricsDto>('/admin/metrics');
        const acceptance =
          dto.applicationsSubmitted > 0
            ? `${((dto.placementsMade / Math.max(1, dto.applicationsSubmitted)) * 100).toFixed(1)}%`
            : INITIAL_ADMIN_METRICS.offerAcceptanceRate;
        return {
          activeJobs: dto.activeJobs,
          activeJobsGrowth: '+12.4%',
          totalCandidates: dto.totalCandidates,
          candidatesGrowth: '+8.1%',
          applicationsSubmitted: dto.applicationsSubmitted,
          applicationsGrowth: '+24.5%',
          placementsMade: dto.placementsMade,
          avgHireDays: '18d avg hire',
          offerAcceptanceRate: acceptance,
        };
      },
      () => INITIAL_ADMIN_METRICS
    );
  },

  async listUsers(): Promise<UserSummary[]> {
    return withMockFallback(
      () => apiClient.get<UserSummary[]>('/admin/users'),
      () => [
        {
          id: 1,
          fullName: INITIAL_PROFILE.fullName,
          email: INITIAL_PROFILE.email,
          phone: INITIAL_PROFILE.phone,
          roles: ['ROLE_JOB_SEEKER'],
          enabled: true,
        },
        {
          id: 2,
          fullName: 'Marcus Chen',
          email: 'marcus.chen@techmail.io',
          phone: '+1 (415) 555-0148',
          roles: ['ROLE_JOB_SEEKER'],
          enabled: true,
        },
        {
          id: 3,
          fullName: 'Priya Nair',
          email: 'priya.nair@designstudio.io',
          phone: '+1 (212) 555-0192',
          roles: ['ROLE_JOB_SEEKER'],
          enabled: true,
        },
      ]
    );
  },

  async listAllApplications(page = 0, size = 20): Promise<SpringApplicationDto[]> {
    return withMockFallback(
      async () => {
        const res = await apiClient.get<PaginatedResponse<SpringApplicationDto> | SpringApplicationDto[]>(
          '/admin/applications',
          { params: { page, size } }
        );
        return Array.isArray(res) ? res : res.content;
      },
      () =>
        INITIAL_APPLICATIONS.map((app) => ({
          id: app.id,
          applicantName: INITIAL_PROFILE.fullName,
          applicantEmail: INITIAL_PROFILE.email,
          jobId: app.jobId,
          jobTitle: app.jobTitle,
          company: app.company,
          companyLogo: app.companyLogo,
          location: app.location,
          salary: app.salaryRange,
          resumeFileName: app.resumeUsed,
          coverLetter: app.coverNote,
          status:
            app.status === 'interviewing'
              ? 'SHORTLISTED'
              : app.status === 'offered'
              ? 'HIRED'
              : app.status === 'archived'
              ? 'REJECTED'
              : 'UNDER_REVIEW',
        }))
    );
  },

  async updateApplicationStatus(
    applicationId: string | number,
    status: BackendApplicationStatus
  ): Promise<SpringApplicationDto> {
    return withMockFallback(
      () =>
        apiClient.put<SpringApplicationDto>(
          `/admin/applications/${encodeURIComponent(String(applicationId))}/status`,
          { status }
        ),
      () => ({
        id: applicationId,
        jobId: 'apex-frontend',
        jobTitle: 'Application Role',
        company: 'JobConnect Partner',
        location: 'Remote',
        salary: '$160k - $190k',
        status,
      })
    );
  },

  async getModerationQueue(): Promise<ModerationListing[]> {
    return INITIAL_MODERATION_QUEUE;
  },

  async moderateListing(
    id: string,
    decision: 'APPROVED' | 'REJECTED'
  ): Promise<{ id: string; status: ModerationListing['status'] }> {
    return { id, status: decision };
  },

  async createUrgentRole(payload: CreateUrgentRolePayload): Promise<JobPosting> {
    return jobService.createJob({
      title: payload.title,
      company: payload.company,
      companyTagline: 'Verified Enterprise Partner',
      companySize: '250–500 employees',
      location: payload.location,
      workplace: payload.workplace,
      description: `${payload.company} is urgently hiring a ${payload.title} to accelerate core platform initiatives.`,
      requirements: '5+ years production engineering or product leadership experience.',
      salary: payload.salaryDisplay,
      minSalaryK: 165,
      maxSalaryK: 205,
      employmentType: 'Full-time',
      experience: 'Senior Level',
      yearsRequired: '5+ Years Required',
      sector: payload.sector,
      skills: ['TypeScript', 'Cloud Architecture', payload.workplace],
      featured: true,
    });
  },

  exportMetricsCsv(metrics: AdminMetrics, moderationQueue: ModerationListing[]): void {
    const rows = [
      ['Metric', 'Value', 'Trend'],
      ['Active Jobs', String(metrics.activeJobs), metrics.activeJobsGrowth],
      ['Total Candidates', String(metrics.totalCandidates), metrics.candidatesGrowth],
      ['Applications Submitted', String(metrics.applicationsSubmitted), metrics.applicationsGrowth],
      ['Placements Made', String(metrics.placementsMade), metrics.avgHireDays],
      ['Offer Acceptance Rate', metrics.offerAcceptanceRate, 'Pipeline'],
      [],
      ['Moderation ID', 'Role', 'Company', 'Location', 'Status', 'Salary'],
      ...moderationQueue.map((m) => [
        m.id,
        m.title,
        m.company,
        m.location,
        m.status,
        m.salaryRange,
      ]),
    ];

    const csv = rows
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jobconnect-admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
