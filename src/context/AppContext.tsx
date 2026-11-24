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
  ResumeDocument,
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
import { avatarStorage } from '../utils/avatarStorage';

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
  quickApplyJob: (
    job: JobPosting
  ) => Promise<'applied' | 'already_applied' | 'auth_required' | 'error'>;
  submitApplication: (job: JobPosting, formData: ApplyFormData) => Promise<JobApplication>;
  withdrawApplication: (applicationId: string) => Promise<void>;
  respondToOffer: (decision: 'accepted' | 'declined', targetOffer?: OfferSpotlight) => Promise<void>;
  updateProfile: (updated: CandidateProfile) => Promise<void>;
  uploadResume: (file: File) => Promise<ResumeDocument | null>;
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
  refreshJobs: () => Promise<void>;
  upsertPostedJob: (job: JobPosting) => void;
  removePostedJob: (jobId: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const OFFER_DECISIONS_PREFIX = 'jobconnect_offer_decisions_';

function loadOfferDecisions(email: string): Record<string, 'accepted' | 'declined'> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(`${OFFER_DECISIONS_PREFIX}${email || 'guest'}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, 'accepted' | 'declined'>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveOfferDecisions(email: string, decisions: Record<string, 'accepted' | 'declined'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${OFFER_DECISIONS_PREFIX}${email || 'guest'}`,
      JSON.stringify(decisions)
    );
  } catch {
    // Ignore storage quota errors
  }
}

function getDecisionFromRecord(
  decisions: Record<string, 'accepted' | 'declined'>,
  key: string
): OfferSpotlight['status'] | undefined {
  return Object.prototype.hasOwnProperty.call(decisions, key) ? decisions[key] : undefined;
}

function buildOfferFromApplication(
  app: JobApplication,
  decisions: Record<string, 'accepted' | 'declined'>
): OfferSpotlight {
  const offerId = app.id.startsWith('app-') || app.id.startsWith('offer-') ? app.id : `app-${app.id}`;
  const storedStatus =
    getDecisionFromRecord(decisions, offerId) ?? getDecisionFromRecord(decisions, app.id);
  const derivedStatus: OfferSpotlight['status'] =
    storedStatus ??
    (app.stageBadge === 'Offer Accepted'
      ? 'accepted'
      : app.stageBadge === 'Offer Declined'
      ? 'declined'
      : 'pending');
  return {
    id: offerId,
    jobId: app.jobId,
    company: app.company,
    companyLogo: app.companyLogo,
    roleTitle: app.jobTitle,
    compensation: app.salaryRange,
    expiresIn:
      derivedStatus === 'pending'
        ? 'Expires in 7 days'
        : derivedStatus === 'accepted'
        ? 'Accepted'
        : 'Declined',
    decisionDeadline: derivedStatus === 'accepted' ? 'Onboarding Active' : 'Active Offer',
    equityDetails: 'Standard equity & benefits package',
    signingBonus: 'Included in offer letter',
    status: derivedStatus,
  };
}

function resolveOfferSpotlight(
  apps: JobApplication[],
  decisions: Record<string, 'accepted' | 'declined'>
): OfferSpotlight {
  const offeredApp = apps.find((a) => a.status === 'offered');
  if (offeredApp) {
    return buildOfferFromApplication(offeredApp, decisions);
  }
  const spotlightDecision = getDecisionFromRecord(decisions, INITIAL_OFFER_SPOTLIGHT.id);
  return spotlightDecision
    ? { ...INITIAL_OFFER_SPOTLIGHT, status: spotlightDecision }
    : INITIAL_OFFER_SPOTLIGHT;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<JobPosting[]>(INITIAL_JOBS);
  const [savedJobIds, setSavedJobIds] = useState<string[]>(() =>
    IS_MOCK_MODE ? ['figma-staff-architect', 'linear-lead-ux'] : []
  );
  const [applications, setApplications] = useState<JobApplication[]>(() =>
    IS_MOCK_MODE ? INITIAL_APPLICATIONS : []
  );
  const [profile, setProfile] = useState<CandidateProfile>(() =>
    IS_MOCK_MODE
      ? INITIAL_PROFILE
      : {
          ...INITIAL_PROFILE,
          avatar: '',
          resumes: [],
        }
  );
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

  const [offerDecisions, setOfferDecisions] = useState<Record<string, 'accepted' | 'declined'>>(() =>
    loadOfferDecisions(authSession.userEmail)
  );

  useEffect(() => {
    setOfferDecisions(loadOfferDecisions(authSession.userEmail));
  }, [authSession.userEmail]);

  const offerSpotlight = resolveOfferSpotlight(applications, offerDecisions);

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
      .listJobs({ sortBy: 'Latest Added' })
      .then((liveJobs) => {
        if (mounted && liveJobs.length > 0) setJobs(liveJobs);
      })
      .catch(() => {
        // Handled cleanly if backend is offline
      });

    if (authSession.isAuthenticated && !authSession.isDemoMode) {
      userService
        .getCurrentProfile()
        .then((loadedProfile) => {
          if (mounted) setProfile(loadedProfile);
        })
        .catch(() => {
          // Handled cleanly if backend is offline
        });

      if (authSession.role !== 'EMPLOYER') {
        applicationService
          .listApplications()
          .then((apps) => {
            if (mounted) setApplications(apps);
          })
          .catch(() => {
            // Handled cleanly if backend is offline
          });
      } else {
        setApplications([]);
      }
    }

    return () => {
      mounted = false;
    };
  }, [authSession.isAuthenticated, authSession.isDemoMode, authSession.role]);

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
    async (
      job: JobPosting
    ): Promise<'applied' | 'already_applied' | 'auth_required' | 'error'> => {
      if (!IS_MOCK_MODE && !authSession.isAuthenticated) {
        showToast('Please sign in to apply for jobs', 'lock');
        return 'auth_required';
      }
      if (authSession.role === 'EMPLOYER') {
        showToast('Job poster accounts manage listings rather than applying.', 'business_center');
        return 'error';
      }
      if (applications.some((a) => a.jobId === job.id && a.status !== 'archived')) {
        showToast(`Already applied to ${job.company}`, 'info');
        return 'already_applied';
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
            resumeId: defaultResume?.id || '',
            githubUrl: profile.links.github,
            linkedinUrl: profile.links.linkedin,
            experienceYears: '5-7 yrs',
            workAuthorized: true,
            requiresSponsorship: false,
            noticePeriod: '2 Weeks',
            shortPitch: '1-Click Executive Application via JobConnect Profile.',
            consentAgreed: true,
          },
          defaultResume?.fileName || 'Profile Application'
        );
        setApplications((prev) => [newApp, ...prev.filter((a) => a.jobId !== job.id)]);
        setJobs((prev) =>
          prev.map((j) => {
            if (j.id !== job.id) return j;
            const nextCount = j.applicantsCount + 1;
            return {
              ...j,
              applicantsCount: nextCount,
              urgencyLabel: `${nextCount} applicants • ${j.employmentType}`,
            };
          })
        );
        showToast(`Application submitted for ${job.title}`, 'verified');
        return 'applied';
      } catch (err) {
        const apiError = normalizeApiError(err);
        if (
          apiError.status === 409 ||
          apiError.message.toLowerCase().includes('already applied')
        ) {
          applicationService
            .listApplications()
            .then((fresh) => setApplications(fresh))
            .catch(() => undefined);
          showToast(`Already applied to ${job.company}`, 'info');
          return 'already_applied';
        }
        showToast(apiError.message, 'error');
        return 'error';
      }
    },
    [applications, authSession.isAuthenticated, authSession.role, profile, showToast]
  );

  const submitApplication = useCallback(
    async (job: JobPosting, formData: ApplyFormData) => {
      if (!IS_MOCK_MODE && !authSession.isAuthenticated) {
        const message = 'Please sign in to submit your application';
        showToast(message, 'lock');
        throw new Error(message);
      }
      if (authSession.role === 'EMPLOYER') {
        const message = 'Job poster accounts manage listings rather than applying.';
        showToast(message, 'business_center');
        throw new Error(message);
      }
      try {
        const selectedResume =
          profile.resumes.find((r) => r.id === formData.resumeId) || profile.resumes[0];
        const newApp = await applicationService.submitApplication(
          job,
          formData,
          selectedResume?.fileName || 'Profile Application'
        );
        setApplications((prev) => {
          const filtered = prev.filter((a) => a.jobId !== job.id);
          return [newApp, ...filtered];
        });
        setJobs((prev) =>
          prev.map((j) => {
            if (j.id !== job.id) return j;
            const nextCount = j.applicantsCount + 1;
            return {
              ...j,
              applicantsCount: nextCount,
              urgencyLabel: `${nextCount} applicants • ${j.employmentType}`,
            };
          })
        );
        showToast(`Application submitted to ${job.company}!`, 'verified');
        return newApp;
      } catch (err) {
        const apiError = normalizeApiError(err);
        if (
          apiError.status === 409 ||
          apiError.message.toLowerCase().includes('already applied')
        ) {
          applicationService
            .listApplications()
            .then((fresh) => setApplications(fresh))
            .catch(() => undefined);
        }
        showToast(apiError.message, 'error');
        throw apiError;
      }
    },
    [authSession.isAuthenticated, authSession.role, profile.resumes, showToast]
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
    async (decision: 'accepted' | 'declined', targetOffer?: OfferSpotlight) => {
      const target = targetOffer || offerSpotlight;
      if (!IS_MOCK_MODE && !authSession.isAuthenticated) {
        const message = 'Please sign in to respond to offers';
        showToast(message, 'lock');
        throw new Error(message);
      }
      try {
        const res = await applicationService.respondToOffer(target.id, decision);
        setOfferDecisions((prev) => {
          const next: Record<string, 'accepted' | 'declined'> = {
            ...prev,
            [target.id]: decision,
          };
          if (res.applicationId != null) {
            next[`app-${res.applicationId}`] = decision;
            next[String(res.applicationId)] = decision;
          }
          saveOfferDecisions(authSession.userEmail, next);
          return next;
        });

        const matchedAppId =
          res.applicationId != null
            ? String(res.applicationId)
            : target.id.replace(/^(?:app|offer)-/i, '');

        setApplications((prev) =>
          prev.map((app) => {
            if (app.id !== matchedAppId && app.id !== target.id) return app;
            if (decision === 'accepted') {
              return {
                ...app,
                status: 'offered',
                stageBadge: 'Offer Accepted',
                nextMilestone: {
                  label: 'Offer Status',
                  detail: 'Offer accepted — onboarding packet initiated',
                  icon: 'verified',
                  tone: 'tertiary',
                },
              };
            }
            return {
              ...app,
              status: 'archived',
              stageBadge: 'Offer Declined',
              nextMilestone: {
                label: 'Offer Status',
                detail: 'Offer declined by candidate',
                icon: 'info',
                tone: 'neutral',
              },
            };
          })
        );

        if (decision === 'accepted') {
          showToast(`Congratulations! Offer accepted at ${target.company}`, 'celebration');
        } else {
          showToast(`Offer from ${target.company} marked declined`, 'info');
        }
      } catch (err) {
        const apiError = normalizeApiError(err);
        showToast(apiError.message, 'error');
        throw apiError;
      }
    },
    [authSession.isAuthenticated, authSession.userEmail, offerSpotlight, showToast]
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
    async (file: File): Promise<ResumeDocument | null> => {
      try {
        const newDoc = await resumeService.uploadResume(file);
        setProfile((prev) => ({
          ...prev,
          resumes: [newDoc, ...prev.resumes],
        }));
        showToast(`Uploaded ${file.name}`, 'upload_file');
        return newDoc;
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
        return null;
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
        if (!IS_MOCK_MODE) {
          const resolvedAvatar =
            avatarStorage.get(session.userEmail) || session.profileImage || '';
          setProfile((prev) => ({
            ...prev,
            fullName: session.userName || prev.fullName,
            email: session.userEmail || prev.email,
            companyName: session.companyName ?? prev.companyName,
            avatar: resolvedAvatar,
            resumes: [],
          }));
        }
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
        const isEmployer = session.role === 'EMPLOYER';
        const normalizedRoles = isEmployer
          ? []
          : payload.targetRoles?.map((r) => r.trim()).filter(Boolean);
        const nextProfile: CandidateProfile = {
          ...profile,
          fullName: payload.fullName || profile.fullName,
          email: payload.email || profile.email,
          phone: payload.phone || profile.phone,
          companyName: session.companyName ?? payload.companyName ?? profile.companyName,
          avatar: IS_MOCK_MODE
            ? profile.avatar
            : avatarStorage.get(payload.email) || session.profileImage || '',
          targetRoles:
            !isEmployer && normalizedRoles && normalizedRoles.length > 0
              ? normalizedRoles
              : profile.targetRoles,
          resumes: IS_MOCK_MODE ? profile.resumes : [],
        };

        let finalProfile = nextProfile;
        if (!IS_MOCK_MODE && !isEmployer && normalizedRoles && normalizedRoles.length > 0) {
          try {
            const synced = await userService.updateProfile(nextProfile);
            if (synced && typeof synced === 'object') {
              finalProfile = synced;
            }
          } catch {
            // Keep selected roles in local state if profile sync encounters a transient error
          }
        }

        setProfile(finalProfile);
        setAuthSession(session);
        showToast(
          session.isDemoMode
            ? isEmployer
              ? 'Job Poster account created (Preview Mode)'
              : 'Candidate account created (Preview Mode)'
            : isEmployer
              ? 'Job Poster account registered'
              : 'Account registered',
          'verified'
        );
        return session;
      } catch (err) {
        const apiError = normalizeApiError(err);
        showToast(apiError.message, 'error');
        throw apiError;
      }
    },
    [profile, showToast]
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setAuthSession((prev) => ({
      ...prev,
      isAuthenticated: false,
      companyName: undefined,
      profileImage: undefined,
      accessToken: undefined,
      refreshToken: undefined,
      tokenExpiresAt: undefined,
    }));
    if (!IS_MOCK_MODE) {
      setApplications([]);
      setSavedJobIds([]);
      setProfile({ ...INITIAL_PROFILE, companyName: undefined, avatar: '', resumes: [] });
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

  const refreshJobs = useCallback(async () => {
    if (IS_MOCK_MODE) return;
    try {
      const liveJobs = await jobService.listJobs({ sortBy: 'Latest Added' });
      if (Array.isArray(liveJobs)) {
        setJobs(liveJobs);
      }
    } catch {
      // Handled cleanly if backend is offline
    }
  }, []);

  const upsertPostedJob = useCallback((job: JobPosting) => {
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === job.id);
      if (idx === -1) return [job, ...prev];
      const next = [...prev];
      next[idx] = job;
      return next;
    });
  }, []);

  const removePostedJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

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
        refreshJobs,
        upsertPostedJob,
        removePostedJob,
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
