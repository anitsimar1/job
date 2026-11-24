import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MobileTabShell } from '../components/layout/MobileTabShell';
import { useApp } from '../context/AppContext';
import {
  applicationService,
  CreateJobPayload,
  jobService,
  normalizeApiError,
  resumeService,
  SpringApplicationDto,
} from '../services';
import {
  BackendApplicationStatus,
  EmploymentType,
  ExperienceLevel,
  JobPosting,
  WorkplaceType,
} from '../types';

const WORKPLACE_OPTIONS: WorkplaceType[] = ['Remote', 'Hybrid', 'On-site'];
const EMPLOYMENT_OPTIONS: EmploymentType[] = ['Full-time', 'Contract / C2C', 'Executive Advisory'];
const EXPERIENCE_OPTIONS: ExperienceLevel[] = [
  'Mid Level',
  'Senior Level',
  'Staff / Lead',
  'Principal',
  'Engineering Lead',
];
const APPLICATION_STATUS_OPTIONS: Array<{ value: BackendApplicationStatus; label: string }> = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'HIRED', label: 'Hired / Offer' },
  { value: 'REJECTED', label: 'Rejected' },
];

interface JobFormState {
  title: string;
  company: string;
  location: string;
  workplace: WorkplaceType;
  employmentType: EmploymentType;
  experience: ExperienceLevel;
  sector: string;
  salary: string;
  minSalaryK: string;
  maxSalaryK: string;
  skillsText: string;
  description: string;
  requirements: string;
}

function getStatusBadgeClasses(status?: string): string {
  const normalized = (status || 'OPEN').toUpperCase();
  if (normalized === 'OPEN') {
    return 'bg-tertiary-fixed/40 text-tertiary font-bold';
  }
  if (normalized === 'PAUSED') {
    return 'bg-secondary-fixed/50 text-on-secondary-fixed font-semibold';
  }
  return 'bg-error-container text-on-error-container font-semibold';
}

function getApplicantStageClasses(status: BackendApplicationStatus): string {
  switch (status) {
    case 'HIRED':
      return 'bg-tertiary-fixed text-on-tertiary-fixed';
    case 'SHORTLISTED':
      return 'bg-primary text-on-primary';
    case 'UNDER_REVIEW':
      return 'bg-secondary-fixed text-on-secondary-fixed';
    case 'REJECTED':
      return 'bg-error-container text-on-error-container';
    case 'APPLIED':
    default:
      return 'bg-surface-container-high text-primary';
  }
}

export function EmployerDashboardPage() {
  const { authSession, profile, upsertPostedJob, removePostedJob, showToast } = useApp();

  const defaultCompany = authSession.companyName || profile.companyName || '';

  const [postedJobs, setPostedJobs] = useState<JobPosting[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [applicants, setApplicants] = useState<SpringApplicationDto[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [savingJob, setSavingJob] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const buildEmptyForm = useCallback(
    (): JobFormState => ({
      title: '',
      company: defaultCompany,
      location: 'San Francisco, CA / Remote',
      workplace: 'Remote',
      employmentType: 'Full-time',
      experience: 'Senior Level',
      sector: 'Engineering',
      salary: '$160k - $200k',
      minSalaryK: '160',
      maxSalaryK: '200',
      skillsText: 'TypeScript, React, Spring Boot',
      description: '',
      requirements: '',
    }),
    [defaultCompany]
  );

  const [form, setForm] = useState<JobFormState>(buildEmptyForm);

  const loadMyJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const items = await jobService.listMyPostedJobs();
      setPostedJobs(items);
      setSelectedJobId((prev) => {
        if (prev && items.some((j) => j.id === prev)) return prev;
        return items[0]?.id || '';
      });
    } catch (err) {
      showToast(normalizeApiError(err).message, 'error');
    } finally {
      setJobsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadMyJobs();
  }, [loadMyJobs]);

  const loadApplicants = useCallback(
    async (jobId: string) => {
      if (!jobId) {
        setApplicants([]);
        return;
      }
      setApplicantsLoading(true);
      try {
        const list = await applicationService.listJobApplications(jobId);
        setApplicants(list);
      } catch (err) {
        showToast(normalizeApiError(err).message, 'error');
        setApplicants([]);
      } finally {
        setApplicantsLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (selectedJobId) {
      void loadApplicants(selectedJobId);
    } else {
      setApplicants([]);
    }
  }, [selectedJobId, loadApplicants]);

  const selectedJob = postedJobs.find((j) => j.id === selectedJobId) || null;
  const openCount = postedJobs.filter((j) => (j.status || 'OPEN').toUpperCase() === 'OPEN').length;
  const totalApplicants = postedJobs.reduce((sum, j) => sum + (j.applicantsCount || 0), 0);

  const openCreateModal = () => {
    setEditingJobId(null);
    setForm(buildEmptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (job: JobPosting) => {
    setEditingJobId(job.id);
    setForm({
      title: job.title,
      company: job.company,
      location: job.location,
      workplace: job.workplace || 'Remote',
      employmentType: job.employmentType || 'Full-time',
      experience: job.experienceLevel || 'Senior Level',
      sector: job.sector || 'Engineering',
      salary: job.salaryDisplay || '$160k - $200k',
      minSalaryK: String(job.minSalaryK || 160),
      maxSalaryK: String(job.maxSalaryK || 200),
      skillsText: job.tags.join(', '),
      description: job.aboutRole.join('\n'),
      requirements: job.requirements.join('\n'),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (form.title.trim().length < 2) {
      setFormError('Job title must be at least 2 characters.');
      return;
    }
    if (form.company.trim().length < 2) {
      setFormError('Company name must be at least 2 characters.');
      return;
    }
    if (!form.location.trim()) {
      setFormError('Please specify a job location.');
      return;
    }
    if (!form.description.trim()) {
      setFormError('Please enter a role description.');
      return;
    }
    if (!form.requirements.trim()) {
      setFormError('Please list key role requirements.');
      return;
    }

    const minK = Number(form.minSalaryK) || 140;
    const maxK = Math.max(minK, Number(form.maxSalaryK) || minK + 30);
    const skills = form.skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: CreateJobPayload = {
      title: form.title.trim(),
      company: form.company.trim(),
      location: form.location.trim(),
      workplace: form.workplace,
      employmentType: form.employmentType,
      experience: form.experience,
      sector: form.sector.trim() || 'Engineering',
      salary: form.salary.trim() || `$${minK}k - $${maxK}k`,
      minSalaryK: minK,
      maxSalaryK: maxK,
      skills,
      description: form.description.trim(),
      requirements: form.requirements.trim(),
    };

    setSavingJob(true);
    try {
      const saved = editingJobId
        ? await jobService.updateJob(editingJobId, payload)
        : await jobService.createJob(payload);

      setPostedJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === saved.id);
        if (idx === -1) return [saved, ...prev];
        const next = [...prev];
        next[idx] = saved;
        return next;
      });
      upsertPostedJob(saved);
      setSelectedJobId(saved.id);
      setModalOpen(false);
      showToast(
        editingJobId ? `Updated "${saved.title}"` : `Published "${saved.title}"`,
        'verified'
      );
    } catch (err) {
      const msg = normalizeApiError(err).message;
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSavingJob(false);
    }
  };

  const handleJobStatusChange = async (job: JobPosting, nextStatus: 'OPEN' | 'PAUSED' | 'CLOSED') => {
    setBusyJobId(job.id);
    try {
      const updated = await jobService.updateJobStatus(job.id, nextStatus);
      setPostedJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
      upsertPostedJob(updated);
      showToast(`"${job.title}" marked ${nextStatus}`, 'check_circle');
    } catch (err) {
      showToast(normalizeApiError(err).message, 'error');
    } finally {
      setBusyJobId(null);
    }
  };

  const handleDeleteJob = async (job: JobPosting) => {
    setBusyJobId(job.id);
    try {
      await jobService.deleteJob(job.id);
      setPostedJobs((prev) => {
        const remaining = prev.filter((j) => j.id !== job.id);
        if (selectedJobId === job.id) {
          setSelectedJobId(remaining[0]?.id || '');
        }
        return remaining;
      });
      removePostedJob(job.id);
      setConfirmDeleteId(null);
      showToast(`Removed "${job.title}"`, 'delete');
    } catch (err) {
      showToast(normalizeApiError(err).message, 'error');
    } finally {
      setBusyJobId(null);
    }
  };

  const handleApplicantStatusChange = async (
    applicationId: string | number,
    nextStatus: BackendApplicationStatus
  ) => {
    const key = String(applicationId);
    setUpdatingAppId(key);
    try {
      const updated = await applicationService.updateApplicationStatus(applicationId, nextStatus);
      setApplicants((prev) =>
        prev.map((app) =>
          String(app.id) === key ? { ...app, status: updated.status || nextStatus } : app
        )
      );
      showToast(`Applicant stage updated to ${nextStatus.replace('_', ' ')}`, 'check_circle');
    } catch (err) {
      showToast(normalizeApiError(err).message, 'error');
    } finally {
      setUpdatingAppId(null);
    }
  };

  const handleDownloadResume = async (app: SpringApplicationDto) => {
    if (!app.resumeId) {
      showToast('No resume attached to this application', 'info');
      return;
    }
    try {
      const fileName = app.resumeFileName || `candidate-${app.id}-resume.pdf`;
      await resumeService.downloadResume(String(app.resumeId), fileName);
      showToast(`Downloading ${fileName}`, 'download');
    } catch (err) {
      showToast(normalizeApiError(err).message, 'error');
    }
  };

  return (
    <MobileTabShell pageLabel="Admin (Job Poster) Dashboard">
      <div className="flex flex-col w-full">
        <div className="flex flex-col gap-space-lg px-gutter-sm sm:px-gutter max-w-5xl mx-auto w-full pb-space-2xl pt-space-xs">
          {/* Header Banner */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-1.5 text-secondary font-label-sm uppercase tracking-wider font-bold">
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                <span>{defaultCompany || 'Hiring Organization'}</span>
              </div>
              <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface">
                Admin (Job Poster) Dashboard
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Publish roles, manage hiring statuses, review resumes &amp; get instant email alerts on every application.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2 shrink-0">
              {authSession.role === 'ADMIN' && (
                <Link
                  className="h-11 px-4 rounded-lg bg-surface-container text-secondary hover:bg-surface-container-high font-label-md font-semibold flex items-center gap-1.5 transition-colors"
                  to="/admin"
                >
                  <span className="material-symbols-outlined text-[18px]">shield_person</span>
                  <span>Admin Console</span>
                </Link>
              )}
              <Link
                className="h-11 px-4 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md font-semibold flex items-center gap-1.5 transition-colors"
                to="/jobs"
              >
                <span className="material-symbols-outlined text-[18px]">public</span>
                <span>Live Board</span>
              </Link>
              <button
                className="h-11 px-5 rounded-lg bg-primary text-on-primary hover:bg-secondary font-label-md font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                onClick={openCreateModal}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Post New Job</span>
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm sm:gap-space-md">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="w-10 h-10 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">work</span>
                </span>
                <span className="font-label-sm px-2 py-0.5 rounded-full bg-surface-container text-primary">
                  Listings
                </span>
              </div>
              <div>
                <span className="font-headline-lg text-headline-lg text-on-surface">
                  {postedJobs.length}
                </span>
                <p className="font-body-sm text-on-surface-variant">Posted Roles</p>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="w-10 h-10 rounded-lg bg-tertiary-fixed/30 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </span>
                <span className="font-label-sm px-2 py-0.5 rounded-full bg-tertiary-fixed/30 text-tertiary font-semibold">
                  Accepting
                </span>
              </div>
              <div>
                <span className="font-headline-lg text-headline-lg text-on-surface">
                  {openCount}
                </span>
                <p className="font-body-sm text-on-surface-variant">Open Openings</p>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                </span>
                <span className="font-label-sm px-2 py-0.5 rounded-full bg-surface-container text-secondary font-semibold">
                  Pipeline
                </span>
              </div>
              <div>
                <span className="font-headline-lg text-headline-lg text-on-surface">
                  {totalApplicants}
                </span>
                <p className="font-body-sm text-on-surface-variant">Total Applicants</p>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="w-10 h-10 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
                </span>
                <span className="font-label-sm px-2 py-0.5 rounded-full bg-tertiary-fixed/30 text-tertiary font-semibold">
                  Active
                </span>
              </div>
              <div>
                <span className="font-label-lg text-on-surface font-bold block truncate">
                  {authSession.userEmail || 'Verified Email'}
                </span>
                <p className="font-body-sm text-on-surface-variant">Applicant Email Alerts</p>
              </div>
            </div>
          </div>

          {/* Two-Column Management Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
            {/* Left: Posted Jobs List */}
            <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    list_alt
                  </span>
                  <span>Your Posted Jobs</span>
                </h2>
                <button
                  aria-label="Refresh posted jobs"
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                  onClick={() => void loadMyJobs()}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>

              {jobsLoading ? (
                <div className="py-10 flex flex-col items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[28px] animate-spin text-primary">
                    progress_activity
                  </span>
                  <span className="font-body-sm">Loading your posted roles...</span>
                </div>
              ) : postedJobs.length === 0 ? (
                <div className="p-6 rounded-xl bg-surface-container-low text-center flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-[36px] text-secondary">
                    post_add
                  </span>
                  <div>
                    <p className="font-label-lg font-bold text-on-surface">
                      No jobs posted yet
                    </p>
                    <p className="font-body-sm text-on-surface-variant mt-1">
                      Create your first job listing to start receiving qualified candidate applications.
                    </p>
                  </div>
                  <button
                    className="h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md font-bold"
                    onClick={openCreateModal}
                    type="button"
                  >
                    Post First Job
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {postedJobs.map((job) => {
                    const isSelected = job.id === selectedJobId;
                    const statusUpper = (job.status || 'OPEN').toUpperCase();
                    const isBusy = busyJobId === job.id;
                    return (
                      <div
                        key={job.id}
                        className={`rounded-xl p-3.5 border transition-all ${
                          isSelected
                            ? 'bg-surface-container-low border-primary shadow-sm ring-1 ring-primary/20'
                            : 'bg-surface-container-low/50 border-outline-variant/40 hover:border-primary/40'
                        }`}
                      >
                        <button
                          className="w-full text-left flex flex-col gap-1.5"
                          onClick={() => setSelectedJobId(job.id)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-label-lg font-bold text-on-surface truncate">
                                {job.title}
                              </h3>
                              <p className="font-body-sm text-xs text-on-surface-variant truncate">
                                {job.company} • {job.location}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-label-sm ${getStatusBadgeClasses(
                                statusUpper
                              )}`}
                            >
                              {statusUpper}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1">
                            <span className="font-semibold text-primary">{job.salaryDisplay}</span>
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <span className="material-symbols-outlined text-[14px]">person</span>
                              {job.applicantsCount} applicants
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center flex-wrap gap-1.5 pt-2.5 mt-2.5 border-t border-outline-variant/30">
                          <button
                            className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-on-surface hover:text-primary font-label-sm text-xs font-semibold shadow-2xs"
                            disabled={isBusy}
                            onClick={() => openEditModal(job)}
                            type="button"
                          >
                            Edit
                          </button>

                          {statusUpper !== 'OPEN' ? (
                            <button
                              className="px-2.5 py-1 rounded-lg bg-tertiary-fixed/40 text-tertiary hover:bg-tertiary-fixed/70 font-label-sm text-xs font-semibold"
                              disabled={isBusy}
                              onClick={() => void handleJobStatusChange(job, 'OPEN')}
                              type="button"
                            >
                              Reopen
                            </button>
                          ) : (
                            <button
                              className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface font-label-sm text-xs font-semibold"
                              disabled={isBusy}
                              onClick={() => void handleJobStatusChange(job, 'PAUSED')}
                              type="button"
                            >
                              Pause
                            </button>
                          )}

                          {statusUpper !== 'CLOSED' && (
                            <button
                              className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant hover:text-error font-label-sm text-xs font-semibold"
                              disabled={isBusy}
                              onClick={() => void handleJobStatusChange(job, 'CLOSED')}
                              type="button"
                            >
                              Close
                            </button>
                          )}

                          {confirmDeleteId === job.id ? (
                            <div className="ml-auto flex items-center gap-1">
                              <button
                                className="px-2 py-1 rounded-lg bg-error text-on-error font-label-sm text-xs font-bold"
                                disabled={isBusy}
                                onClick={() => void handleDeleteJob(job)}
                                type="button"
                              >
                                Confirm
                              </button>
                              <button
                                className="px-2 py-1 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-xs"
                                onClick={() => setConfirmDeleteId(null)}
                                type="button"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              aria-label={`Delete ${job.title}`}
                              className="ml-auto px-2 py-1 rounded-lg text-error hover:bg-error-container/40 font-label-sm text-xs font-semibold"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteId(job.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Incoming Applicants Pipeline */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      inbox
                    </span>
                    <span>
                      {selectedJob ? `Applicants — ${selectedJob.title}` : 'Incoming Applicants'}
                    </span>
                  </h2>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    Review resumes and move candidates through your hiring stages.
                  </p>
                </div>

                {selectedJob && (
                  <button
                    aria-label="Refresh applicants"
                    className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-high"
                    onClick={() => void loadApplicants(selectedJob.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Refresh</span>
                  </button>
                )}
              </div>

              {!selectedJob ? (
                <div className="p-8 rounded-xl bg-surface-container-low text-center text-on-surface-variant font-body-sm">
                  Select a posted job on the left or publish a new listing to inspect incoming applications.
                </div>
              ) : applicantsLoading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[28px] animate-spin text-secondary">
                    progress_activity
                  </span>
                  <span className="font-body-sm">Loading applicants...</span>
                </div>
              ) : applicants.length === 0 ? (
                <div className="p-8 rounded-xl bg-surface-container-low text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[34px] text-outline">
                    hourglass_empty
                  </span>
                  <p className="font-label-lg font-bold text-on-surface">
                    No applications yet for this role
                  </p>
                  <p className="font-body-sm text-xs text-on-surface-variant max-w-sm">
                    When candidates apply, you will receive an email alert at{' '}
                    <span className="font-semibold text-on-surface">
                      {authSession.userEmail || 'your account email'}
                    </span>{' '}
                    and their profile will appear right here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {applicants.map((app) => {
                    const appKey = String(app.id);
                    const isUpdating = updatingAppId === appKey;
                    return (
                      <div
                        key={appKey}
                        className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/30 flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-label-lg font-bold text-on-surface">
                                {app.applicantName || 'Candidate'}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-label-sm font-bold ${getApplicantStageClasses(
                                  app.status
                                )}`}
                              >
                                {app.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                              {app.applicantEmail || 'Email hidden'}
                              {app.experienceYears ? ` • ${app.experienceYears} exp` : ''}
                              {app.noticePeriod ? ` • Notice: ${app.noticePeriod}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {app.resumeId && (
                              <button
                                className="h-9 px-3 rounded-lg bg-surface-container-lowest text-primary hover:bg-surface-container font-label-sm text-xs font-semibold shadow-2xs flex items-center gap-1"
                                onClick={() => void handleDownloadResume(app)}
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  download
                                </span>
                                <span>{app.resumeFileName || 'Resume'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {app.coverLetter && (
                          <p className="font-body-sm text-xs text-on-surface bg-surface-container-lowest rounded-lg p-3 leading-relaxed">
                            {app.coverLetter}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-outline-variant/25">
                          <span className="font-body-sm text-[11px] text-on-surface-variant">
                            Applied{' '}
                            {app.appliedAt
                              ? new Date(app.appliedAt).toLocaleDateString()
                              : 'recently'}
                          </span>

                          <div className="flex items-center gap-2">
                            <label
                              className="font-label-sm text-xs text-on-surface-variant"
                              htmlFor={`stage-${appKey}`}
                            >
                              Stage:
                            </label>
                            <select
                              aria-label={`Pipeline status for ${app.applicantName || 'candidate'}`}
                              className="h-9 px-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface font-label-sm text-xs font-semibold outline-none focus:border-primary"
                              disabled={isUpdating}
                              id={`stage-${appKey}`}
                              onChange={(e) =>
                                void handleApplicantStatusChange(
                                  app.id,
                                  e.target.value as BackendApplicationStatus
                                )
                              }
                              value={app.status}
                            >
                              {APPLICATION_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Job Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingJob) setModalOpen(false);
          }}
        >
          <div
            aria-modal="true"
            className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto"
            role="dialog"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {editingJobId ? 'Edit Job Posting' : 'Post a New Job'}
              </h2>
              <button
                aria-label="Close job form"
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
                onClick={() => !savingJob && setModalOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {formError && (
              <div
                className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2"
                role="alert"
              >
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{formError}</span>
              </div>
            )}

            <form className="space-y-3.5" onSubmit={handleSaveJob}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Job Title
                  </label>
                  <input
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Senior Platform Engineer"
                    required
                    type="text"
                    value={form.title}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Company Name
                  </label>
                  <input
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Acme Cloud Inc."
                    required
                    type="text"
                    value={form.company}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Location
                  </label>
                  <input
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="San Francisco / Remote"
                    required
                    type="text"
                    value={form.location}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Workplace
                  </label>
                  <select
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, workplace: e.target.value as WorkplaceType }))
                    }
                    value={form.workplace}
                  >
                    {WORKPLACE_OPTIONS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Employment Type
                  </label>
                  <select
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, employmentType: e.target.value as EmploymentType }))
                    }
                    value={form.employmentType}
                  >
                    {EMPLOYMENT_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Experience Level
                  </label>
                  <select
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, experience: e.target.value as ExperienceLevel }))
                    }
                    value={form.experience}
                  >
                    {EXPERIENCE_OPTIONS.map((exp) => (
                      <option key={exp} value={exp}>
                        {exp}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Sector
                  </label>
                  <input
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                    placeholder="Engineering"
                    type="text"
                    value={form.sector}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Compensation Display
                  </label>
                  <input
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                    placeholder="$160k - $200k"
                    required
                    type="text"
                    value={form.salary}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Min Salary ($k)
                  </label>
                  <input
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    min={20}
                    onChange={(e) => setForm((f) => ({ ...f, minSalaryK: e.target.value }))}
                    type="number"
                    value={form.minSalaryK}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Max Salary ($k)
                  </label>
                  <input
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    min={20}
                    onChange={(e) => setForm((f) => ({ ...f, maxSalaryK: e.target.value }))}
                    type="number"
                    value={form.maxSalaryK}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-xs font-semibold text-on-surface">
                    Skills (comma separated)
                  </label>
                  <input
                    className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                    onChange={(e) => setForm((f) => ({ ...f, skillsText: e.target.value }))}
                    placeholder="TypeScript, React, Java"
                    type="text"
                    value={form.skillsText}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-xs font-semibold text-on-surface">
                  Role Description
                </label>
                <textarea
                  className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the team mission, impact, and key responsibilities..."
                  required
                  rows={3}
                  value={form.description}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-xs font-semibold text-on-surface">
                  Requirements
                </label>
                <textarea
                  className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-body-sm outline-none focus:border-primary"
                  onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
                  placeholder="5+ years building distributed services; deep TypeScript and SQL expertise"
                  required
                  rows={2}
                  value={form.requirements}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md font-semibold"
                  disabled={savingJob}
                  onClick={() => setModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-10 px-5 rounded-lg bg-primary text-on-primary hover:bg-secondary font-label-md font-bold flex items-center gap-1.5 disabled:opacity-60"
                  disabled={savingJob}
                  type="submit"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {savingJob ? 'refresh' : 'publish'}
                  </span>
                  <span>
                    {savingJob
                      ? 'Saving...'
                      : editingJobId
                        ? 'Save Changes'
                        : 'Publish Job'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MobileTabShell>
  );
}
