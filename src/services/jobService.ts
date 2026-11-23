import { INITIAL_JOBS, MARCUS_AVANCE_AVATAR, OFFICE_SF_IMAGE } from '../data/mockData';
import { EmploymentType, JobPosting, WorkplaceType } from '../types';
import { PaginatedResponse } from '../types/api';
import { apiClient, withMockFallback } from './apiClient';

export interface JobSearchFilters {
  query?: string;
  location?: string;
  sector?: string;
  workplace?: WorkplaceType | 'All';
  employmentType?: EmploymentType | 'All';
  experience?: string;
  minSalaryK?: number;
  techTag?: string;
  sortBy?: 'Most Relevant' | 'Latest Added' | 'Highest Salary' | 'Fewest Applicants';
}

export interface SpringJobDto {
  id: number | string;
  slug?: string;
  title: string;
  company: string;
  companyTagline?: string;
  companySize?: string;
  companyLogo?: string;
  verified?: boolean;
  location: string;
  workplace?: WorkplaceType;
  description: string;
  requirements: string;
  salary: string;
  minSalaryK?: number;
  maxSalaryK?: number;
  employmentType: EmploymentType;
  experience: string;
  yearsRequired?: string;
  sector?: string;
  skills: string[];
  matchScore?: number;
  applicantsCount?: number;
  featured?: boolean;
  status?: string;
  createdAt?: string;
}

export interface CreateJobPayload {
  title: string;
  company: string;
  companyTagline?: string;
  companySize?: string;
  location: string;
  workplace?: WorkplaceType;
  description: string;
  requirements: string;
  salary: string;
  minSalaryK?: number;
  maxSalaryK?: number;
  employmentType: EmploymentType;
  experience: string;
  yearsRequired?: string;
  sector?: string;
  skills: string[];
  featured?: boolean;
}

function mapSpringJobToPosting(dto: SpringJobDto | JobPosting): JobPosting {
  if ('aboutRole' in dto && Array.isArray(dto.aboutRole)) {
    return dto;
  }
  const s = dto as SpringJobDto;
  const reqList = s.requirements
    ? s.requirements
        .split(/[;\n]+/)
        .map((r) => r.trim())
        .filter(Boolean)
    : [];
  return {
    id: String(s.id),
    title: s.title,
    company: s.company,
    companyTagline: s.companyTagline || 'Verified Partner',
    companySize: s.companySize || '250–500 employees',
    companyLogo: s.companyLogo,
    verified: s.verified ?? true,
    location: s.location,
    workplace: s.workplace || 'Remote',
    employmentType: s.employmentType || 'Full-time',
    experienceLevel: (s.experience as JobPosting['experienceLevel']) || 'Senior Level',
    yearsRequired: s.yearsRequired || '5+ Years Required',
    salaryDisplay: s.salary,
    minSalaryK: s.minSalaryK ?? 150,
    maxSalaryK: s.maxSalaryK ?? 190,
    matchScore: s.matchScore ?? 94,
    sector: s.sector || 'Engineering',
    tags: Array.isArray(s.skills) ? s.skills : [],
    postedAgo: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Recently posted',
    applicantsCount: s.applicantsCount ?? 0,
    urgencyLabel: `${s.applicantsCount ?? 0} applicants • ${s.employmentType}`,
    urgencyTone: 'tertiary',
    featured: s.featured,
    aboutRole: s.description ? [s.description] : ['Engineering role at ' + s.company],
    responsibilities: [
      {
        icon: 'architecture',
        title: 'Core Technical Leadership',
        description: s.description || 'Lead engineering architecture and delivery.',
      },
    ],
    requirements: reqList.length > 0 ? reqList : [s.requirements || 'Relevant engineering experience'],
    perks: [
      { icon: 'savings', title: '401(k) & Equity', subtitle: 'Competitive compensation & ownership' },
      { icon: 'health_and_safety', title: 'Full Health Benefits', subtitle: 'Medical, dental, and vision' },
    ],
    hiringManager: {
      name: 'Marcus Vance',
      role: 'VP of Engineering',
      avatar: MARCUS_AVANCE_AVATAR,
      status: 'Active',
      responseTime: '~24h response',
      quote: '“We value engineers who take deep ownership of user experience and system reliability.”',
    },
    officeImage: OFFICE_SF_IMAGE,
    officeLabel: s.location,
  };
}

function filterMockJobs(filters: JobSearchFilters, sourceJobs: JobPosting[]): JobPosting[] {
  const q = (filters.query || '').trim().toLowerCase();
  const loc = (filters.location || '').trim().toLowerCase();

  const filtered = sourceJobs.filter((job) => {
    const matchesQuery =
      !q ||
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.sector.toLowerCase().includes(q) ||
      job.tags.some((t) => t.toLowerCase().includes(q));

    const matchesLocation =
      !loc ||
      loc === 'remote, worldwide' ||
      job.location.toLowerCase().includes(loc) ||
      job.workplace.toLowerCase().includes(loc);

    const matchesSector =
      !filters.sector ||
      filters.sector === 'All' ||
      job.sector.toLowerCase() === filters.sector.toLowerCase();

    const matchesWorkplace =
      !filters.workplace || filters.workplace === 'All' || job.workplace === filters.workplace;

    const matchesEmployment =
      !filters.employmentType ||
      filters.employmentType === 'All' ||
      job.employmentType === filters.employmentType;

    const matchesExperience =
      !filters.experience ||
      filters.experience === 'All' ||
      job.experienceLevel.toLowerCase().includes(filters.experience.toLowerCase());

    const matchesSalary = !filters.minSalaryK || job.maxSalaryK >= filters.minSalaryK;

    const matchesTag =
      !filters.techTag ||
      job.tags.some((t) => t.toLowerCase().includes(filters.techTag!.toLowerCase()));

    return (
      matchesQuery &&
      matchesLocation &&
      matchesSector &&
      matchesWorkplace &&
      matchesEmployment &&
      matchesExperience &&
      matchesSalary &&
      matchesTag
    );
  });

  const sorted = [...filtered];
  switch (filters.sortBy) {
    case 'Highest Salary':
      sorted.sort((a, b) => b.maxSalaryK - a.maxSalaryK);
      break;
    case 'Fewest Applicants':
      sorted.sort((a, b) => a.applicantsCount - b.applicantsCount);
      break;
    case 'Latest Added':
      sorted.sort((a, b) => a.postedAgo.localeCompare(b.postedAgo));
      break;
    default:
      sorted.sort((a, b) => b.matchScore - a.matchScore);
      break;
  }

  return sorted;
}

function mapSortParams(sortBy?: JobSearchFilters['sortBy']): { sortBy: string; direction: 'asc' | 'desc' } {
  switch (sortBy) {
    case 'Highest Salary':
      return { sortBy: 'maxSalaryK', direction: 'desc' };
    case 'Fewest Applicants':
      return { sortBy: 'applicantsCount', direction: 'asc' };
    case 'Latest Added':
      return { sortBy: 'createdAt', direction: 'desc' };
    default:
      return { sortBy: 'matchScore', direction: 'desc' };
  }
}

/**
 * Jobs catalog & search service aligned with Spring Boot endpoints:
 * - GET    /jobs
 * - GET    /jobs/search
 * - GET    /jobs/{id}
 * - POST   /jobs (ADMIN)
 * - PUT    /jobs/{id} (ADMIN)
 * - DELETE /jobs/{id} (ADMIN)
 * - POST/DELETE /jobs/{id}/bookmark
 */
export const jobService = {
  async listJobs(
    filters: JobSearchFilters = {},
    sourceJobs: JobPosting[] = INITIAL_JOBS
  ): Promise<JobPosting[]> {
    const page = await this.searchJobsPage(filters, 0, 50, sourceJobs);
    return page.content;
  },

  async searchJobsPage(
    filters: JobSearchFilters = {},
    page = 0,
    size = 10,
    sourceJobs: JobPosting[] = INITIAL_JOBS
  ): Promise<PaginatedResponse<JobPosting>> {
    return withMockFallback(
      async () => {
        const sort = mapSortParams(filters.sortBy);
        const effectiveMinSalary =
          filters.minSalaryK && filters.minSalaryK > 80 ? filters.minSalaryK : undefined;
        const hasFilters = Boolean(
          filters.query ||
            filters.techTag ||
            filters.location ||
            (filters.sector && filters.sector !== 'All') ||
            (filters.workplace && filters.workplace !== 'All') ||
            (filters.employmentType && filters.employmentType !== 'All') ||
            (filters.experience && filters.experience !== 'All') ||
            effectiveMinSalary
        );
        const endpoint = hasFilters ? '/jobs/search' : '/jobs';
        const res = await apiClient.get<PaginatedResponse<SpringJobDto> | SpringJobDto[]>(endpoint, {
          params: {
            q: filters.query || filters.techTag || undefined,
            location: filters.location || undefined,
            sector: filters.sector && filters.sector !== 'All' ? filters.sector : undefined,
            workplace:
              filters.workplace && filters.workplace !== 'All' ? filters.workplace : undefined,
            employmentType:
              filters.employmentType && filters.employmentType !== 'All'
                ? filters.employmentType
                : undefined,
            experience:
              filters.experience && filters.experience !== 'All' ? filters.experience : undefined,
            minSalaryK: effectiveMinSalary,
            page,
            size,
            sortBy: sort.sortBy,
            direction: sort.direction,
          },
        });
        if (Array.isArray(res)) {
          return {
            content: res.map(mapSpringJobToPosting),
            totalElements: res.length,
            totalPages: 1,
            size,
            number: page,
          };
        }
        return {
          ...res,
          content: res.content.map(mapSpringJobToPosting),
        };
      },
      () => {
        const all = filterMockJobs(filters, sourceJobs);
        const totalElements = all.length;
        const totalPages = Math.max(1, Math.ceil(totalElements / size));
        const start = page * size;
        const slice = all.slice(start, start + size);
        return {
          content: slice,
          totalElements,
          totalPages,
          size,
          number: page,
          first: page === 0,
          last: page + 1 >= totalPages,
        };
      }
    );
  },

  async getJobById(
    id: string,
    sourceJobs: JobPosting[] = INITIAL_JOBS
  ): Promise<JobPosting | undefined> {
    return withMockFallback(
      async () => mapSpringJobToPosting(await apiClient.get<SpringJobDto>(`/jobs/${encodeURIComponent(id)}`)),
      () => sourceJobs.find((j) => j.id === id)
    );
  },

  async createJob(payload: CreateJobPayload): Promise<JobPosting> {
    return withMockFallback(
      async () => mapSpringJobToPosting(await apiClient.post<SpringJobDto>('/jobs', payload)),
      () =>
        mapSpringJobToPosting({
          id: `job-${Date.now()}`,
          ...payload,
          status: 'OPEN',
        })
    );
  },

  async updateJob(id: string, payload: CreateJobPayload): Promise<JobPosting> {
    return withMockFallback(
      async () =>
        mapSpringJobToPosting(
          await apiClient.put<SpringJobDto>(`/jobs/${encodeURIComponent(id)}`, payload)
        ),
      () => mapSpringJobToPosting({ id, ...payload, status: 'OPEN' })
    );
  },

  async deleteJob(id: string): Promise<void> {
    return withMockFallback(
      () => apiClient.delete<void>(`/jobs/${encodeURIComponent(id)}`),
      () => undefined
    );
  },

  async toggleBookmark(jobId: string, saved: boolean): Promise<{ jobId: string; saved: boolean }> {
    return withMockFallback(
      async () => {
        if (saved) {
          await apiClient.post<void>(`/jobs/${encodeURIComponent(jobId)}/bookmark`);
        } else {
          await apiClient.delete<void>(`/jobs/${encodeURIComponent(jobId)}/bookmark`);
        }
        return { jobId, saved };
      },
      () => ({ jobId, saved })
    );
  },
};
