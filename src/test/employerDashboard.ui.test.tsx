import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_PROFILE } from '../data/mockData';
import { ApiError } from '../types/api';
import { JobPosting } from '../types';

const {
  mockAuthService,
  mockJobService,
  mockApplicationService,
  mockResumeService,
  mockUserService,
  mockAdminService,
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
    listMyPostedJobs: vi.fn(),
    createJob: vi.fn(),
    updateJob: vi.fn(),
    updateJobStatus: vi.fn(),
    deleteJob: vi.fn(),
    toggleBookmark: vi.fn(),
  },
  mockApplicationService: {
    listApplications: vi.fn(),
    getApplicationById: vi.fn(),
    submitApplication: vi.fn(),
    withdrawApplication: vi.fn(),
    respondToOffer: vi.fn(),
    listJobApplications: vi.fn(),
    updateApplicationStatus: vi.fn(),
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
}));

vi.mock('../services', () => ({
  IS_MOCK_MODE: false,
  API_BASE_URL: 'https://job-a5po.onrender.com/api',
  BACKEND_ORIGIN: 'https://job-a5po.onrender.com',
  setUnauthorizedHandler: vi.fn(),
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
import { EmployerDashboardPage } from '../pages/EmployerDashboardPage';

const samplePostedJob: JobPosting = {
  id: '501',
  title: 'Principal Distributed Systems Engineer',
  company: 'Acme Cloud Inc.',
  verified: true,
  location: 'San Francisco / Remote',
  workplace: 'Remote',
  employmentType: 'Full-time',
  experienceLevel: 'Principal',
  yearsRequired: '8+ yrs',
  salaryDisplay: '$210k - $250k',
  minSalaryK: 210,
  maxSalaryK: 250,
  matchScore: 95,
  sector: 'Engineering',
  tags: ['Java', 'Spring Boot', 'Kafka'],
  postedAgo: 'Just now',
  applicantsCount: 1,
  urgencyLabel: '1 applicants • Full-time',
  status: 'OPEN',
  aboutRole: ['Build multi-region distributed infrastructure.'],
  responsibilities: [],
  requirements: ['8+ years Java & distributed systems experience'],
  perks: [],
  hiringManager: {
    name: 'Morgan Poster',
    role: 'Hiring Manager',
    avatar: '',
    status: 'Active',
    responseTime: '24h',
    quote: '',
  },
};

function renderEmployerDashboard() {
  return render(
    <MemoryRouter initialEntries={['/employer/dashboard']}>
      <AppProvider>
        <Toast />
        <Routes>
          <Route
            path="/employer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}>
                <EmployerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<div>Auth Screen</div>} />
          <Route path="/jobs" element={<div>Job Board Screen</div>} />
          <Route path="/profile" element={<div>Account Screen</div>} />
        </Routes>
      </AppProvider>
    </MemoryRouter>
  );
}

describe('EmployerDashboardPage UI workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.restoreSessionFromToken.mockReturnValue(null);
    mockAuthService.getCurrentSession.mockResolvedValue({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '77',
      userEmail: 'hiring@acmecloud.dev',
      userName: 'Morgan Poster',
      companyName: 'Acme Cloud Inc.',
      role: 'EMPLOYER',
      rememberMe: true,
    });
    mockJobService.listJobs.mockResolvedValue([samplePostedJob]);
    mockJobService.listMyPostedJobs.mockResolvedValue([samplePostedJob]);
    mockUserService.getCurrentProfile.mockResolvedValue({
      ...INITIAL_PROFILE,
      fullName: 'Morgan Poster',
      email: 'hiring@acmecloud.dev',
      companyName: 'Acme Cloud Inc.',
      resumes: [],
    });
    mockApplicationService.listJobApplications.mockResolvedValue([
      {
        id: '9001',
        applicantName: 'Elena Candidate',
        applicantEmail: 'elena@candidate.dev',
        jobId: '501',
        jobTitle: 'Principal Distributed Systems Engineer',
        company: 'Acme Cloud Inc.',
        location: 'San Francisco / Remote',
        salary: '$210k - $250k',
        resumeId: '44',
        resumeFileName: 'elena-cv.pdf',
        coverLetter: 'Excited to lead distributed systems architecture.',
        experienceYears: '9 yrs',
        noticePeriod: '2 Weeks',
        status: 'APPLIED',
        appliedAt: '2026-11-24T00:00:00Z',
      },
    ]);
  });

  it('loads posted jobs, shows incoming applicants, updates stage, downloads resume, and manages job status/deletion', async () => {
    const user = userEvent.setup();
    mockApplicationService.updateApplicationStatus.mockResolvedValueOnce({
      id: '9001',
      jobId: '501',
      jobTitle: 'Principal Distributed Systems Engineer',
      company: 'Acme Cloud Inc.',
      location: 'San Francisco / Remote',
      salary: '$210k - $250k',
      status: 'SHORTLISTED',
    });
    mockResumeService.downloadResume.mockResolvedValueOnce(undefined);
    mockJobService.updateJobStatus.mockResolvedValueOnce({
      ...samplePostedJob,
      status: 'CLOSED',
    });
    mockJobService.deleteJob.mockResolvedValueOnce(undefined);

    renderEmployerDashboard();

    // Job poster navigation renders Admin (Job Poster) Dashboard instead of My Applications
    expect(await screen.findByRole('heading', { name: 'Admin (Job Poster) Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /My Applications/i })).not.toBeInTheDocument();

    // Auto-selected posted job & incoming applicant displayed
    expect(await screen.findByText('Principal Distributed Systems Engineer')).toBeInTheDocument();
    expect(await screen.findByText('Elena Candidate')).toBeInTheDocument();
    expect(screen.getByText(/Excited to lead distributed systems architecture/i)).toBeInTheDocument();

    // Download applicant resume
    await user.click(screen.getByRole('button', { name: /elena-cv\.pdf/i }));
    expect(mockResumeService.downloadResume).toHaveBeenCalledWith('44', 'elena-cv.pdf');

    // Move applicant stage to SHORTLISTED
    const stageSelect = screen.getByLabelText('Pipeline status for Elena Candidate');
    await user.selectOptions(stageSelect, 'SHORTLISTED');
    await waitFor(() => {
      expect(mockApplicationService.updateApplicationStatus).toHaveBeenCalledWith(
        '9001',
        'SHORTLISTED'
      );
    });
    expect(await screen.findByText('SHORTLISTED')).toBeInTheDocument();

    // Close posted job
    await user.click(screen.getByRole('button', { name: /^Close$/i }));
    await waitFor(() => {
      expect(mockJobService.updateJobStatus).toHaveBeenCalledWith('501', 'CLOSED');
    });
    expect(await screen.findByText('CLOSED')).toBeInTheDocument();

    // Delete posted job via 2-step inline confirmation
    await user.click(
      screen.getByRole('button', { name: /Delete Principal Distributed Systems Engineer/i })
    );
    await user.click(screen.getByRole('button', { name: /^Confirm$/i }));
    await waitFor(() => {
      expect(mockJobService.deleteJob).toHaveBeenCalledWith('501');
    });
    expect(await screen.findByText('No jobs posted yet')).toBeInTheDocument();
  });

  it('publishes a new job posting through the Post New Job modal', async () => {
    const user = userEvent.setup();
    const createdJob: JobPosting = {
      ...samplePostedJob,
      id: '502',
      title: 'Staff Security Architect',
      applicantsCount: 0,
      salaryDisplay: '$195k - $230k',
    };
    mockJobService.createJob.mockResolvedValueOnce(createdJob);
    mockApplicationService.listJobApplications.mockResolvedValue([]);

    renderEmployerDashboard();
    await screen.findByRole('heading', { name: 'Admin (Job Poster) Dashboard' });

    await user.click(screen.getByRole('button', { name: /Post New Job/i }));

    await user.type(screen.getByPlaceholderText('Senior Platform Engineer'), 'Staff Security Architect');
    await user.type(
      screen.getByPlaceholderText(/Describe the team mission/i),
      'Own zero-trust cloud security and threat modeling.'
    );
    await user.type(
      screen.getByPlaceholderText(/5\+ years building distributed services/i),
      '6+ years application & infrastructure security'
    );

    await user.click(screen.getByRole('button', { name: /Publish Job/i }));

    await waitFor(() => {
      expect(mockJobService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Staff Security Architect',
          company: 'Acme Cloud Inc.',
          description: 'Own zero-trust cloud security and threat modeling.',
        })
      );
    });

    expect(await screen.findByText('Staff Security Architect')).toBeInTheDocument();
  });
});
