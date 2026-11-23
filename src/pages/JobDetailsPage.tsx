import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MobileTabShell } from '../components/layout/MobileTabShell';
import { SafeImage } from '../components/common/SafeImage';
import { useApp } from '../context/AppContext';
import { jobService } from '../services/jobService';
import { JobPosting } from '../types';

type DetailTab = 'overview' | 'responsibilities' | 'requirements' | 'perks';

export function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, savedJobIds, appliedJobIds, toggleSaveJob, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [showMatchBreakdown, setShowMatchBreakdown] = useState(false);
  const [fetchedJob, setFetchedJob] = useState<JobPosting | undefined>(undefined);
  const [loadingJob, setLoadingJob] = useState(false);

  const jobFromContext = id ? jobs.find((j) => j.id === id) : jobs[0];

  useEffect(() => {
    if (!id || jobFromContext) {
      setLoadingJob(false);
      return;
    }
    let active = true;
    setLoadingJob(true);
    jobService
      .getJobById(id, jobs)
      .then((res) => {
        if (active) setFetchedJob(res);
      })
      .catch(() => {
        if (active) setFetchedJob(undefined);
      })
      .finally(() => {
        if (active) setLoadingJob(false);
      });
    return () => {
      active = false;
    };
  }, [id, jobFromContext, jobs]);

  const job = jobFromContext || (fetchedJob && (!id || fetchedJob.id === id) ? fetchedJob : undefined);

  if (loadingJob && !job) {
    return (
      <MobileTabShell pageLabel="Job Details">
        <div className="px-gutter-sm py-16 flex flex-col items-center justify-center gap-3 text-center">
          <span className="material-symbols-outlined text-[32px] text-secondary animate-spin">
            progress_activity
          </span>
          <p className="font-body-md text-on-surface-variant">Loading role details...</p>
        </div>
      </MobileTabShell>
    );
  }

  if (!job) {
    return (
      <MobileTabShell pageLabel="Job Details">
        <div className="px-gutter-sm py-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[28px]">work_off</span>
          </div>
          <h2 className="font-headline-sm font-bold text-on-surface">Job listing not found</h2>
          <p className="font-body-sm text-on-surface-variant max-w-xs">
            This posting may have been closed or removed. Browse the latest open roles instead.
          </p>
          <Link
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md font-semibold"
            to="/jobs"
          >
            Browse Open Roles
          </Link>
        </div>
      </MobileTabShell>
    );
  }

  const isSaved = savedJobIds.includes(job.id);
  const isApplied = appliedJobIds.includes(job.id);

  const scrollToSection = (tab: DetailTab, sectionId: string) => {
    setActiveTab(tab);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job.title} at ${job.company}`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    showToast('Job link copied to clipboard', 'share');
  };

  return (
    <MobileTabShell pageLabel="Job Details">
      <div className="flex flex-col w-full pb-28">
        {/* Top Sub-bar & Breadcrumb */}
        <div className="w-full px-gutter-sm pt-space-xs pb-space-sm flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <button
              aria-label="Go back"
              className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
              onClick={() => navigate(-1)}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate max-w-[200px]">
              Engineering • {job.sector}
            </span>
          </div>

          <div className="flex items-center gap-space-2xs">
            <button
              aria-label="Save Job"
              className={`w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center hover:text-secondary transition-all active:scale-90 ${
                isSaved ? 'text-secondary' : 'text-on-surface-variant'
              }`}
              onClick={() => toggleSaveJob(job.id)}
              type="button"
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
              >
                {isSaved ? 'bookmark' : 'bookmark_border'}
              </span>
            </button>
            <button
              aria-label="Share Job"
              className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-secondary transition-all active:scale-90"
              onClick={handleShare}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">share</span>
            </button>
          </div>
        </div>

        <div className="px-gutter-sm flex flex-col gap-space-md">
          {/* Company Card Header */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm relative overflow-hidden">
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <div className="w-13 h-13 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-sm p-space-2xs shrink-0">
                  {job.companyIcon ? (
                    <span className="material-symbols-outlined text-[28px]">
                      {job.companyIcon}
                    </span>
                  ) : (
                    <SafeImage
                      alt={job.company}
                      className="w-10 h-10 rounded-lg object-cover"
                      src={job.companyLogo}
                    />
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-2xs">
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                      {job.company}
                    </span>
                    {job.verified && (
                      <span
                        className="inline-flex items-center justify-center text-tertiary-fixed-dim bg-tertiary w-4 h-4 rounded-full"
                        title="Verified Employer"
                      >
                        <span className="material-symbols-outlined text-[12px] font-bold">
                          verified
                        </span>
                      </span>
                    )}
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {job.companyTagline || 'Verified Partner • Growth Stage'}
                  </span>
                </div>
              </div>
              <span className="px-space-xs py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-secondary font-medium shrink-0">
                Actively Hiring
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-space-md pt-space-2xs font-body-sm text-body-sm text-on-surface-variant">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-outline">group</span>
                <span>{job.companySize || '250–500 employees'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-outline">
                  location_on
                </span>
                <span>{job.location}</span>
              </div>
            </div>
          </div>

          {/* Job Title & 2x2 Key Metadata Grid */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
            <div className="flex flex-col gap-1">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold leading-tight">
                {job.title}
              </h1>
              <div className="flex items-center gap-space-sm font-label-sm text-label-sm text-on-surface-variant pt-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  Posted {job.postedAgo}
                </span>
                <span className="w-1 h-1 rounded-full bg-outline" />
                <span className="flex items-center gap-1 text-secondary font-medium">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  {job.applicantsCount} applicants
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs pt-space-xs">
              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-tertiary-container">
                    payments
                  </span>
                  Compensation
                </span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {job.salaryDisplay.replace(' / yr', '').replace(',000', 'k').replace(',000', 'k')}
                </span>
                <span className="font-label-sm text-label-sm text-on-tertiary-container font-semibold">
                  {job.equity || '+ Competitive Equity'}
                </span>
              </div>

              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-secondary">
                    public
                  </span>
                  Workplace
                </span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {job.workplace}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {job.workplace === 'Remote' ? 'US • EU Friendly' : job.location}
                </span>
              </div>

              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">work</span>
                  Job Type
                </span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {job.employmentType}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Permanent W2
                </span>
              </div>

              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary-container">
                    psychology
                  </span>
                  Experience
                </span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {job.experienceLevel}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {job.yearsRequired}
                </span>
              </div>
            </div>
          </div>

          {/* AI Profile Match Card */}
          <div className="bg-gradient-to-br from-primary-container via-primary to-primary-container text-on-primary p-space-md rounded-xl shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="w-6 h-6 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">
                    auto_awesome
                  </span>
                </span>
                <span className="font-label-lg text-label-lg font-semibold tracking-wide text-primary-fixed">
                  JobConnect AI Match
                </span>
              </div>
              <div className="px-space-xs py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                {job.matchScore}% MATCH
              </div>
            </div>

            <p className="font-body-sm text-body-sm text-primary-fixed-dim leading-relaxed">
              Your verified experience in{' '}
              <span className="text-surface-container-lowest font-medium">
                {job.tags.slice(0, 2).join(', ')}
              </span>
              , and architectural design systems strongly correlates with {job.company}’s core stack.
            </p>

            {showMatchBreakdown && (
              <div className="mt-3 p-3 rounded-lg bg-black/20 space-y-1.5 font-label-sm text-xs">
                <div className="flex justify-between">
                  <span>Core Stack Overlap</span>
                  <span className="text-tertiary-fixed font-bold">98%</span>
                </div>
                <div className="flex justify-between">
                  <span>Seniority &amp; Scope Alignment</span>
                  <span className="text-tertiary-fixed font-bold">95%</span>
                </div>
                <div className="flex justify-between">
                  <span>Compensation Target Match</span>
                  <span className="text-tertiary-fixed font-bold">100%</span>
                </div>
              </div>
            )}

            <div className="mt-space-sm pt-space-xs flex items-center justify-between bg-surface-container-lowest/10 p-space-xs rounded-lg">
              <div className="flex items-center gap-1 text-tertiary-fixed">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span className="font-label-sm text-label-sm">High Profile Alignment</span>
              </div>
              <button
                className="font-label-sm text-label-sm text-primary-fixed underline cursor-pointer"
                onClick={() => setShowMatchBreakdown((p) => !p)}
                type="button"
              >
                {showMatchBreakdown ? 'Hide breakdown' : 'View breakdown'}
              </button>
            </div>
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="w-full flex items-center gap-space-2xs overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'overview' as DetailTab, label: 'Overview', target: 'tab-overview' },
              {
                id: 'responsibilities' as DetailTab,
                label: 'Responsibilities',
                target: 'tab-responsibilities',
              },
              {
                id: 'requirements' as DetailTab,
                label: 'Requirements',
                target: 'tab-requirements',
              },
              { id: 'perks' as DetailTab, label: 'Perks & Benefits', target: 'tab-perks' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`px-space-md py-space-xs rounded-full font-label-md text-label-md whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
                onClick={() => scrollToSection(tab.id, tab.target)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          <section className="flex flex-col gap-space-md scroll-mt-20" id="tab-overview">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
                <span className="w-1.5 h-4 bg-secondary rounded-full" />
                About the Role
              </h2>
              {job.aboutRole.map((para, idx) => (
                <p
                  key={idx}
                  className="font-body-md text-body-md text-on-surface-variant leading-relaxed"
                >
                  {para}
                </p>
              ))}
            </div>

            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
                <span className="w-1.5 h-4 bg-secondary rounded-full" />
                Core Technology Stack
              </h2>
              <div className="flex flex-wrap gap-space-xs">
                {[...job.tags, 'Vitest • Playwright', 'Turborepo', 'GitHub Actions CI/CD'].map(
                  (tech) => (
                    <span
                      key={tech}
                      className="px-space-sm py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold"
                    >
                      {tech}
                    </span>
                  )
                )}
              </div>
            </div>
          </section>

          {/* Responsibilities */}
          <section className="flex flex-col gap-space-md scroll-mt-20" id="tab-responsibilities">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
                <span className="w-1.5 h-4 bg-secondary rounded-full" />
                Key Responsibilities
              </h2>
              <ul className="flex flex-col gap-space-sm">
                {job.responsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-space-sm">
                    <span className="w-6 h-6 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    </span>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                        {item.title}
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Requirements */}
          <section className="flex flex-col gap-space-md scroll-mt-20" id="tab-requirements">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
                <span className="w-1.5 h-4 bg-secondary rounded-full" />
                What We Expect
              </h2>
              <div className="flex flex-col gap-space-sm">
                {job.requirements.map((req, idx) => (
                  <div key={idx} className="flex items-start gap-space-xs">
                    <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <span className="font-body-md text-body-md text-on-surface-variant">{req}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Perks & Benefits */}
          <section className="flex flex-col gap-space-md scroll-mt-20" id="tab-perks">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
                <span className="w-1.5 h-4 bg-secondary rounded-full" />
                Perks &amp; Benefits
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
                {job.perks.map((perk, idx) => (
                  <div
                    key={idx}
                    className="p-space-sm rounded-lg bg-surface-container-low flex items-center gap-space-sm"
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[22px]">{perk.icon}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                        {perk.title}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {perk.subtitle}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Meet the Hiring Team */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
              <span className="w-1.5 h-4 bg-secondary rounded-full" />
              Meet the Hiring Team
            </h2>
            <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
              <div className="flex items-center gap-space-sm">
                <SafeImage
                  alt={job.hiringManager.name}
                  className="w-12 h-12 rounded-full object-cover shadow-sm"
                  src={job.hiringManager.avatar}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-label-lg text-label-lg text-on-surface font-bold">
                      {job.hiringManager.name}
                    </span>
                    <span
                      className="text-secondary inline-flex"
                      title="LinkedIn Profile Connected"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {job.hiringManager.role}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-label-sm text-label-sm text-tertiary-fixed-dim bg-tertiary px-space-xs py-0.5 rounded-full font-bold">
                  {job.hiringManager.status}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                  {job.hiringManager.responseTime}
                </span>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant italic px-space-xs">
              {job.hiringManager.quote}
            </p>
          </div>

          {/* Office Hub */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
                <span className="w-1.5 h-4 bg-secondary rounded-full" />
                Office Hub
              </h2>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">
                {job.location}
              </span>
            </div>
            <div className="w-full h-40 rounded-lg shadow-inner relative overflow-hidden bg-surface-container">
              <SafeImage
                alt={job.officeLabel || 'Office Hub'}
                className="w-full h-full object-cover"
                src={job.officeImage}
              />
              <div className="absolute inset-0 bg-primary/15" />
              <div className="absolute bottom-2 left-2 bg-surface-container-lowest/90 px-space-sm py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-[14px] text-secondary">
                  pin_drop
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-medium">
                  {job.officeLabel || 'Mission Bay Technology Hub'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="fixed bottom-16 lg:bottom-0 left-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-xl px-gutter-sm py-space-sm shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="max-w-md mx-auto flex items-center gap-space-sm">
            <button
              aria-label="Save this role"
              className={`w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center hover:bg-surface-container-high active:scale-95 transition-all shrink-0 ${
                isSaved ? 'text-secondary' : 'text-on-surface'
              }`}
              onClick={() => toggleSaveJob(job.id)}
              type="button"
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
              >
                {isSaved ? 'star' : 'star_border'}
              </span>
            </button>

            <Link
              className={`flex-1 h-12 rounded-lg flex items-center justify-center gap-space-xs font-label-lg text-label-lg font-bold shadow-md active:scale-[0.98] transition-all ${
                isApplied
                  ? 'bg-tertiary-container text-tertiary-fixed'
                  : 'bg-primary-container hover:bg-secondary text-on-primary'
              }`}
              to={`/apply/${job.id}`}
            >
              <span>{isApplied ? 'View / Update Application' : 'Apply Now'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </MobileTabShell>
  );
}
