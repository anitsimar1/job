import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_PROFILE } from '../data/mockData';
import { ApiError } from '../types/api';
import { JobApplication, JobPosting } from '../types';

const {
  mockAuthService,
  mockJobService,
  mockApplicationService,
  mockResumeService,
  mockUserService,
  mockAdminService,
  capturedUnauthorizedHandler,
} = vi.hoisted(() => ({
  mockAuthService: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentSession: vi.fn(),
    restoreSessionFromToken: vi.fn(),
    logout: vi.fn(),
    getGoogleOAuthUrl: vi.fn(() => 'https://job-a5po.onrender.com/oauth2/authorization/google'),
  },
  mockJobService: {
    listJobs: vi.fn(),
    searchJobsPage: vi.fn(),
    getJobById: vi.fn(),
    createJob: vi.fn(),
    updateJob: vi.fn(),
    deleteJob: vi.fn(),
    toggleBookmark: vi.fn(),
  },
  mockApplicationService: {
    listApplications: vi.fn(),
    getApplicationById: vi.fn(),
    submitApplication: vi.fn(),
    withdrawApplication: vi.fn(),
    respondToOffer: vi.fn(),
  },
  mockResumeService: {
    listResumes: vi.fn(),
    uploadResume: vi.fn(),
    downloadResume: vi.fn(),
    setDefaultResume: vi.fn(),
    deleteResume: vi.fn(),
  },
  mockUserService: {
    getCurrentProfile: vi.fn(),
    updateProfile: vi.fn(),
    addSkill: vi.fn(),
    addExperience: vi.fn(),
  },
  mockAdminService: {
    getMetrics: vi.fn(),
    listUsers: vi.fn(),
    listAllApplications: vi.fn(),
    moderateListing: vi.fn(),
    createUrgentRole: vi.fn(),
    updateApplicationStatus: vi.fn(),
  },
  capturedUnauthorizedHandler: { current: null as (() => void) | null },
}));

vi.mock('../services', () => ({
  IS_MOCK_MODE: false,
  API_BASE_URL: 'https://job-a5po.onrender.com/api',
  BACKEND_ORIGIN: 'https://job-a5po.onrender.com',
  setUnauthorizedHandler: (handler: (() => void) | null) => {
    capturedUnauthorizedHandler.current = handler;
  },
  normalizeApiError: (err: unknown) => {
    if (err instanceof ApiError) return err;
    if (err instanceof Error) {
      return new ApiError({ message: err.message, status: 500, code: 'ERR' });
    }
    return new ApiError({ message: String(err), status: 500, code: 'ERR' });
  },
  authService: mockAuthService,
  jobService: mockJobService,
  applicationService: mockApplicationService,
  resumeService: mockResumeService,
  userService: mockUserService,
  adminService: mockAdminService,
}));

vi.mock('../services/jobService', () => ({
  jobService: mockJobService,
}));

import { AppProvider } from '../context/AppContext';
import { Toast } from '../components/common/Toast';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AuthPage } from '../pages/AuthPage';
import { OAuthCallbackPage } from '../pages/OAuthCallbackPage';
import { FindJobsPage } from '../pages/FindJobsPage';
import { JobDetailsPage } from '../pages/JobDetailsPage';
import { ApplyJobPage } from '../pages/ApplyJobPage';
import { MyApplicationsPage } from '../pages/MyApplicationsPage';
import { mapSpringApplication } from '../services/applicationService';

function makeJob(
  id: string,
  overrides: Partial<JobPosting> = {}
): JobPosting {
  return {
    id,
    title: 'Senior Distributed Systems Engineer',
    company: 'Stripe',
    companyTagline: 'Global Payments',
    companySize: '5000+ employees',
    verified: true,
    location: 'Remote - US',
    workplace: 'Remote',
    employmentType: 'Full-time',
    experienceLevel: 'Senior Level',
    yearsRequired: '5+ Years Required',
    salaryDisplay: '$190,000 - $230,000 / yr',
    minSalaryK: 190,
    maxSalaryK: 230,
    matchScore: 96,
    sector: 'Backend',
    tags: ['TypeScript', 'React', 'Java'],
    postedAgo: '1d ago',
    applicantsCount: 7,
    urgencyLabel: '7 applicants • Full-time',
    urgencyTone: 'tertiary',
    status: 'OPEN',
    aboutRole: ['Design resilient cloud platforms.'],
    responsibilities: [{ icon: 'code', title: 'Architecture', description: 'Build core APIs.' }],
    requirements: ['5+ years experience'],
    perks: [{ icon: 'payments', title: 'Equity', subtitle: 'Stock grants' }],
    hiringManager: {
      name: 'Marcus Vance',
      role: 'VP Engineering',
      avatar: '',
      status: 'Active',
      responseTime: '~24h',
      quote: 'Great engineering culture',
    },
    officeImage: '',
    ...overrides,
  };
}

function renderApp(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppProvider>
        <Toast />
        <Routes>
          <Route path="/" element={<div>Home Route</div>} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/jobs" element={<FindJobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailsPage />} />
          <Route path="/apply/:id" element={<ApplyJobPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['JOB_SEEKER', 'ADMIN']}>
                <div>Dashboard Protected Screen</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={['JOB_SEEKER', 'ADMIN']}>
                <MyApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <div>Admin Protected Screen</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Complete End-to-End QA UI Suite (Auth, OAuth, Search, Apply, My Applications)', () => {
  const sampleJob = makeJob('101');

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    capturedUnauthorizedHandler.current = null;
    mockAuthService.restoreSessionFromToken.mockReturnValue(null);
    mockAuthService.getCurrentSession.mockResolvedValue(null);
    mockJobService.listJobs.mockResolvedValue([sampleJob]);
    mockJobService.searchJobsPage.mockResolvedValue({
      content: [sampleJob],
      totalElements: 1,
      totalPages: 1,
      size: 6,
      number: 0,
    });
    mockJobService.getJobById.mockResolvedValue(sampleJob);
    mockApplicationService.listApplications.mockResolvedValue([]);
    mockUserService.getCurrentProfile.mockResolvedValue({
      ...INITIAL_PROFILE,
      fullName: 'QA Candidate',
      email: 'qa@example.com',
      resumes: [
        {
          id: '55',
          fileName: 'qa-saved-cv.pdf',
          fileSize: '0.5 MB',
          uploadedAt: 'Uploaded 11/10/2026',
          isDefault: true,
          label: 'Default 1-Click',
          atsScore: 94,
        },
      ],
    });
  });

  describe('1. Registration, Authentication, Session Expiration & Google OAuth UI', () => {
    it('blocks empty login and empty registration form submissions before hitting API', async () => {
      const user = userEvent.setup();
      renderApp(['/auth']);
      await screen.findByText('Welcome back');

      const loginForm = screen.getByRole('button', { name: /Sign In to JobConnect/i }).closest('form')!;
      fireEvent.submit(loginForm);
      expect(await screen.findByText('Please enter a valid work email address.')).toBeInTheDocument();
      expect(mockAuthService.login).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: /Create Account/i }));
      const regForm = screen.getByRole('button', { name: /Create Free Account/i }).closest('form')!;
      fireEvent.submit(regForm);
      expect(await screen.findByText('Please enter a valid work email address.')).toBeInTheDocument();
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('surfaces backend 409 duplicate email on register and 401 wrong password/unregistered email on login', async () => {
      const user = userEvent.setup();
      mockAuthService.login.mockRejectedValueOnce(
        new ApiError({ message: 'Invalid email or password', status: 401, code: 'UNAUTHORIZED' })
      );
      mockAuthService.register.mockRejectedValueOnce(
        new ApiError({
          message: 'An account with email dup@example.com already exists',
          status: 409,
          code: 'DUPLICATE_RESOURCE',
        })
      );

      renderApp(['/auth']);
      await screen.findByText('Welcome back');

      await user.type(screen.getByPlaceholderText('name@company.com'), 'missing@example.com');
      await user.type(screen.getByPlaceholderText('••••••••••••'), 'WrongPass123!');
      await user.click(screen.getByRole('button', { name: /Sign In to JobConnect/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');

      await user.click(screen.getByRole('button', { name: /Create Account/i }));
      await user.type(screen.getByPlaceholderText('Alexandra Vance'), 'Dup User');
      await user.type(screen.getByPlaceholderText('+1 (555) 234-8901'), '+15551234567');
      await user.clear(screen.getByPlaceholderText('name@company.com'));
      await user.type(screen.getByPlaceholderText('name@company.com'), 'dup@example.com');
      const pwInputs = screen.getAllByPlaceholderText('••••••••••••');
      await user.clear(pwInputs[0]);
      await user.type(pwInputs[0], 'Password123!');
      await user.type(pwInputs[1], 'Password123!');
      await user.click(screen.getByRole('button', { name: /Create Free Account/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'An account with email dup@example.com already exists'
      );
    });

    it('invalidates session and shows expiration toast when global 401 unauthorizedHandler fires', async () => {
      mockAuthService.getCurrentSession.mockResolvedValue({
        isAuthenticated: true,
        isDemoMode: false,
        userId: '12',
        userEmail: 'qa@example.com',
        userName: 'QA Candidate',
        role: 'JOB_SEEKER',
        rememberMe: true,
      });

      renderApp(['/dashboard']);
      expect(await screen.findByText('Dashboard Protected Screen')).toBeInTheDocument();

      expect(capturedUnauthorizedHandler.current).toBeTypeOf('function');
      capturedUnauthorizedHandler.current?.();

      expect(await screen.findByText('Session expired — please sign in again')).toBeInTheDocument();
      expect(await screen.findByText('Welcome back')).toBeInTheDocument();
    });

    it('handles Google OAuth callback success, missing session cookie, and cancellation error', async () => {
      mockAuthService.getCurrentSession.mockResolvedValueOnce({
        isAuthenticated: true,
        isDemoMode: false,
        userId: '55',
        userEmail: 'google.user@gmail.com',
        userName: 'Google User',
        role: 'JOB_SEEKER',
        authProvider: 'GOOGLE',
        rememberMe: true,
      });

      const view1 = renderApp(['/oauth/callback?oauth=success']);
      expect(await screen.findByText('Authentication Verified')).toBeInTheDocument();
      expect(await screen.findByText('Dashboard Protected Screen', {}, { timeout: 2000 })).toBeInTheDocument();
      view1.unmount();

      mockAuthService.getCurrentSession.mockResolvedValue(null);
      const view2 = renderApp(['/oauth/callback?oauth=success']);
      expect(await screen.findByText('Session Not Found')).toBeInTheDocument();
      view2.unmount();

      const view3 = renderApp(['/oauth/callback?oauth_error=Google%20sign-in%20was%20cancelled.']);
      expect(await screen.findByText('Authentication Interrupted')).toBeInTheDocument();
      expect(screen.getAllByText('Google sign-in was cancelled.').length).toBeGreaterThanOrEqual(1);
      view3.unmount();

      renderApp(['/auth?oauth_error=Google%20OAuth%20cancelled']);
      expect(await screen.findByRole('alert')).toHaveTextContent('Google OAuth cancelled');
    });
  });

  describe('2. Job Search, Multi-Filters, Pagination, Sorting & Closed/Invalid Jobs', () => {
    it('supports keyword search, zero-match empty state + reset, pagination, sorting, and combined FilterSheet filters including Experience', async () => {
      const user = userEvent.setup();
      const page1Jobs = [makeJob('1', { title: 'Frontend Lead', company: 'Vercel' })];
      const page2Jobs = [makeJob('2', { title: 'Principal Architect', company: 'Anthropic' })];

      mockJobService.searchJobsPage.mockImplementation(async (filters, page) => {
        if (filters.query === '@@@###$$$') {
          return { content: [], totalElements: 0, totalPages: 0, size: 6, number: 0 };
        }
        if (page === 1) {
          return { content: page2Jobs, totalElements: 8, totalPages: 2, size: 6, number: 1 };
        }
        return { content: page1Jobs, totalElements: 8, totalPages: 2, size: 6, number: 0 };
      });

      renderApp(['/jobs']);
      expect(await screen.findByText('Frontend Lead')).toBeInTheDocument();

      // Pagination Next -> page 1
      await user.click(screen.getByRole('button', { name: /Next/i }));
      expect(await screen.findByText('Principal Architect')).toBeInTheDocument();
      expect(mockJobService.searchJobsPage).toHaveBeenCalledWith(
        expect.anything(),
        1,
        6,
        expect.any(Array)
      );

      // Sorting
      await user.click(screen.getByRole('button', { name: /Sort:/i }));
      await user.click(screen.getByRole('button', { name: 'Highest Salary' }));
      await waitFor(() => {
        expect(mockJobService.searchJobsPage).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'Highest Salary' }),
          0,
          6,
          expect.any(Array)
        );
      });

      // Open FilterSheet and apply combined filters (Workplace + Employment + Experience + Salary + Tech)
      await user.click(screen.getByRole('button', { name: /Filters \(0\)/i }));
      await user.click(screen.getByRole('button', { name: 'Hybrid' }));
      await user.click(screen.getByRole('button', { name: 'Contract / C2C' }));
      await user.click(screen.getByRole('button', { name: 'Principal' }));
      fireEvent.change(screen.getByLabelText('Minimum Base Salary'), { target: { value: '180' } });
      await user.click(screen.getByRole('button', { name: 'TypeScript' }));

      await waitFor(() => {
        expect(mockJobService.searchJobsPage).toHaveBeenCalledWith(
          expect.objectContaining({
            workplace: 'Hybrid',
            employmentType: 'Contract / C2C',
            experience: 'Principal',
            minSalaryK: 180,
            techTag: 'TypeScript',
          }),
          0,
          6,
          expect.any(Array)
        );
      });
      await user.click(screen.getByRole('button', { name: /View .* Results/i }));

      // Special characters zero-match empty state + reset all filters
      const searchInput = screen.getByPlaceholderText(/Frontend Engineer, React, Apex Cloud/i);
      await user.type(searchInput, '@@@###$$$');
      expect(await screen.findByText('No matching roles found')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Reset All Filters/i }));
      expect(await screen.findByText('Frontend Lead')).toBeInTheDocument();
    });

    it('blocks applying to CLOSED jobs in JobDetailsPage and ApplyJobPage', async () => {
      const closedJob = makeJob('77', { status: 'CLOSED', title: 'Closed Staff Role' });
      mockJobService.listJobs.mockResolvedValue([closedJob]);
      mockJobService.getJobById.mockResolvedValue(closedJob);

      const detailsView = renderApp(['/jobs/77']);
      expect(await screen.findByText('Closed Staff Role')).toBeInTheDocument();
      expect(screen.getByText('Closed (CLOSED)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Applications Closed/i })).toBeDisabled();
      expect(screen.queryByRole('link', { name: /Apply Now/i })).not.toBeInTheDocument();
      detailsView.unmount();

      renderApp(['/apply/77']);
      expect(await screen.findByText('Applications Closed')).toBeInTheDocument();
    });
  });

  describe('3. Job Application Module — Double-Click, Concurrent Lock, Unmount & Validation', () => {
    it('prevents double-click duplicate submissions on ApplyJobPage and Quick Apply, and handles unmount mid-request', async () => {
      const user = userEvent.setup();
      mockAuthService.getCurrentSession.mockResolvedValue({
        isAuthenticated: true,
        isDemoMode: false,
        userId: '12',
        userEmail: 'qa@example.com',
        userName: 'QA Candidate',
        role: 'JOB_SEEKER',
        rememberMe: true,
      });

      let resolveSubmit!: (val: JobApplication) => void;
      mockApplicationService.submitApplication.mockImplementation(
        () =>
          new Promise<JobApplication>((resolve) => {
            resolveSubmit = resolve;
          })
      );

      const { unmount } = renderApp(['/apply/101']);
      expect(await screen.findByText('qa-saved-cv.pdf')).toBeInTheDocument();

      // Advance to step 2 without optional cover letter
      await user.click(screen.getByRole('button', { name: /Review & Submit Application/i }));
      expect(await screen.findByText('Confirm Application Packet')).toBeInTheDocument();

      // Double-click Confirm & Submit Now synchronously before promise settles
      const submitBtn = screen.getByRole('button', { name: /Confirm & Submit Now/i });
      fireEvent.click(submitBtn);
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockApplicationService.submitApplication).toHaveBeenCalledTimes(1);
      });
      expect(screen.getByRole('button', { name: /Submitting.../i })).toBeDisabled();

      // Simulate navigating away / unmounting while request is still in-flight
      unmount();
      resolveSubmit({
        id: '900',
        jobId: '101',
        jobTitle: sampleJob.title,
        company: sampleJob.company,
        companyLogo: '',
        location: sampleJob.location,
        salaryRange: '$190k',
        status: 'in-review',
        stageBadge: 'APPLIED',
        stageNumber: 1,
        totalStages: 4,
        stageSteps: ['Applied', 'Review', 'Shortlisted', 'Hired'],
        appliedAgo: 'Just now',
        resumeUsed: 'qa-saved-cv.pdf',
      });
    });

    it('surfaces resume upload size/format rejection and submission API errors inline without losing form state', async () => {
      const user = userEvent.setup();
      mockAuthService.getCurrentSession.mockResolvedValue({
        isAuthenticated: true,
        isDemoMode: false,
        userId: '12',
        userEmail: 'qa@example.com',
        userName: 'QA Candidate',
        role: 'JOB_SEEKER',
        rememberMe: true,
      });
      mockResumeService.uploadResume.mockRejectedValueOnce(
        new ApiError({
          message: 'Uploaded file exceeds the maximum allowed size of 10MB.',
          status: 413,
          code: 'FILE_TOO_LARGE',
        })
      );
      mockApplicationService.submitApplication.mockRejectedValueOnce(
        new ApiError({
          message: 'This job listing is no longer accepting applications',
          status: 400,
          code: 'BAD_REQUEST',
        })
      );

      renderApp(['/apply/101']);
      expect(await screen.findByText('qa-saved-cv.pdf')).toBeInTheDocument();

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const bigFile = new File(['%PDF-1.4 oversized'], 'huge-cv.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [bigFile] } });

      expect(
        await screen.findByText('Uploaded file exceeds the maximum allowed size of 10MB.')
      ).toBeInTheDocument();
      // Saved resume remains intact
      expect(screen.getByText('qa-saved-cv.pdf')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Review & Submit Application/i }));
      await user.click(screen.getByRole('button', { name: /Confirm & Submit Now/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'This job listing is no longer accepting applications'
      );
      expect(screen.getByRole('button', { name: /Confirm & Submit Now/i })).toBeEnabled();
    });
  });

  describe('4. My Applications — All Implemented Statuses, Filtering, Search, Sorting & Export', () => {
    it('maps all 5 backend ApplicationStatus enum values and supports tabs, search, sort, and CSV export', async () => {
      const user = userEvent.setup();
      mockAuthService.getCurrentSession.mockResolvedValue({
        isAuthenticated: true,
        isDemoMode: false,
        userId: '12',
        userEmail: 'qa@example.com',
        userName: 'QA Candidate',
        role: 'JOB_SEEKER',
        rememberMe: true,
      });

      const mappedApps = [
        mapSpringApplication({
          id: 1,
          jobId: 10,
          jobTitle: 'Alpha Applied Role',
          company: 'AlphaCo',
          location: 'Remote',
          salary: '$150k',
          status: 'APPLIED',
          resumeFileName: 'cv.pdf',
        }),
        mapSpringApplication({
          id: 2,
          jobId: 11,
          jobTitle: 'Beta Review Role',
          company: 'BetaCo',
          location: 'NYC',
          salary: '$165k',
          status: 'UNDER_REVIEW',
          resumeFileName: 'cv.pdf',
        }),
        mapSpringApplication({
          id: 3,
          jobId: 12,
          jobTitle: 'Gamma Shortlisted Role',
          company: 'GammaCo',
          location: 'SF',
          salary: '$185k',
          status: 'SHORTLISTED',
          resumeFileName: 'cv.pdf',
        }),
        mapSpringApplication({
          id: 4,
          jobId: 13,
          jobTitle: 'Delta Hired Role',
          company: 'DeltaCo',
          location: 'Austin',
          salary: '$210k',
          status: 'HIRED',
          resumeFileName: 'cv.pdf',
        }),
        mapSpringApplication({
          id: 5,
          jobId: 14,
          jobTitle: 'Epsilon Rejected Role',
          company: 'EpsilonCo',
          location: 'Boston',
          salary: '$140k',
          status: 'REJECTED',
          resumeFileName: 'cv.pdf',
        }),
      ];

      mockApplicationService.listApplications.mockResolvedValue(mappedApps);

      if (!URL.createObjectURL) {
        Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock'), writable: true });
      }
      if (!URL.revokeObjectURL) {
        Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
      }
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

      renderApp(['/applications']);

      expect(await screen.findByText('Alpha Applied Role')).toBeInTheDocument();
      expect(screen.getByText('Beta Review Role')).toBeInTheDocument();
      expect(screen.getByText('Gamma Shortlisted Role')).toBeInTheDocument();
      expect(screen.getAllByText('Delta Hired Role').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Epsilon Rejected Role')).toBeInTheDocument();

      // Filter by Interviewing (SHORTLISTED)
      await user.click(screen.getByRole('button', { name: /Interviewing/i }));
      expect(screen.getByText('Gamma Shortlisted Role')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Applied Role')).not.toBeInTheDocument();

      // Filter by Archived (REJECTED)
      await user.click(screen.getByRole('button', { name: /Archived/i }));
      expect(screen.getByText('Epsilon Rejected Role')).toBeInTheDocument();
      expect(screen.queryByText('Gamma Shortlisted Role')).not.toBeInTheDocument();

      // Back to All and search by company/stage
      await user.click(screen.getByRole('button', { name: /^All/i }));
      const searchBox = screen.getByPlaceholderText(/Filter by company, role, or stage/i);
      await user.type(searchBox, 'BetaCo');
      expect(screen.getByText('Beta Review Role')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Applied Role')).not.toBeInTheDocument();

      // Clear search and test Sort + CSV Export
      await user.clear(searchBox);
      await user.click(screen.getByRole('button', { name: /Sort/i }));
      expect(await screen.findByText('Sorted oldest first')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Export Applications/i }));
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('Applications exported as CSV')).toBeInTheDocument();
      clickSpy.mockRestore();
    });
  });
});
