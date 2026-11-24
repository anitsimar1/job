import { INITIAL_APPLICATIONS } from '../data/mockData';
import {
  ApplicationStatus,
  ApplyFormData,
  BackendApplicationStatus,
  JobApplication,
  JobPosting,
} from '../types';
import { ApiError } from '../types/api';
import { apiClient, withMockFallback } from './apiClient';

export interface SpringApplicationDto {
  id: number | string;
  userId?: number | string;
  applicantName?: string;
  applicantEmail?: string;
  jobId: number | string;
  jobSlug?: string;
  jobTitle: string;
  company: string;
  companyLogo?: string;
  location: string;
  salary: string;
  resumeId?: number | string | null;
  resumeFileName?: string | null;
  coverLetter?: string;
  experienceYears?: string;
  workAuthorized?: boolean;
  requiresSponsorship?: boolean;
  noticePeriod?: string;
  status: BackendApplicationStatus;
  appliedAt?: string;
}

function mapStatusToUi(status: BackendApplicationStatus): {
  uiStatus: ApplicationStatus;
  badge: string;
  stageNumber: number;
} {
  switch (status) {
    case 'UNDER_REVIEW':
      return { uiStatus: 'in-review', badge: 'UNDER_REVIEW', stageNumber: 2 };
    case 'SHORTLISTED':
      return { uiStatus: 'interviewing', badge: 'SHORTLISTED', stageNumber: 3 };
    case 'HIRED':
      return { uiStatus: 'offered', badge: 'HIRED', stageNumber: 4 };
    case 'REJECTED':
      return { uiStatus: 'archived', badge: 'REJECTED', stageNumber: 2 };
    case 'APPLIED':
    default:
      return { uiStatus: 'in-review', badge: 'APPLIED', stageNumber: 1 };
  }
}

export function mapSpringApplication(dto: SpringApplicationDto): JobApplication {
  const mapped = mapStatusToUi(dto.status);
  return {
    id: String(dto.id),
    jobId: String(dto.jobId),
    jobTitle: dto.jobTitle,
    company: dto.company,
    companyLogo:
      dto.companyLogo ||
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwHk67W2LTJaO9pS07TeLRCOGTFuvWx6a_iH2TtH_7twIlIcoXNffq20X5sNqzZUQ1FGlqONQS8q5LHsSw7D4qRp3cLEKbFWkXUHUlo7vU5x6aEWwzXO04CJmpPDqoRLECfBng_LmnsFfBqjH5ECeOUre-oa62XbX3fn_JrWgUw4lvW75KwL1u54dZDHwqdDU91DbJHOBCK0YCKZGxPqUbLiQEyzfiScaFzOoimQM',
    location: dto.location,
    salaryRange: dto.salary,
    status: mapped.uiStatus,
    stageBadge: mapped.badge,
    stageNumber: mapped.stageNumber,
    totalStages: 4,
    stageSteps: ['Applied', 'Review', 'Shortlisted', 'Hired'],
    appliedAgo: dto.appliedAt ? new Date(dto.appliedAt).toLocaleDateString() : 'Just now',
    activityNote: dto.resumeFileName ? `Submitted with ${dto.resumeFileName}` : undefined,
    resumeUsed: dto.resumeFileName || 'Uploaded Resume',
    coverNote: dto.coverLetter,
  };
}

/**
 * Job Applications service aligned with Spring Boot endpoints:
 * - POST  /applications
 * - GET   /applications/my
 * - GET   /applications/{id}
 */
export const applicationService = {
  async listApplications(): Promise<JobApplication[]> {
    return withMockFallback(
      async () => {
        const res = await apiClient.get<SpringApplicationDto[]>('/applications/my');
        return res.map(mapSpringApplication);
      },
      () => INITIAL_APPLICATIONS
    );
  },

  async getApplicationById(id: string): Promise<JobApplication | undefined> {
    return withMockFallback(
      async () => mapSpringApplication(await apiClient.get<SpringApplicationDto>(`/applications/${encodeURIComponent(id)}`)),
      () => INITIAL_APPLICATIONS.find((a) => a.id === id)
    );
  },

  async submitApplication(
    job: JobPosting,
    formData: ApplyFormData,
    resumeFileName: string
  ): Promise<JobApplication> {
    return withMockFallback(
      async () => {
        const rawJobId = String(job.id).trim();
        let numericJobId: number | null = /^\d+$/.test(rawJobId) ? Number(rawJobId) : null;
        if (numericJobId === null) {
          const searchRes = await apiClient.get<{ content?: Array<{ id: number | string; title: string; company: string }> } | Array<{ id: number | string; title: string; company: string }>>(
            '/jobs/search',
            { params: { q: job.title, size: 10 } }
          );
          const items = Array.isArray(searchRes) ? searchRes : searchRes.content || [];
          const matched = items.find(
            (item) =>
              item.title.toLowerCase() === job.title.toLowerCase() &&
              item.company.toLowerCase() === job.company.toLowerCase()
          );
          if (matched && /^\d+$/.test(String(matched.id))) {
            numericJobId = Number(matched.id);
          }
        }
        if (numericJobId === null) {
          throw new ApiError({
            message: 'This preview listing is not active on the live server. Please choose a live job from Find Jobs.',
            status: 404,
            code: 'JOB_NOT_FOUND',
          });
        }
        const rawResumeId = String(formData.resumeId || '').trim();
        const numericResumeId = /^\d+$/.test(rawResumeId) ? Number(rawResumeId) : null;
        const res = await apiClient.post<SpringApplicationDto>('/applications', {
          jobId: numericJobId,
          resumeId: numericResumeId && numericResumeId > 0 ? numericResumeId : null,
          coverLetter: formData.shortPitch,
          experienceYears: formData.experienceYears,
          workAuthorized: formData.workAuthorized,
          requiresSponsorship: formData.requiresSponsorship,
          noticePeriod: formData.noticePeriod,
        });
        return mapSpringApplication(res);
      },
      () => ({
        id: `app-${Date.now()}`,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        companyLogo:
          job.companyLogo ||
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAwHk67W2LTJaO9pS07TeLRCOGTFuvWx6a_iH2TtH_7twIlIcoXNffq20X5sNqzZUQ1FGlqONQS8q5LHsSw7D4qRp3cLEKbFWkXUHUlo7vU5x6aEWwzXO04CJmpPDqoRLECfBng_LmnsFfBqjH5ECeOUre-oa62XbX3fn_JrWgUw4lvW75KwL1u54dZDHwqdDU91DbJHOBCK0YCKZGxPqUbLiQEyzfiScaFzOoimQM',
        location: job.location,
        salaryRange: job.salaryDisplay.replace(' / yr', ''),
        status: 'in-review' as const,
        stageBadge: 'APPLIED',
        stageNumber: 1,
        totalStages: 4,
        stageSteps: ['Applied', 'Review', 'Shortlisted', 'Hired'],
        appliedAgo: 'Just now',
        activityNote: `Submitted with ${resumeFileName}`,
        resumeUsed: resumeFileName,
        coverNote: formData.shortPitch,
      })
    );
  },

  async withdrawApplication(applicationId: string): Promise<void> {
    return withMockFallback(
      async () => {
        await apiClient.patch<unknown>(
          `/applications/${encodeURIComponent(applicationId)}/withdraw`
        );
      },
      () => undefined
    );
  },

  async listJobApplications(jobId: string): Promise<SpringApplicationDto[]> {
    return withMockFallback(
      async () => {
        const res = await apiClient.get<SpringApplicationDto[]>(
          `/jobs/${encodeURIComponent(jobId)}/applications`
        );
        return Array.isArray(res) ? res : [];
      },
      () => []
    );
  },

  async updateApplicationStatus(
    applicationId: string | number,
    status: BackendApplicationStatus
  ): Promise<SpringApplicationDto> {
    return withMockFallback(
      () =>
        apiClient.patch<SpringApplicationDto>(
          `/applications/${encodeURIComponent(String(applicationId))}/status`,
          { status }
        ),
      () => ({
        id: applicationId,
        jobId: 0,
        jobTitle: 'Preview Role',
        company: 'Preview Company',
        location: 'Remote',
        salary: '$150k',
        status,
      })
    );
  },

  async respondToOffer(
    offerId: string,
    decision: 'accepted' | 'declined'
  ): Promise<{ offerId: string; status: 'accepted' | 'declined'; applicationId?: number | null }> {
    return withMockFallback(
      () =>
        apiClient.patch<{ offerId: string; status: 'accepted' | 'declined'; applicationId?: number | null }>(
          `/applications/offers/${encodeURIComponent(offerId)}/decision`,
          { decision }
        ),
      () => ({ offerId, status: decision, applicationId: null })
    );
  },
};
