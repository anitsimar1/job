import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_PROFILE } from '../data/mockData';
import { ApiError } from '../types/api';

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
import { ProfileResumePage } from '../pages/ProfileResumePage';
import { MyApplicationsPage } from '../pages/MyApplicationsPage';

function renderPage(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AppProvider>
        <Toast />
        <Routes>
          <Route path="/profile" element={<ProfileResumePage />} />
          <Route path="/applications" element={<MyApplicationsPage />} />
          <Route path="/jobs/:id" element={<div>Job Detail Route</div>} />
        </Routes>
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Resume management, Application withdrawal & Offer acceptance UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockAuthService.restoreSessionFromToken.mockReturnValue(null);
    mockAuthService.getCurrentSession.mockResolvedValue({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '12',
      userEmail: 'candidate@jobconnect.dev',
      userName: 'Elena Candidate',
      role: 'JOB_SEEKER',
      rememberMe: true,
    });
    mockJobService.listJobs.mockResolvedValue([]);
    mockUserService.getCurrentProfile.mockResolvedValue({
      ...INITIAL_PROFILE,
      fullName: 'Elena Candidate',
      email: 'candidate@jobconnect.dev',
      resumes: [
        {
          id: '10',
          fileName: 'elena-primary.pdf',
          fileSize: '0.6 MB',
          uploadedAt: 'Uploaded 11/10/2026',
          isDefault: true,
          label: 'Default 1-Click',
          atsScore: 95,
        },
        {
          id: '11',
          fileName: 'elena-backend.pdf',
          fileSize: '0.4 MB',
          uploadedAt: 'Uploaded 11/12/2026',
          isDefault: false,
          label: 'Tailored CV',
          atsScore: 91,
        },
      ],
    });
    mockApplicationService.listApplications.mockResolvedValue([
      {
        id: '301',
        jobId: '50',
        jobTitle: 'Staff UI Architect',
        company: 'Vercel',
        companyLogo: '',
        location: 'Remote',
        salaryRange: '$210k - $250k',
        status: 'offered',
        stageBadge: 'HIRED',
        stageNumber: 4,
        totalStages: 4,
        stageSteps: ['Applied', 'Review', 'Shortlisted', 'Hired'],
        appliedAgo: '2d ago',
        resumeUsed: 'elena-primary.pdf',
      },
      {
        id: '302',
        jobId: '51',
        jobTitle: 'Senior Frontend Engineer',
        company: 'Linear',
        companyLogo: '',
        location: 'San Francisco',
        salaryRange: '$185k',
        status: 'in-review',
        stageBadge: 'APPLIED',
        stageNumber: 1,
        totalStages: 4,
        stageSteps: ['Applied', 'Review', 'Shortlisted', 'Hired'],
        appliedAgo: 'Just now',
        resumeUsed: 'elena-backend.pdf',
      },
    ]);
  });

  it('uploads, sets default, downloads, and deletes resumes with last-resume guard on ProfileResumePage', async () => {
    const user = userEvent.setup();
    mockResumeService.uploadResume.mockResolvedValueOnce({
      id: '12',
      fileName: 'elena-2026-final.pdf',
      fileSize: '0.7 MB',
      uploadedAt: 'Uploaded just now',
      isDefault: false,
      label: 'Tailored CV',
      atsScore: 93,
    });
    mockResumeService.setDefaultResume.mockResolvedValue(undefined);
    mockResumeService.downloadResume.mockResolvedValue(undefined);
    mockResumeService.deleteResume.mockResolvedValue(undefined);

    renderPage('/profile');

    expect(await screen.findByText('elena-primary.pdf')).toBeInTheDocument();
    expect(screen.getByText('elena-backend.pdf')).toBeInTheDocument();

    // Upload a new CV
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const resumeFileInput = fileInputs[1] as HTMLInputElement;
    const newPdf = new File(['%PDF-1.4 updated'], 'elena-2026-final.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(resumeFileInput, { target: { files: [newPdf] } });

    expect(await screen.findByText('elena-2026-final.pdf')).toBeInTheDocument();
    expect(mockResumeService.uploadResume).toHaveBeenCalledWith(newPdf);

    // Download primary resume
    await user.click(screen.getByTitle('Download Resume'));
    expect(mockResumeService.downloadResume).toHaveBeenCalledWith('10', 'elena-primary.pdf');

    // Set secondary resume as default
    const setDefaultBtns = screen.getAllByRole('button', { name: /Set as Default/i });
    await user.click(setDefaultBtns[0]);
    expect(mockResumeService.setDefaultResume).toHaveBeenCalled();

    // Delete secondary resumes until only 1 remains, then confirm guard blocks deleting the last one
    await user.click(screen.getAllByTitle('Delete')[0]);
    await waitFor(() => {
      expect(mockResumeService.deleteResume).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getAllByTitle('Delete')[0]);
    await waitFor(() => {
      expect(mockResumeService.deleteResume).toHaveBeenCalledTimes(2);
    });

    await user.click(screen.getByTitle('Delete Resume'));
    expect(await screen.findByText('At least one active resume is required')).toBeInTheDocument();
    expect(mockResumeService.deleteResume).toHaveBeenCalledTimes(2);
  });

  it('withdraws in-review application and accepts HIRED offer on MyApplicationsPage', async () => {
    const user = userEvent.setup();
    mockApplicationService.withdrawApplication.mockResolvedValueOnce(undefined);
    mockApplicationService.respondToOffer.mockResolvedValueOnce({
      offerId: 'app-301',
      status: 'accepted',
      applicationId: 301,
    });

    renderPage('/applications');

    expect(await screen.findAllByText('Staff UI Architect')).not.toHaveLength(0);
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();

    // Withdraw Linear application
    await user.click(screen.getByRole('button', { name: /Withdraw/i }));
    await waitFor(() => {
      expect(mockApplicationService.withdrawApplication).toHaveBeenCalledWith('302');
    });
    expect(await screen.findByText('Withdrawn by Candidate')).toBeInTheDocument();

    // Review Offer on HIRED Vercel application
    const reviewButtons = screen.getAllByRole('button', { name: /Review Offer/i });
    await user.click(reviewButtons[0]);

    expect(await screen.findByText('Official Offer Letter')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Accept Offer/i }));

    await waitFor(() => {
      expect(mockApplicationService.respondToOffer).toHaveBeenCalledWith('app-301', 'accepted');
    });

    expect(await screen.findAllByText('Offer Accepted')).not.toHaveLength(0);
    expect(screen.queryByText('Official Offer Letter')).not.toBeInTheDocument();

    // Decision persisted to localStorage for this user
    const saved = window.localStorage.getItem('jobconnect_offer_decisions_candidate@jobconnect.dev');
    expect(saved).toContain('accepted');
  });

  it('keeps OfferReviewModal open on backend error and closes cleanly when Declined', async () => {
    const user = userEvent.setup();
    mockApplicationService.respondToOffer
      .mockRejectedValueOnce(new ApiError({ message: 'Server unavailable', status: 503, code: '503' }))
      .mockResolvedValueOnce({
        offerId: 'app-301',
        status: 'declined',
        applicationId: 301,
      });

    renderPage('/applications');
    expect(await screen.findAllByText('Staff UI Architect')).not.toHaveLength(0);

    await user.click(screen.getAllByRole('button', { name: /Review Offer/i })[0]);
    expect(await screen.findByText('Official Offer Letter')).toBeInTheDocument();

    // First click fails -> modal stays open so user can retry
    await user.click(screen.getByRole('button', { name: /Decline Offer/i }));
    expect(await screen.findByText('Server unavailable')).toBeInTheDocument();
    expect(screen.getByText('Official Offer Letter')).toBeInTheDocument();

    // Retry succeeds -> updates badge to Offer Declined
    await user.click(screen.getByRole('button', { name: /Decline Offer/i }));
    await waitFor(() => {
      expect(mockApplicationService.respondToOffer).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findAllByText('Offer Declined')).not.toHaveLength(0);
  });

  it('allows selecting Target Roles and Work Arrangements in Target Career Preferences and persists via updateProfile', async () => {
    const user = userEvent.setup();
    mockUserService.updateProfile.mockImplementation(async (updated) => updated);

    renderPage('/profile');
    expect(await screen.findByText('Target Career Preferences')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Edit Target Career Preferences/i }));

    const productDesignerBtn = screen.getByRole('button', { name: /Product Designer/i });
    const hybridBtn = screen.getByRole('button', { name: /^Hybrid$/i });

    expect(productDesignerBtn).toHaveAttribute('aria-pressed', 'false');
    await user.click(productDesignerBtn);
    await user.click(hybridBtn);
    expect(productDesignerBtn).toHaveAttribute('aria-pressed', 'true');
    expect(hybridBtn).toHaveAttribute('aria-pressed', 'true');

    await user.type(screen.getByLabelText('Add custom target role'), 'AI Architect');
    await user.click(screen.getByRole('button', { name: /^Add$/i }));

    await user.click(screen.getByRole('button', { name: /Save Preferences/i }));

    await waitFor(() => {
      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          targetRoles: expect.arrayContaining(['Product Designer', 'AI Architect']),
          workArrangements: expect.arrayContaining(['Hybrid']),
        })
      );
    });

    expect(await screen.findByText('AI Architect')).toBeInTheDocument();
  });

  it('shows Sign In next to notifications when logged out and shows user-set profile photo after login', async () => {
    // 1. Logged out -> header displays Sign In link instead of any avatar photo
    mockAuthService.getCurrentSession.mockResolvedValueOnce(null);
    const guestView = render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppProvider>
          <Toast />
          <Routes>
            <Route path="/profile" element={<ProfileResumePage />} />
            <Route path="/auth" element={<div>Auth Route</div>} />
          </Routes>
        </AppProvider>
      </MemoryRouter>
    );

    const signInLink = await screen.findByRole('link', { name: /^Sign In$/i });
    const guestActionsBar = screen.getByRole('button', { name: 'Notifications' }).parentElement!;
    expect(within(guestActionsBar).getByRole('link', { name: /^Sign In$/i })).toBe(signInLink);
    expect(signInLink).toHaveAttribute('href', '/auth');
    expect(within(guestActionsBar).queryByRole('img')).not.toBeInTheDocument();
    guestView.unmount();

    // 2. Logged in with user-set profile photo -> header renders that exact photo next to notifications
    const customPhotoUrl = 'https://cdn.example.com/elena-custom-avatar.png';
    mockAuthService.getCurrentSession.mockResolvedValueOnce({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '12',
      userEmail: 'candidate@jobconnect.dev',
      userName: 'Elena Candidate',
      profileImage: customPhotoUrl,
      role: 'JOB_SEEKER',
      rememberMe: true,
    });
    mockUserService.getCurrentProfile.mockResolvedValueOnce({
      ...INITIAL_PROFILE,
      fullName: 'Elena Candidate',
      email: 'candidate@jobconnect.dev',
      avatar: customPhotoUrl,
      resumes: [],
    });

    renderPage('/profile');

    const authActionsBar = (await screen.findByRole('button', { name: 'Notifications' })).parentElement!;
    await waitFor(() => {
      const headerImg = within(authActionsBar).getByRole('img');
      expect(headerImg).toHaveAttribute('src', customPhotoUrl);
    });
    expect(within(authActionsBar).queryByRole('link', { name: /^Sign In$/i })).not.toBeInTheDocument();
  });
});
