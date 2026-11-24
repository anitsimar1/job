import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_PROFILE } from '../data/mockData';
import { AuthSession } from '../types';

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
  normalizeApiError: (err: unknown) =>
    err instanceof Error ? err : new Error(String((err as { message?: string })?.message || err)),
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
import { browserContext } from '../utils/browserContext';

function renderWithRouter(initialEntries: string[] = ['/auth']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppProvider>
        <Toast />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['JOB_SEEKER', 'ADMIN']}>
                <div>Candidate Dashboard Screen</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}>
                <div>Job Poster Dashboard Screen</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={['JOB_SEEKER', 'ADMIN']}>
                <div>Applications Pipeline Screen</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <div>Admin Console Screen</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AppProvider>
    </MemoryRouter>
  );
}

describe('AuthPage & ProtectedRoute UI flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.restoreSessionFromToken.mockReturnValue(null);
    mockAuthService.getCurrentSession.mockResolvedValue(null);
    mockJobService.listJobs.mockResolvedValue([]);
    mockUserService.getCurrentProfile.mockResolvedValue({ ...INITIAL_PROFILE, resumes: [] });
    mockApplicationService.listApplications.mockResolvedValue([]);
  });

  it('redirects unauthenticated users from protected routes to /auth', async () => {
    renderWithRouter(['/applications']);

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
    expect(screen.queryByText('Applications Pipeline Screen')).not.toBeInTheDocument();
  });

  it('validates email and password before calling login API', async () => {
    renderWithRouter(['/auth']);
    await screen.findByText('Welcome back');

    const form = screen.getByRole('button', { name: /Sign In to JobConnect/i }).closest('form')!;
    fireEvent.change(screen.getByPlaceholderText('name@company.com'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
      target: { value: '12345678' },
    });
    fireEvent.submit(form);

    expect(
      await screen.findByText('Please enter a valid work email address.')
    ).toBeInTheDocument();
    expect(mockAuthService.login).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('name@company.com'), {
      target: { value: 'candidate@company.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
      target: { value: 'short' },
    });
    fireEvent.submit(form);

    expect(
      await screen.findByText('Password must be at least 8 characters long.')
    ).toBeInTheDocument();
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('signs in with valid credentials and redirects to /dashboard', async () => {
    const user = userEvent.setup();
    const session: AuthSession = {
      isAuthenticated: true,
      isDemoMode: false,
      userId: '10',
      userEmail: 'alex@company.com',
      userName: 'Alex Vance',
      role: 'JOB_SEEKER',
      rememberMe: true,
    };
    mockAuthService.login.mockResolvedValueOnce(session);

    renderWithRouter(['/auth']);
    await screen.findByText('Welcome back');

    await user.type(screen.getByPlaceholderText('name@company.com'), 'alex@company.com');
    await user.type(screen.getByPlaceholderText('••••••••••••'), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: /Sign In to JobConnect/i }));

    await waitFor(() => {
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'alex@company.com',
        password: 'StrongPass123!',
        rememberMe: true,
      });
    });

    expect(await screen.findByText('Signed In')).toBeInTheDocument();
    expect(await screen.findByText('Candidate Dashboard Screen', {}, { timeout: 2500 })).toBeInTheDocument();
  });

  it('validates signup mismatch and registers user with optional uploaded resume', async () => {
    const user = userEvent.setup();
    mockAuthService.register.mockResolvedValueOnce({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '22',
      userEmail: 'new.dev@company.com',
      userName: 'New Dev',
      role: 'JOB_SEEKER',
      rememberMe: true,
    });
    mockResumeService.uploadResume.mockResolvedValueOnce({
      id: '90',
      fileName: 'new-dev-cv.pdf',
      fileSize: '0.4 MB',
      uploadedAt: 'Uploaded just now',
      isDefault: true,
      label: 'Default 1-Click',
    });

    renderWithRouter(['/auth']);
    await screen.findByText('Welcome back');

    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    await user.type(screen.getByPlaceholderText('Alexandra Vance'), 'New Dev');
    await user.type(screen.getByPlaceholderText('+1 (555) 234-8901'), '+15550009999');
    await user.type(screen.getByPlaceholderText('name@company.com'), 'new.dev@company.com');

    const pwInputs = screen.getAllByPlaceholderText('••••••••••••');
    await user.type(pwInputs[0], 'Password123!');
    await user.type(pwInputs[1], 'Mismatch999!');

    await user.click(screen.getByRole('button', { name: /Create Free Account/i }));
    expect(
      await screen.findByText('Passwords do not match. Please verify both password fields.')
    ).toBeInTheDocument();
    expect(mockAuthService.register).not.toHaveBeenCalled();

    await user.clear(pwInputs[1]);
    await user.type(pwInputs[1], 'Password123!');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdfFile = new File(['%PDF-1.4 resume'], 'new-dev-cv.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    expect(screen.getByText('new-dev-cv.pdf')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create Free Account/i }));

    await waitFor(() => {
      expect(mockAuthService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'New Dev',
          email: 'new.dev@company.com',
          phone: '+15550009999',
          resumeFileName: 'new-dev-cv.pdf',
        })
      );
      expect(mockResumeService.uploadResume).toHaveBeenCalledWith(pdfFile);
    });

    expect(await screen.findByText('Candidate Account Created')).toBeInTheDocument();
    expect(await screen.findByText('Candidate Dashboard Screen', {}, { timeout: 2500 })).toBeInTheDocument();
  });

  it('signs out authenticated user from AuthPage banner and blocks JOB_SEEKER from /admin', async () => {
    const user = userEvent.setup();
    mockAuthService.getCurrentSession.mockResolvedValue({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '10',
      userEmail: 'seeker@company.com',
      userName: 'Seeker Jane',
      role: 'JOB_SEEKER',
      rememberMe: true,
    });
    mockAuthService.logout.mockResolvedValueOnce(undefined);

    renderWithRouter(['/admin']);
    expect(await screen.findByText('Candidate Dashboard Screen')).toBeInTheDocument();
    expect(screen.queryByText('Admin Console Screen')).not.toBeInTheDocument();

    // Render /auth while authenticated and click Sign Out
    renderWithRouter(['/auth']);
    expect(await screen.findByText(/Signed in as Seeker Jane/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Sign Out/i }));
    await waitFor(() => {
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByText(/Signed in as Seeker Jane/i)).not.toBeInTheDocument();
    });
  });

  it('allows toggling multiple Target Career Focus options, adding a custom role, and persists them on signup', async () => {
    const user = userEvent.setup();
    mockAuthService.register.mockResolvedValueOnce({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '33',
      userEmail: 'focus@company.com',
      userName: 'Focus Candidate',
      role: 'JOB_SEEKER',
      rememberMe: true,
    });
    mockUserService.updateProfile.mockImplementation(async (p) => p);

    renderWithRouter(['/auth']);
    await screen.findByText('Welcome back');

    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    const frontendBtn = screen.getByRole('button', { name: /Frontend Engineer/i });
    const designerBtn = screen.getByRole('button', { name: /Product Designer/i });
    const devopsBtn = screen.getByRole('button', { name: /DevOps & Infra/i });

    expect(frontendBtn).toHaveAttribute('aria-pressed', 'true');
    expect(designerBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle Product Designer & DevOps on, toggle Frontend off
    await user.click(designerBtn);
    await user.click(devopsBtn);
    await user.click(frontendBtn);

    expect(frontendBtn).toHaveAttribute('aria-pressed', 'false');
    expect(designerBtn).toHaveAttribute('aria-pressed', 'true');
    expect(devopsBtn).toHaveAttribute('aria-pressed', 'true');

    // Add custom career focus role
    await user.type(screen.getByLabelText('Custom career focus role'), 'AI Platform Engineer');
    await user.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(screen.getByRole('button', { name: /AI Platform Engineer/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('3 selected')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Alexandra Vance'), 'Focus Candidate');
    await user.type(screen.getByPlaceholderText('+1 (555) 234-8901'), '+15551112222');
    await user.type(screen.getByPlaceholderText('name@company.com'), 'focus@company.com');
    const pwInputs = screen.getAllByPlaceholderText('••••••••••••');
    await user.type(pwInputs[0], 'Password123!');
    await user.type(pwInputs[1], 'Password123!');

    await user.click(screen.getByRole('button', { name: /Create Free Account/i }));

    await waitFor(() => {
      expect(mockAuthService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          targetRoles: ['Product Designer', 'DevOps & Infra', 'AI Platform Engineer'],
        })
      );
      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          targetRoles: ['Product Designer', 'DevOps & Infra', 'AI Platform Engineer'],
        })
      );
    });
  });

  it('renders a top-level external Google OAuth link when inside an embedded iframe', async () => {
    const iframeSpy = vi.spyOn(browserContext, 'isEmbeddedIframe').mockReturnValue(true);

    try {
      renderWithRouter(['/auth']);
      await screen.findByText('Welcome back');

      const googleLink = screen.getByRole('link', { name: /Continue with Google/i });
      expect(googleLink).toHaveAttribute(
        'href',
        'https://job-a5po.onrender.com/oauth2/authorization/google'
      );
      expect(googleLink).toHaveAttribute('target', '_blank');
      expect(
        screen.getByText(/Opens Google Sign-In in a top-level tab/i)
      ).toBeInTheDocument();
    } finally {
      iframeSpy.mockRestore();
    }
  });

  it('toggles Stay signed in checkbox and passes rememberMe=false when unchecked', async () => {
    const user = userEvent.setup();
    mockAuthService.login.mockResolvedValueOnce({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '15',
      userEmail: 'session@company.com',
      userName: 'Session User',
      role: 'JOB_SEEKER',
      rememberMe: false,
    });

    renderWithRouter(['/auth']);
    await screen.findByText('Welcome back');

    const checkbox = screen.getByRole('checkbox', { name: /Stay signed in for 30 days/i });
    expect(checkbox).toBeChecked();
    expect(screen.getByText('30 days')).toBeInTheDocument();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Session only')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('name@company.com'), 'session@company.com');
    await user.type(screen.getByPlaceholderText('••••••••••••'), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: /Sign In to JobConnect/i }));

    await waitFor(() => {
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'session@company.com',
        password: 'StrongPass123!',
        rememberMe: false,
      });
    });
  });

  it('requires 8+ chars with letters, digits, and special characters on signup', async () => {
    const user = userEvent.setup();
    renderWithRouter(['/auth']);
    await screen.findByText('Welcome back');

    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByText('8+ characters')).toBeInTheDocument();
    expect(screen.getByText('Letters (A-Z, a-z)')).toBeInTheDocument();
    expect(screen.getByText('Digits (0-9)')).toBeInTheDocument();
    expect(screen.getByText('Special (!@#$...)')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Alexandra Vance'), 'Policy Tester');
    await user.type(screen.getByPlaceholderText('+1 (555) 234-8901'), '+15553334444');
    await user.type(screen.getByPlaceholderText('name@company.com'), 'policy@company.com');

    const pwInputs = screen.getAllByPlaceholderText('••••••••••••');

    // Missing special character (only letters + digits)
    await user.type(pwInputs[0], 'Password123');
    await user.type(pwInputs[1], 'Password123');
    await user.click(screen.getByRole('button', { name: /Create Free Account/i }));

    expect(
      await screen.findByText(
        'Password must contain a combination of letters, digits, and special characters.'
      )
    ).toBeInTheDocument();
    expect(mockAuthService.register).not.toHaveBeenCalled();

    // Missing letters (only digits + special)
    await user.clear(pwInputs[0]);
    await user.clear(pwInputs[1]);
    await user.type(pwInputs[0], '12345678!');
    await user.type(pwInputs[1], '12345678!');
    await user.click(screen.getByRole('button', { name: /Create Free Account/i }));

    expect(
      await screen.findByText(
        'Password must contain a combination of letters, digits, and special characters.'
      )
    ).toBeInTheDocument();
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it('registers a Job Poster with companyName and redirects to /employer/dashboard', async () => {
    const user = userEvent.setup();
    mockAuthService.register.mockResolvedValueOnce({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '77',
      userEmail: 'hiring@acmecloud.dev',
      userName: 'Morgan Poster',
      companyName: 'Acme Cloud Inc.',
      role: 'EMPLOYER',
      rememberMe: true,
    });

    renderWithRouter(['/auth']);
    await screen.findByText('Welcome back');

    await user.click(screen.getByRole('button', { name: /Create Account/i }));
    await user.click(screen.getByRole('button', { name: /Job Poster/i }));

    expect(screen.getByPlaceholderText('Acme Cloud Inc.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Target Career Focus')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Acme Cloud Inc.'), 'Acme Cloud Inc.');
    await user.type(screen.getByPlaceholderText('Alexandra Vance'), 'Morgan Poster');
    await user.type(screen.getByPlaceholderText('+1 (555) 234-8901'), '+15559990000');
    await user.type(screen.getByPlaceholderText('name@company.com'), 'hiring@acmecloud.dev');

    const pwInputs = screen.getAllByPlaceholderText('••••••••••••');
    await user.type(pwInputs[0], 'PosterPass123!');
    await user.type(pwInputs[1], 'PosterPass123!');

    await user.click(screen.getByRole('button', { name: /Create Free Account/i }));

    await waitFor(() => {
      expect(mockAuthService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Morgan Poster',
          email: 'hiring@acmecloud.dev',
          accountType: 'EMPLOYER',
          companyName: 'Acme Cloud Inc.',
          targetRoles: undefined,
        })
      );
    });

    expect(await screen.findByText('Admin (Job Poster) Account Created')).toBeInTheDocument();
    expect(
      await screen.findByText('Job Poster Dashboard Screen', {}, { timeout: 2500 })
    ).toBeInTheDocument();
  });

  it('shows Candidate and Admin (Job Poster) selector on Sign In and routes Admin login to /employer/dashboard', async () => {
    const user = userEvent.setup();
    mockAuthService.login.mockResolvedValueOnce({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '77',
      userEmail: 'hiring@acmecloud.dev',
      userName: 'Morgan Poster',
      companyName: 'Acme Cloud Inc.',
      role: 'EMPLOYER',
      rememberMe: true,
    });

    renderWithRouter(['/auth']);
    await screen.findByText('Welcome back');

    const candidateBtn = screen.getByRole('button', { name: /Candidate/i });
    const adminBtn = screen.getByRole('button', { name: /Admin.*Job Poster/i });
    expect(candidateBtn).toHaveAttribute('aria-pressed', 'true');
    expect(adminBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(adminBtn);
    expect(candidateBtn).toHaveAttribute('aria-pressed', 'false');
    expect(adminBtn).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('heading', { name: 'Admin (Job Poster) Sign In' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('name@company.com'), 'hiring@acmecloud.dev');
    await user.type(screen.getByPlaceholderText('••••••••••••'), 'PosterPass123!');
    await user.click(screen.getByRole('button', { name: /Sign In to JobConnect/i }));

    await waitFor(() => {
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'hiring@acmecloud.dev',
        password: 'PosterPass123!',
        rememberMe: true,
        accountType: 'EMPLOYER',
      });
    });

    expect(
      await screen.findByText('Job Poster Dashboard Screen', {}, { timeout: 2500 })
    ).toBeInTheDocument();
  });

  it('separates Candidate and Job Poster dashboards via ProtectedRoute role guards', async () => {
    // EMPLOYER visiting /dashboard is redirected to /employer/dashboard
    mockAuthService.getCurrentSession.mockResolvedValueOnce({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '77',
      userEmail: 'hiring@acmecloud.dev',
      userName: 'Morgan Poster',
      companyName: 'Acme Cloud Inc.',
      role: 'EMPLOYER',
      rememberMe: true,
    });

    const empView = renderWithRouter(['/dashboard']);
    expect(await screen.findByText('Job Poster Dashboard Screen')).toBeInTheDocument();
    expect(screen.queryByText('Candidate Dashboard Screen')).not.toBeInTheDocument();
    empView.unmount();

    // JOB_SEEKER visiting /employer/dashboard is redirected to /dashboard
    mockAuthService.getCurrentSession.mockResolvedValueOnce({
      isAuthenticated: true,
      isDemoMode: false,
      userId: '10',
      userEmail: 'seeker@company.com',
      userName: 'Seeker Jane',
      role: 'JOB_SEEKER',
      rememberMe: true,
    });

    renderWithRouter(['/employer/dashboard']);
    expect(await screen.findByText('Candidate Dashboard Screen')).toBeInTheDocument();
    expect(screen.queryByText('Job Poster Dashboard Screen')).not.toBeInTheDocument();
  });
});
