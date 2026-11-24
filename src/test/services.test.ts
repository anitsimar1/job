import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../types/api';
import { JobPosting } from '../types';

const { mockApiClient, mockAxiosGet } = vi.hoisted(() => ({
  mockApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
  mockAxiosGet: vi.fn(),
}));

vi.mock('../services/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../services/apiClient')>(
    '../services/apiClient'
  );
  return {
    ...actual,
    API_BASE_URL: 'https://job-a5po.onrender.com/api',
    BACKEND_ORIGIN: 'https://job-a5po.onrender.com',
    IS_MOCK_MODE: false,
    apiClient: mockApiClient,
    axiosInstance: {
      ...actual.axiosInstance,
      get: mockAxiosGet,
    },
    withMockFallback: async <T>(apiCall: () => Promise<T>) => apiCall(),
  };
});

import { normalizeApiError } from '../services/apiClient';
import { applicationService } from '../services/applicationService';
import { resumeService } from '../services/resumeService';
import { authService } from '../services/authService';
import { jobService } from '../services/jobService';
import { tokenStorage } from '../services/tokenStorage';

function makeMockJob(id = '8'): JobPosting {
  return {
    id,
    title: 'Staff Frontend Engineer',
    company: 'Apex Cloud',
    verified: true,
    location: 'San Francisco, CA',
    workplace: 'Remote',
    employmentType: 'Full-time',
    experienceLevel: 'Senior Level',
    yearsRequired: '5+ Years Required',
    salaryDisplay: '$185,000 - $220,000 / yr',
    minSalaryK: 185,
    maxSalaryK: 220,
    matchScore: 96,
    sector: 'Engineering',
    tags: ['React', 'TypeScript'],
    postedAgo: '1d ago',
    applicantsCount: 12,
    urgencyLabel: '12 applicants • Full-time',
    urgencyTone: 'tertiary',
    aboutRole: ['Build scalable web platforms'],
    responsibilities: [],
    requirements: ['5+ years React'],
    perks: [],
    hiringManager: {
      name: 'Marcus Vance',
      role: 'VP of Engineering',
      avatar: '',
      status: 'Active',
      responseTime: '~24h response',
      quote: 'Great team',
    },
    officeImage: '',
  };
}

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('Service layer live HTTP integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStorage.clearTokens();
  });

  describe('applicationService', () => {
    it('normalizes numeric jobId and empty/mock resumeId to null on submit', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        id: 101,
        jobId: 8,
        jobTitle: 'Staff Frontend Engineer',
        company: 'Apex Cloud',
        location: 'San Francisco, CA',
        salary: '$185k - $220k',
        status: 'APPLIED',
        resumeFileName: null,
      });

      const result = await applicationService.submitApplication(
        makeMockJob('8'),
        {
          fullName: 'Jane Candidate',
          email: 'jane@example.com',
          phone: '+15551234567',
          location: 'Remote',
          resumeId: 'res-1',
          githubUrl: '',
          linkedinUrl: '',
          experienceYears: '5-7 yrs',
          workAuthorized: true,
          requiresSponsorship: false,
          noticePeriod: '2 Weeks',
          shortPitch: 'Excited to contribute.',
          consentAgreed: true,
        },
        'Profile Application'
      );

      expect(mockApiClient.post).toHaveBeenCalledWith('/applications', {
        jobId: 8,
        resumeId: null,
        coverLetter: 'Excited to contribute.',
        experienceYears: '5-7 yrs',
        workAuthorized: true,
        requiresSponsorship: false,
        noticePeriod: '2 Weeks',
      });
      expect(result.id).toBe('101');
      expect(result.jobId).toBe('8');
      expect(result.stageBadge).toBe('APPLIED');
    });

    it('sends numeric resumeId when a valid uploaded resume is selected', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        id: 102,
        jobId: 15,
        jobTitle: 'Staff Frontend Engineer',
        company: 'Apex Cloud',
        location: 'Remote',
        salary: '$185k',
        status: 'APPLIED',
        resumeId: 44,
        resumeFileName: 'jane-cv.pdf',
      });

      const res = await applicationService.submitApplication(
        makeMockJob('15'),
        {
          fullName: 'Jane',
          email: 'jane@example.com',
          phone: '1234567',
          location: 'Remote',
          resumeId: '44',
          githubUrl: '',
          linkedinUrl: '',
          experienceYears: '5-7 yrs',
          workAuthorized: true,
          requiresSponsorship: false,
          noticePeriod: '2 Weeks',
          shortPitch: '',
          consentAgreed: true,
        },
        'jane-cv.pdf'
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/applications',
        expect.objectContaining({ jobId: 15, resumeId: 44 })
      );
      expect(res.resumeUsed).toBe('jane-cv.pdf');
    });

    it('propagates 409 duplicate application ApiError without swallowing', async () => {
      mockApiClient.post.mockRejectedValueOnce(
        new ApiError({ message: 'You have already applied to this job', status: 409, code: 'CONFLICT' })
      );

      await expect(
        applicationService.submitApplication(
          makeMockJob('8'),
          {
            fullName: 'Jane',
            email: 'jane@example.com',
            phone: '1234567',
            location: 'Remote',
            resumeId: '',
            githubUrl: '',
            linkedinUrl: '',
            experienceYears: '5-7 yrs',
            workAuthorized: true,
            requiresSponsorship: false,
            noticePeriod: '2 Weeks',
            shortPitch: '',
            consentAgreed: true,
          },
          'Profile Application'
        )
      ).rejects.toMatchObject({ status: 409 });
    });

    it('calls PATCH withdraw and PATCH offer decision endpoints', async () => {
      mockApiClient.patch.mockResolvedValueOnce({});
      await applicationService.withdrawApplication('77');
      expect(mockApiClient.patch).toHaveBeenCalledWith('/applications/77/withdraw');

      mockApiClient.patch.mockResolvedValueOnce({
        offerId: 'app-55',
        status: 'accepted',
        applicationId: 55,
      });
      const decision = await applicationService.respondToOffer('app-55', 'accepted');
      expect(mockApiClient.patch).toHaveBeenCalledWith('/applications/offers/app-55/decision', {
        decision: 'accepted',
      });
      expect(decision).toEqual({ offerId: 'app-55', status: 'accepted', applicationId: 55 });
    });
  });

  describe('resumeService', () => {
    it('uploads FormData to /resumes/upload and maps SpringResumeDto', async () => {
      mockApiClient.upload.mockResolvedValueOnce({
        id: 21,
        fileName: 'alex-resume.pdf',
        fileSizeBytes: 512000,
        default: true,
        atsScore: 95,
      });

      const file = new File(['%PDF-1.4 mock'], 'alex-resume.pdf', { type: 'application/pdf' });
      const doc = await resumeService.uploadResume(file);

      expect(mockApiClient.upload).toHaveBeenCalledTimes(1);
      const [url, fd] = mockApiClient.upload.mock.calls[0];
      expect(url).toBe('/resumes/upload');
      expect(fd).toBeInstanceOf(FormData);
      expect((fd as FormData).get('file')).toBe(file);
      expect(doc.id).toBe('21');
      expect(doc.isDefault).toBe(true);
      expect(doc.label).toBe('Default 1-Click');
      expect(doc.atsScore).toBe(95);
    });

    it('lists, sets default, downloads blob, and deletes resumes', async () => {
      mockApiClient.get.mockResolvedValueOnce([
        { id: 1, fileName: 'cv1.pdf', isDefault: true, fileSizeBytes: 102400 },
      ]);
      const list = await resumeService.listResumes();
      expect(list).toHaveLength(1);
      expect(list[0].fileName).toBe('cv1.pdf');

      mockApiClient.patch.mockResolvedValueOnce(undefined);
      await resumeService.setDefaultResume('1');
      expect(mockApiClient.patch).toHaveBeenCalledWith('/resumes/1/default');

      mockAxiosGet.mockResolvedValueOnce({ data: new Blob(['%PDF-1.4']) });
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
      await resumeService.downloadResume('1', 'cv1.pdf');
      expect(mockAxiosGet).toHaveBeenCalledWith('/resumes/1/download', { responseType: 'blob' });
      expect(clickSpy).toHaveBeenCalledTimes(1);

      mockApiClient.delete.mockResolvedValueOnce(undefined);
      await resumeService.deleteResume('1');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/resumes/1');
    });
  });

  describe('authService', () => {
    it('logs in, stores token, checks /auth/me, and clears token on logout even on failure', async () => {
      const token = makeFakeJwt({
        sub: '42',
        email: 'user@jobconnect.dev',
        name: 'Test User',
        roles: ['ROLE_JOB_SEEKER'],
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      mockApiClient.post.mockResolvedValueOnce({
        user: {
          id: 42,
          fullName: 'Test User',
          email: 'user@jobconnect.dev',
          roles: ['ROLE_JOB_SEEKER'],
        },
        role: 'ROLE_JOB_SEEKER',
        accessToken: token,
        expiresInMs: 3600000,
      });

      const session = await authService.login({
        email: 'user@jobconnect.dev',
        password: 'Password123!',
        rememberMe: true,
      });

      expect(session.isAuthenticated).toBe(true);
      expect(session.role).toBe('JOB_SEEKER');
      expect(tokenStorage.getAccessToken()).toBe(token);

      const restored = authService.restoreSessionFromToken();
      expect(restored?.userEmail).toBe('user@jobconnect.dev');

      mockApiClient.get.mockResolvedValueOnce({
        id: 99,
        fullName: 'Admin Boss',
        email: 'admin@jobconnect.dev',
        roles: ['ROLE_ADMIN'],
      });
      const current = await authService.getCurrentSession();
      expect(current?.role).toBe('ADMIN');

      mockApiClient.post.mockRejectedValueOnce(new Error('Network down'));
      await expect(authService.logout()).rejects.toThrow();
      expect(tokenStorage.getAccessToken()).toBeNull();
    });

    it('ignores expired JWT in restoreSessionFromToken', () => {
      const expired = makeFakeJwt({
        sub: '42',
        email: 'old@jobconnect.dev',
        exp: Math.floor(Date.now() / 1000) - 10,
      });
      tokenStorage.setTokens({ accessToken: expired }, true);
      expect(authService.restoreSessionFromToken()).toBeNull();
    });

    it('forwards loginAs=EMPLOYER on /auth/login when signing in as Admin (Job Poster)', async () => {
      const token = makeFakeJwt({
        sub: '77',
        email: 'hiring@acmecloud.dev',
        name: 'Morgan Poster',
        roles: ['ROLE_EMPLOYER'],
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      mockApiClient.post.mockResolvedValueOnce({
        user: {
          id: 77,
          fullName: 'Morgan Poster',
          email: 'hiring@acmecloud.dev',
          companyName: 'Acme Cloud Inc.',
          roles: ['ROLE_EMPLOYER'],
        },
        role: 'ROLE_EMPLOYER',
        accessToken: token,
        expiresInMs: 3600000,
      });

      const session = await authService.login({
        email: 'hiring@acmecloud.dev',
        password: 'PosterPass123!',
        rememberMe: true,
        accountType: 'EMPLOYER',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/login',
        {
          email: 'hiring@acmecloud.dev',
          password: 'PosterPass123!',
          rememberMe: true,
          loginAs: 'EMPLOYER',
        },
        { _skipAuthRefresh: true }
      );
      expect(session.role).toBe('EMPLOYER');
    });
  });

  describe('jobService', () => {
    it('uses /jobs with sortBy=createdAt for Latest Added and skips minSalaryK <= 80', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        content: [
          {
            id: 50,
            title: 'Senior Go Engineer',
            company: 'CloudScale',
            location: 'Remote',
            description: 'Build distributed services',
            requirements: 'Go; Kubernetes',
            salary: '$190k',
            employmentType: 'Full-time',
            experience: 'Senior Level',
            skills: ['Go', 'Kubernetes'],
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 6,
        number: 0,
      });

      const page = await jobService.searchJobsPage(
        { minSalaryK: 80, sortBy: 'Latest Added' },
        0,
        6
      );

      expect(mockApiClient.get).toHaveBeenCalledWith('/jobs', {
        params: expect.objectContaining({
          minSalaryK: undefined,
          sortBy: 'createdAt',
          direction: 'desc',
          page: 0,
          size: 6,
        }),
      });
      expect(page.content[0].id).toBe('50');
      expect(page.content[0].requirements).toEqual(['Go', 'Kubernetes']);
    });

    it('switches to /jobs/search when query or salary > 80 filter is active', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 6,
        number: 0,
      });

      await jobService.searchJobsPage({ query: 'React', minSalaryK: 150, workplace: 'Remote' }, 0, 6);

      expect(mockApiClient.get).toHaveBeenCalledWith('/jobs/search', {
        params: expect.objectContaining({
          q: 'React',
          minSalaryK: 150,
          workplace: 'Remote',
        }),
      });
    });

    it('fetches individual job by id via GET /jobs/{id}', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        id: 88,
        title: 'Founding Rust Engineer',
        company: 'ZeroCopy',
        location: 'Remote',
        description: 'Systems engineering',
        requirements: 'Rust',
        salary: '$210k',
        employmentType: 'Full-time',
        experience: 'Staff',
        skills: ['Rust'],
      });

      const job = await jobService.getJobById('88');
      expect(mockApiClient.get).toHaveBeenCalledWith('/jobs/88');
      expect(job?.title).toBe('Founding Rust Engineer');
    });
  });

  describe('normalizeApiError', () => {
    it('returns actionable backend/CORS diagnostic message for Axios Network Error', () => {
      const err = new AxiosError('Network Error', 'ERR_NETWORK');
      const normalized = normalizeApiError(err);
      expect(normalized.isNetworkError).toBe(true);
      expect(normalized.code).toBe('NETWORK_ERROR');
      expect(normalized.message).toMatch(/Unable to reach|Cannot reach/i);
      expect(normalized.message).toMatch(/CORS|backend/i);
    });
  });
});
