import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  INITIAL_ADMIN_METRICS,
  INITIAL_APPLICATIONS,
  INITIAL_JOBS,
  INITIAL_MODERATION_QUEUE,
  INITIAL_OFFER_SPOTLIGHT,
  INITIAL_PROFILE,
} from '../data/mockData';
import {
  AdminMetrics,
  ApplyFormData,
  AuthSession,
  BackendApplicationStatus,
  CandidateProfile,
  ExperienceItem,
  JobApplication,
  JobPosting,
  ModerationListing,
  OfferSpotlight,
  UserSummary,
} from '../types';
import {
  adminService,
  applicationService,
  authService,
  CreateUrgentRolePayload,
  IS_MOCK_MODE,
  jobService,
  LoginPayload,
  normalizeApiError,
  RegisterPayload,
  resumeService,
  setUnauthorizedHandler,
  SpringApplicationDto,
  userService,
} from '../services';

interface ToastState {
  visible: boolean;
  message: string;
  icon: string;
}

interface AppContextValue {
  jobs: JobPosting[];
  savedJobIds: string[];
  appliedJobIds: string[];
  applications: JobApplication[];
  offerSpotlight: OfferSpotlight;
  profile: CandidateProfile;
  authSession: AuthSession;
  authLoading: boolean;
  adminMetrics: AdminMetrics;
  moderationQueue: ModerationListing[];
  adminUsers: UserSummary[];
  adminApplications: SpringApplicationDto[];
  toast: ToastState;
  showToast: (message: string, icon?: string) => void;
  toggleSaveJob: (jobId: string) => void;
  quickApplyJob: (job: JobPosting) => Promise<void>;
  submitApplication: (job: JobPosting, formData: ApplyFormData) => Promise<JobApplication>;
  withdrawApplication: (applicationId: string) => Promise<void>;
  respondToOffer: (decision: 'accepted' | 'declined') => void;
  updateProfile: (updated: CandidateProfile) => Promise<void>;
  uploadResume: (file: File) => Promise<void>;
  downloadResume: (resumeId: string, fileName: string) => Promise<void>;
  setDefaultResume: (resumeId: string) => void;
  deleteResume: (resumeId: string) => void;
  addSkill: (skillName: string) => void;
  addExperience: (item: Omit<ExperienceItem, 'id'>) => Promise<void>;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  register: (payload: RegisterPayload) => Promise<AuthSession>;
  refreshAuthSession: () => Promise<AuthSession | null>;
  logout: () => Promise<void>;
  moderateListing: (id: string, decision: 'APPROVED' | 'REJECTED') => Promise<void>;
  createUrgentRole: (payload: CreateUrgentRolePayload) => Promise<JobPosting>;
  deleteJobAdmin: (jobId: string) => Promise<void>;
  updateAdminApplicationStatus: (
    applicationId: string | number,
    status: BackendApplicationStatus
  ) => Promise<void>;
  refreshAdminData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<JobPosting[]>(INITIAL_JOBS);
  const [savedJobIds, setSavedJobIds] = useState<string[]>(() =>
    IS_MOCK_MODE ? ['figma-staff-architect', 'linear-lead-ux'] : []
  );
  const [applications, setApplications] = useState<JobApplication[]>(() =>
    IS_MOCK_MODE ? INITIAL_APPLICATIONS : []
  );
  const [offerSpotlight, setOfferSpotlight] = useState<OfferSpotlight>(INITIAL_OFFER_SPOTLIGHT);
  const [profile, setProfile] = useState<CandidateProfile>(INITIAL_PROFILE);
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics>(INITIAL_ADMIN_METRICS);
  const [moderationQueue, setModerationQueue] = useState<ModerationListing[]>(
    INITIAL_MODERATION_QUEUE
  );
  const [adminUsers, setAdminUsers] = useState<UserSummary[]>([]);
  const [adminApplications, setAdminApplications] = useState<SpringApplicationDto[]>([]);
  const [authLoading, setAuthLoading] = useState<boolean>(!IS_MOCK_MODE);

  const [authSession, setAuthSession] = useState<AuthSession>(() => {
    const restored = authService.restoreSessionFromToken();
    if (restored) return restored;
    return {
      isAuthenticated: IS_MOCK_MODE,
      isDemoMode: IS_MOCK_MODE,
      userEmail: INITIAL_PROFILE.email,
      userName: INITIAL_PROFILE.fullName,
      role: 'JOB_SEEKER',
      rememberMe: true,
    };
  });

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    icon: 'check_circle',
  });

  const showToast = useCallback((message: string, icon = 'check_circle') => {
    setToast({ visible: true, message, icon });
    window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2600);
  }, []);

  // Register global 401 handler for HttpOnly JWT cookie/token expiration
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthSession((prev) => ({
        ...prev,
        isAuthenticated: false,
        accessToken: undefined,
        refreshToken: undefined,
        tokenExpiresAt: undefined,
      }));
      showToast('Session expired — please sign in again', 'lock');
    });
    return () => setUnauthorizedHandler(null);
  }, [showToast]);

  const refreshInFlightRef = useRef<Promise<AuthSession | null> | null>(null);

  const refreshAuthSession = useCallback(async (): Promise<AuthSession | null> => {
    if (IS_MOCK_MODE) {
      setAuthLoading(false);
      return null;
    }
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    setAuthLoading(true);
    const requestPromise = (async () => {
      try {
        const session = await authService.getCurrentSession();
        if (session) {
          setAuthSession(session);
        } else {
          setAuthSession((prev) => ({
            ...prev,
            isAuthenticated: false,
            isDemoMode: false,
            accessToken: undefined,
            refreshToken: undefined,
            tokenExpiresAt: undefined,
          }));
        }
        return session;
      } finally {
        refreshInFlightRef.current = null;
        setAuthLoading(false);
      }
    })();

    refreshInFlightRef.current = requestPromise;
    return requestPromise;
  }, []);

  // Verify HttpOnly cookie session via GET /api/auth/me when Spring Boot backend URL is configured
  useEffect(() => {
    void refreshAuthSession();
  }, [refreshAuthSession]);

  // Hydrate initial public jobs and authenticated user data from Spring Boot REST API
  useEffect(() => {
    if (IS_MOCK_MODE) return;
    let mounted = true;

    jobService
      .listJobs()
      .then((liveJobs) => {
        if (mounted && liveJobs.length > 0) setJobs(liveJobs);
      })
      .catch(() => {
        // Handled cleanly if backend is offline
      });

    if (authSession.isAuthenticated && !authSession.isDemoMode) {
      Promise.allSettled([
        userService.getCurrentProfile(),
        applicationService.listApplications(),
      ]).then(([profileRes, appsRes]) => {
        if (!mounted) return;
        if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
        if (appsRes.status === 'fulfilled') setApplications(appsRes.value);
      });
    }

    return () => {
      mounted = false;
    };
  }, [authSession.isAuthenticated, authSession.isDemoMode]);

  const refreshAdminData = useCallback(async () => {
    try {
      const [metrics, users, apps] = await Promise.all([
        adminService.getMetrics(),
        adminService.listUsers(),
        adminService.listAllApplications(),
      ]);
      setAdminMetrics(metrics);
      setAdminUsers(users);
      setAdminApplications(apps);
    } catch (err) {
      showToast(normalizeApiError(err).message, 'error');
    }
  }, [showToast]);

  const appliedJobIds = applications
    .filter((a) => a.status !== 'archived')
    .map((a) => a.jobId);

  const toggleSaveJob = useCallback(
    (jobId: string) => {
      setSavedJobIds((prev) => {
        const exists = prev.includes(jobId);
        const nextSaved = !exists;
        jobService.toggleBookmark(jobId, nextSaved).catch((err) => {
          showToast(normalizeApiError(err).message, 'error');
        });
        if (exists) {
          showToast('Removed from saved roles', 'bookmark_border');
          return prev.filter((id) => id !== jobId);
        }
        showToast('Role saved to your shortlist!', 'bookmark');
        return [...prev, jobId];
      });
    },
    [showToast]
  );

  const quickApplyJob = useCallback(
    async (job: JobPosting) => {
      if (applications.some((a) => a.jobId === job.id && a.status !== 'archived')) {
        showToast(`Already applied to ${job.company}`, 'info');
        return;
      }
      try {
        const defaultResume = profile.resumes.find((r) => r.isDefault) || profile.resumes[0];
        const newApp = await applicationService.submitApplication(
          job,
          {
            fullName: profile.fullName,
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            resumeId: defaultResume?.id || '1',
            githubUrl: profile.links.github,
            linkedinUrl: profile.links.linkedin,
            experienceYears: '5-7 yrs',
            workAuthorized: true,
            requiresSponsorship: false,
            noticePeriod: '2 Weeks',
            shortPitch: '1-Click Executive Application via JobConnect Profile.',
            consentAgreed: true,
          },
          defaultResume?.fileName || 'Elena_Rostova_Staff_Frontend_2025.pdf'
        );
        setApplications((prev) => [newApp, ...prev]);
        showToast(`Application submitted for ${job.title}`, 'verified');
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
      }
    },
    [applications, profile, showToast]
  );

  const submitApplication = useCallback(
    async (job: JobPosting, formData: ApplyFormData) => {
      try {
        const selectedResume =
          profile.resumes.find((r) => r.id === formData.resumeId) || profile.resumes[0];
        const newApp = await applicationService.submitApplication(
          job,
          formData,
          selectedResume?.fileName || 'Elena_Rostova_Staff_Frontend_2025.pdf'
        );
        setApplications((prev) => {
          const filtered = prev.filter((a) => a.jobId !== job.id);
          return [newApp, ...filtered];
        });
        showToast(`Application submitted to ${job.company}!`, 'verified');
        return newApp;
      } catch (err) {
        const apiError = normalizeApiError(err);
        showToast(apiError.message, 'error');
        throw apiError;
      }
    },
    [profile.resumes, showToast]
  );

  const withdrawApplication = useCallback(
    async (applicationId: string) => {
      try {
        await applicationService.withdrawApplication(applicationId);
        setApplications((prev) =>
          prev.map((app) =>
            app.id === applicationId
              ? {
                  ...app,
                  status: 'archived',
                  stageBadge: 'Withdrawn by Candidate',
                }
              : app
          )
        );
        showToast('Application withdrawn and archived', 'archive');
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
      }
    },
    [showToast]
  );

  const respondToOffer = useCallback(
    (decision: 'accepted' | 'declined') => {
      applicationService
        .respondToOffer(offerSpotlight.id, decision)
        .then(() => {
          setOfferSpotlight((prev) => ({ ...prev, status: decision }));
          if (decision === 'accepted') {
            showToast(`Congratulations! Offer accepted at ${offerSpotlight.company}`, 'celebration');
          } else {
            showToast(`Offer from ${offerSpotlight.company} marked declined`, 'info');
          }
        })
        .catch((err) => {
          showToast(normalizeApiError(err).message, 'error');
        });
    },
    [offerSpotlight.company, offerSpotlight.id, showToast]
  );

  const updateProfile = useCallback(
    async (updated: CandidateProfile) => {
      try {
        const saved = await userService.updateProfile(updated);
        setProfile(saved);
        showToast('Profile & preferences saved', 'done_all');
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
      }
    },
    [showToast]
  );

  const uploadResume = useCallback(
    async (file: File) => {
      try {
        const newDoc = await resumeService.uploadResume(file);
        setProfile((prev) => ({
          ...prev,
          resumes: [newDoc, ...prev.resumes],
        }));
        showToast(`Uploaded ${file.name}`, 'upload_file');
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
      }
    },
    [showToast]
  );

  const downloadResume = useCallback(
    async (resumeId: string, fileName: string) => {
      try {
        await resumeService.downloadResume(resumeId, fileName);
        showToast(`Downloading ${fileName}`, 'download');
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
      }
    },
    [showToast]
  );

  const setDefaultResume = useCallback(
    (resumeId: string) => {
      resumeService.setDefaultResume(resumeId).catch((err) => {
        showToast(normalizeApiError(err).message, 'error');
      });
      setProfile((prev) => ({
        ...prev,
        resumes: prev.resumes.map((r) => ({
          ...r,
          isDefault: r.id === resumeId,
          label: r.id === resumeId ? 'Default 1-Click' : 'Tailored CV',
        })),
      }));
      showToast('Default 1-Click resume updated', 'check_circle');
    },
    [showToast]
  );

  const deleteResume = useCallback(
    (resumeId: string) => {
      setProfile((prev) => {
        if (prev.resumes.length <= 1) {
          showToast('At least one active resume is required', 'info');
          return prev;
        }
        resumeService.deleteResume(resumeId).catch((err) => {
          showToast(normalizeApiError(err).message, 'error');
        });
        const remaining = prev.resumes.filter((r) => r.id !== resumeId);
        if (!remaining.some((r) => r.isDefault) && remaining[0]) {
          remaining[0] = { ...remaining[0], isDefault: true, label: 'Default 1-Click' };
        }
        showToast('Resume removed', 'delete');
        return { ...prev, resumes: remaining };
      });
    },
    [showToast]
  );

  const addSkill = useCallback(
    (skillName: string) => {
      const trimmed = skillName.trim();
      if (!trimmed) return;
      if (profile.skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
        showToast('Skill already listed on profile', 'info');
        return;
      }
      userService
        .addSkill(trimmed)
        .then((createdSkill) => {
          setProfile((prev) => ({
            ...prev,
            skills: [...prev.skills, createdSkill],
          }));
          showToast(`Added "${trimmed}" to skills`, 'add_circle');
        })
        .catch((err) => {
          showToast(normalizeApiError(err).message, 'error');
        });
    },
    [profile.skills, showToast]
  );

  const addExperience = useCallback(
    async (item: Omit<ExperienceItem, 'id'>) => {
      try {
        const created = await userService.addExperience(item);
        setProfile((prev) => ({
          ...prev,
          experience: [created, ...prev.experience],
        }));
        showToast('Added experience entry', 'history_edu');
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
      }
    },
    [showToast]
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      try {
        const session = await authService.login(payload);
        setAuthSession(session);
        showToast(
          session.isDemoMode ? 'Signed in (Preview Mode)' : 'Signed in successfully',
          'verified'
        );
        return session;
      } catch (err) {
        const apiError = normalizeApiError(err);
        showToast(apiError.message, 'error');
        throw apiError;
      }
    },
    [showToast]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      try {
        const session = await authService.register(payload);
        setAuthSession(session);
        setProfile((prev) => ({
          ...prev,
          fullName: payload.fullName || prev.fullName,
          email: payload.email || prev.email,
          phone: payload.phone || prev.phone,
        }));
        showToast(
          session.isDemoMode ? 'Candidate account created (Preview Mode)' : 'Account registered',
          'verified'
        );
        return session;
      } catch (err) {
        const apiError = normalizeApiError(err);
        showToast(apiError.message, 'error');
        throw apiError;
      }
    },
    [showToast]
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setAuthSession((prev) => ({
      ...prev,
      isAuthenticated: false,
      accessToken: undefined,
      refreshToken: undefined,
      tokenExpiresAt: undefined,
    }));
    if (!IS_MOCK_MODE) {
      setApplications([]);
      setSavedJobIds([]);
    }
    showToast('Signed out of session', 'logout');
  }, [showToast]);

  const moderateListing = useCallback(
    async (id: string, decision: 'APPROVED' | 'REJECTED') => {
      try {
        await adminService.moderateListing(id, decision);
        setModerationQueue((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: decision } : item))
        );
        if (decision === 'APPROVED') {
          setAdminMetrics((prev) => ({ ...prev, activeJobs: prev.activeJobs + 1 }));
          showToast('Listing approved and published', 'verified');
        } else {
          showToast('Listing rejected from queue', 'cancel');
        }
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
      }
    },
    [showToast]
  );

  const createUrgentRole = useCallback(
    async (payload: CreateUrgentRolePayload) => {
      try {
        const createdJob = await adminService.createUrgentRole(payload);
        setJobs((prev) => [createdJob, ...prev]);
        setAdminMetrics((prev) => ({ ...prev, activeJobs: prev.activeJobs + 1 }));
        setModerationQueue((prev) => [
          {
            id: `mod-${Date.now()}`,
            initials: payload.company.slice(0, 2).toUpperCase(),
            title: payload.title,
            company: payload.company,
            location: payload.location,
            status: 'ACTIVE',
            submittedAgo: 'Published just now',
            salaryRange: payload.salaryDisplay.replace(' / yr', ''),
            note: 'Urgent Priority',
          },
          ...prev,
        ]);
        showToast(`Published role: ${payload.title}`, 'add_circle');
        return createdJob;
      } catch (err) {
        const apiError = normalizeApiError(err);
        showToast(apiError.message, 'error');
        throw apiError;
      }
    },
    [showToast]
  );

  const deleteJobAdmin = useCallback(
    async (jobId: string) => {
      try {
        await jobService.deleteJob(jobId);
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        setAdminMetrics((prev) => ({
          ...prev,
          activeJobs: Math.max(0, prev.activeJobs - 1),
        }));
        showToast('Job listing deleted', 'delete');
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
      }
    },
    [showToast]
  );

  const updateAdminApplicationStatus = useCallback(
    async (applicationId: string | number, status: BackendApplicationStatus) => {
      try {
        await adminService.updateApplicationStatus(applicationId, status);
        setAdminApplications((prev) =>
          prev.map((app) => (String(app.id) === String(applicationId) ? { ...app, status } : app))
        );
        showToast(`Application status updated to ${status}`, 'check_circle');
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
      }
    },
    [showToast]
  );

  return (
    <AppContext.Provider
      value={{
        jobs,
        savedJobIds,
        appliedJobIds,
        applications,
        offerSpotlight,
        profile,
        authSession,
        authLoading,
        adminMetrics,
        moderationQueue,
        adminUsers,
        adminApplications,
        toast,
        showToast,
        toggleSaveJob,
        quickApplyJob,
        submitApplication,
        withdrawApplication,
        respondToOffer,
        updateProfile,
        uploadResume,
        downloadResume,
        setDefaultResume,
        deleteResume,
        addSkill,
        addExperience,
        login,
        register,
        refreshAuthSession,
        logout,
        moderateListing,
        createUrgentRole,
        deleteJobAdmin,
        updateAdminApplicationStatus,
        refreshAdminData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
