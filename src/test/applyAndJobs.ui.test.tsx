import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import { FindJobsPage } from '../pages/FindJobsPage';
import { JobDetailsPage } from '../pages/JobDetailsPage';
import { ApplyJobPage } from '../pages/ApplyJobPage';
import { PostUrgentRoleModal } from '../components/modals/PostUrgentRoleModal';

function makeJob(id: string, title = 'Principal Platform Engineer', company = 'NovaLabs'): JobPosting {
  return {
    id,
    title,
    company,
    companyTagline: 'Verified AI Infrastructure',
    companySize: '120 employees',
    verified: true,
    location: 'Remote - US',
    workplace: 'Remote',
    employmentType: 'Full-time',
    experienceLevel: 'Senior Level',
    yearsRequired: '5+ Years Required',
    salaryDisplay: '$195,000 - $230,000 / yr',
    minSalaryK: 195,
    maxSalaryK: 230,
    matchScore: 95,
    sector: 'Engineering',
    tags: ['React', 'TypeScript'],
    postedAgo: 'Just now',
    applicantsCount: 4,
    urgencyLabel: '4 applicants • Full-time',
    urgencyTone: 'tertiary',
    aboutRole: [`Lead frontend architecture at ${company}.`],
    responsibilities: [
      { icon: 'code', title: 'Ship core UI', description: 'Deliver high reliability systems.' },
    ],
    requirements: ['5+ years React & TypeScript'],
    perks: [{ icon: 'payments', title: 'Equity', subtitle: 'Competitive stock options' }],
    hiringManager: {
      name: 'Marcus Vance',
      role: 'VP Engineering',
      avatar: '',
      status: 'Active',
      responseTime: '~24h',
      quote: 'Join us!',
    },
    officeImage: '',
  };
}

function renderWithApp(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppProvider>
        <Toast />
        <Routes>
          <Route path="/auth" element={<div>Auth Sign In Route</div>} />
          <Route path="/jobs" element={<FindJobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailsPage />} />
          <Route path="/apply/:id" element={<ApplyJobPage />} />
          <Route path="/applications" element={<div>My Applications Route</div>} />
        </Routes>
      </AppProvider>
    </MemoryRouter>
  );
}

describe('FindJobs, JobDetails, ApplyJob, QuickApply & PostUrgentRoleModal UI', () => {
  const sampleJob = makeJob('88', 'Founding Frontend Architect', 'OrbitAI');

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.restoreSessionFromToken.mockReturnValue(null);
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
      fullName: 'Real Candidate',
      email: 'real@example.com',
      resumes: [],
    });
  });

  it('defaults FindJobsPage to Filters (0) and Latest Added, and redirects unauthenticated Quick Apply to /auth', async () => {
    const user = userEvent.setup();
    mockAuthService.getCurrentSession.mockResolvedValue(null);

    renderWithApp(['/jobs']);

    expect(await screen.findByText('Founding Frontend Architect')).toBeInTheDocument();
    expect(screen.getByText('Filters (0)')).toBeInTheDocument();
    expect(screen.getByText('Latest Added')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Quick Apply/i }));

    expect(mockApplicationService.submitApplication).not.toHaveBeenCalled();
    expect(await screen.findByText('Auth Sign In Route')).toBeInTheDocument();
  });

  it('submits authenticated Quick Apply with 0 resumes (fallback to profile) and updates to Applied', async () => {
    const user = userEvent.setup();
    mockAuthService.getCurrentSession.mockResolvedValue({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '12',
      userEmail: 'real@example.com',
      userName: 'Real Candidate',
      role: 'JOB_SEEKER',
      rememberMe: true,
    });
    mockApplicationService.submitApplication.mockResolvedValueOnce({
      id: '501',
      jobId: '88',
      jobTitle: 'Founding Frontend Architect',
      company: 'OrbitAI',
      companyLogo: '',
      location: 'Remote - US',
      salaryRange: '$195,000 - $230,000',
      status: 'in-review',
      stageBadge: 'APPLIED',
      stageNumber: 1,
      totalStages: 4,
      stageSteps: ['Applied', 'Review', 'Shortlisted', 'Hired'],
      appliedAgo: 'Just now',
      resumeUsed: 'Profile Application',
    });

    renderWithApp(['/jobs']);
    expect(await screen.findByText('Founding Frontend Architect')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Quick Apply/i }));

    await waitFor(() => {
      expect(mockApplicationService.submitApplication).toHaveBeenCalledWith(
        expect.objectContaining({ id: '88' }),
        expect.objectContaining({ resumeId: '' }),
        'Profile Application'
      );
    });

    expect(await screen.findByRole('button', { name: /Applied/i })).toBeInTheDocument();
  });

  it('handles 409 duplicate Quick Apply gracefully by refreshing applications', async () => {
    const user = userEvent.setup();
    mockAuthService.getCurrentSession.mockResolvedValue({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '12',
      userEmail: 'real@example.com',
      userName: 'Real Candidate',
      role: 'JOB_SEEKER',
      rememberMe: true,
    });
    mockApplicationService.submitApplication.mockRejectedValueOnce(
      new ApiError({ message: 'You have already applied to this job', status: 409, code: 'CONFLICT' })
    );
    mockApplicationService.listApplications
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: '501',
          jobId: '88',
          jobTitle: 'Founding Frontend Architect',
          company: 'OrbitAI',
          companyLogo: '',
          location: 'Remote - US',
          salaryRange: '$195k',
          status: 'in-review',
          stageBadge: 'APPLIED',
          stageNumber: 1,
          totalStages: 4,
          stageSteps: ['Applied', 'Review', 'Shortlisted', 'Hired'],
          appliedAgo: 'Just now',
          resumeUsed: 'Profile Application',
        },
      ]);

    renderWithApp(['/jobs']);
    expect(await screen.findByText('Founding Frontend Architect')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Quick Apply/i }));

    expect(await screen.findByText(/Already applied to OrbitAI/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Applied/i })).toBeInTheDocument();
  });

  it('fetches new job ID via getJobById on JobDetailsPage and shows not-found for unknown IDs', async () => {
    mockAuthService.getCurrentSession.mockResolvedValue(null);
    mockJobService.listJobs.mockResolvedValue([]);
    const distantJob = makeJob('999', 'Staff Security Architect', 'ShieldCorp');
    mockJobService.getJobById.mockResolvedValueOnce(distantJob);

    renderWithApp(['/jobs/999']);
    expect(await screen.findByText('Staff Security Architect')).toBeInTheDocument();
    expect(mockJobService.getJobById).toHaveBeenCalledWith('999', expect.any(Array));

    mockJobService.getJobById.mockResolvedValueOnce(undefined);
    renderWithApp(['/jobs/40404']);
    expect(await screen.findByText('Job listing not found')).toBeInTheDocument();
  });

  it('walks through 3-step ApplyJobPage including inline PDF resume upload and consent validation', async () => {
    const user = userEvent.setup();
    mockAuthService.getCurrentSession.mockResolvedValue({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '12',
      userEmail: 'real@example.com',
      userName: 'Real Candidate',
      role: 'JOB_SEEKER',
      rememberMe: true,
    });
    mockResumeService.uploadResume.mockResolvedValueOnce({
      id: '777',
      fileName: 'tailored-orbit.pdf',
      fileSize: '0.5 MB',
      uploadedAt: 'Uploaded just now',
      isDefault: true,
      label: 'Default 1-Click',
    });
    mockApplicationService.submitApplication.mockResolvedValueOnce({
      id: '601',
      jobId: '88',
      jobTitle: 'Founding Frontend Architect',
      company: 'OrbitAI',
      companyLogo: '',
      location: 'Remote - US',
      salaryRange: '$195k',
      status: 'in-review',
      stageBadge: 'APPLIED',
      stageNumber: 1,
      totalStages: 4,
      stageSteps: ['Applied', 'Review', 'Shortlisted', 'Hired'],
      appliedAgo: 'Just now',
      resumeUsed: 'tailored-orbit.pdf',
    });

    renderWithApp(['/apply/88']);
    expect(await screen.findByText('No resume attached yet (Optional)')).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdf = new File(['%PDF-1.4 content'], 'tailored-orbit.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [pdf] } });

    expect(await screen.findByText('tailored-orbit.pdf')).toBeInTheDocument();

    // Unchecking consent blocks proceeding to step 2
    const consent = screen.getByRole('checkbox');
    await user.click(consent);
    await user.click(screen.getByRole('button', { name: /Review & Submit Application/i }));
    expect(
      await screen.findByText('Please accept the data processing consent checkbox')
    ).toBeInTheDocument();
    expect(screen.queryByText('Confirm Application Packet')).not.toBeInTheDocument();

    await user.click(consent);
    await user.click(screen.getByRole('button', { name: /Review & Submit Application/i }));

    expect(await screen.findByText('Confirm Application Packet')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Confirm & Submit Now/i }));

    await waitFor(() => {
      expect(mockApplicationService.submitApplication).toHaveBeenCalledWith(
        expect.objectContaining({ id: '88' }),
        expect.objectContaining({ resumeId: '777' }),
        'tailored-orbit.pdf'
      );
    });
    expect(await screen.findByText('Application Sent to OrbitAI!')).toBeInTheDocument();
  });

  it('PostUrgentRoleModal submits new role and keeps modal open with reset button if submission fails', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new Error('403 Forbidden'))
      .mockResolvedValueOnce(undefined);

    render(<PostUrgentRoleModal onClose={onClose} onSubmit={onSubmit} open />);

    await user.type(screen.getByPlaceholderText(/Principal AI Systems Engineer/i), 'Staff ML Ops');
    await user.type(screen.getByPlaceholderText(/Anthropic/i), 'ScaleAI');
    await user.click(screen.getByRole('button', { name: /Publish Role Now/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Publish Role Now/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /Publish Role Now/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
