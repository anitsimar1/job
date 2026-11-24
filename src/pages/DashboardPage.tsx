import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MobileTabShell } from '../components/layout/MobileTabShell';
import { SafeImage } from '../components/common/SafeImage';
import { ExecutiveReportModal } from '../components/modals/ExecutiveReportModal';
import { MARCUS_AVANCE_AVATAR } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { IS_MOCK_MODE } from '../services';

export function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    jobs,
    applications,
    savedJobIds,
    appliedJobIds,
    profile,
    toggleSaveJob,
    quickApplyJob,
    showToast,
  } = useApp();

  const [referralState, setReferralState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [prepNotesOpen, setPrepNotesOpen] = useState(false);
  const [benchmarkOpen, setBenchmarkOpen] = useState(false);

  const activeAppsCount = applications.filter((a) => a.status !== 'archived').length;
  const slugMatchedCurated = jobs.filter((j) =>
    ['figma-staff-architect', 'datadog-principal-ui'].includes(j.id)
  );
  const curatedJobs =
    slugMatchedCurated.length > 0 ? slugMatchedCurated : jobs.slice(0, 2);

  const handleRequestReferral = () => {
    if (referralState !== 'idle') return;
    setReferralState('sending');
    window.setTimeout(() => {
      setReferralState('sent');
      showToast('Referral request sent to your network!', 'check_circle');
      window.setTimeout(() => setReferralState('idle'), 2500);
    }, 800);
  };

  const interviewCount = applications.filter(
    (a) => a.status === 'interviewing' || a.status === 'offered'
  ).length;

  return (
    <MobileTabShell pageLabel="Candidate Dashboard">
      <div className="flex flex-col w-full">
        <div className="flex flex-col gap-space-lg px-gutter-sm sm:px-gutter max-w-4xl mx-auto w-full pb-space-2xl">
          {/* Welcome Header & Profile Strength */}
          <div className="flex flex-col gap-space-md pt-space-xs">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-space-xs">
                  <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface">
                    Welcome back, {profile.fullName.split(' ')[0]}
                  </h1>
                  <span className="text-2xl">👋</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-xs mt-0.5">
                  <span>{profile.title || profile.targetRoles[0] || 'Candidate'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                  <span className="inline-flex items-center gap-1 text-tertiary font-medium">
                    <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse" />
                    Actively looking
                  </span>
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-space-xs">
                <button
                  className="h-10 px-space-md rounded-lg bg-surface-container-high text-primary font-label-md text-label-md hover:bg-surface-container-highest transition-colors flex items-center gap-space-xs"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href).catch(() => {});
                    showToast('Public profile link copied', 'share');
                  }}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  <span>Share Profile</span>
                </button>
              </div>
            </div>

            {/* Profile Strength Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md relative overflow-hidden">
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-surface-container-high/50 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start sm:items-center gap-space-md relative z-10">
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 64 64">
                    <circle
                      className="text-surface-container"
                      cx="32"
                      cy="32"
                      fill="none"
                      r="26"
                      stroke="currentColor"
                      strokeWidth="5"
                    />
                    <circle
                      className="text-secondary"
                      cx="32"
                      cy="32"
                      fill="none"
                      r="26"
                      stroke="currentColor"
                      strokeDasharray="163.36"
                      strokeDashoffset="3.26"
                      strokeLinecap="round"
                      strokeWidth="5"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-headline-sm text-headline-sm text-primary leading-none">
                      {profile.completeness}%
                    </span>
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <span className="font-headline-sm text-headline-sm text-on-surface">
                      Profile Strength: All-Star
                    </span>
                    <span className="bg-tertiary-fixed/40 text-tertiary text-label-sm font-label-sm px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <span
                        className="material-symbols-outlined text-[14px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified
                      </span>
                      Top 2%
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      tips_and_updates
                    </span>
                    Add 1 recommendation to hit perfect 100%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-space-xs shrink-0 relative z-10">
                <button
                  className="w-full sm:w-auto h-11 px-space-md rounded-lg bg-surface-container text-primary font-label-md text-label-md hover:bg-surface-container-high transition-all flex items-center justify-center gap-1.5"
                  onClick={handleRequestReferral}
                  type="button"
                >
                  {referralState === 'sending' ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Inviting...</span>
                    </>
                  ) : referralState === 'sent' ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] text-tertiary font-bold">
                        check_circle
                      </span>
                      <span>Invite Sent!</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      <span>Request Referral</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm sm:gap-space-md">
            <Link
              className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              to="/applications"
            >
              <div className="flex items-center justify-between mb-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">assignment</span>
                </div>
                <span className="font-label-sm text-label-sm bg-surface-container text-primary px-2 py-0.5 rounded-full">
                  +3 this week
                </span>
              </div>
              <div>
                <span className="font-headline-lg text-headline-lg text-on-surface">
                  {IS_MOCK_MODE ? activeAppsCount + 10 : activeAppsCount}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Applications Active
                </p>
              </div>
            </Link>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                </div>
                <span className="font-label-sm text-label-sm bg-tertiary-fixed/30 text-tertiary px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span> +24%
                </span>
              </div>
              <div>
                <span className="font-headline-lg text-headline-lg text-on-surface">86</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Profile Views
                </p>
              </div>
            </div>

            <Link
              className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              to="/applications"
            >
              <div className="flex items-center justify-between mb-space-sm">
                <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                </div>
                <span className="font-label-sm text-label-sm bg-primary text-on-primary px-2 py-0.5 rounded-full">
                  Active Round
                </span>
              </div>
              <div>
                <span className="font-headline-lg text-headline-lg text-on-surface">
                  {IS_MOCK_MODE ? 3 : interviewCount}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Interview &amp; Offer Stages
                </p>
              </div>
            </Link>

            <Link
              className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              to="/jobs"
            >
              <div className="flex items-center justify-between mb-space-sm">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">bookmark</span>
                </div>
                <span className="font-label-sm text-label-sm bg-surface-container-high text-primary px-2 py-0.5 rounded-full">
                  {jobs.length} live roles
                </span>
              </div>
              <div>
                <span className="font-headline-lg text-headline-lg text-on-surface">
                  {IS_MOCK_MODE ? 26 + savedJobIds.length : savedJobIds.length}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Saved Roles
                </p>
              </div>
            </Link>
          </div>

          {/* Upcoming Interview Feature Card */}
          <div className="bg-primary text-on-primary rounded-xl p-space-md sm:p-space-lg shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-primary-container/40 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col gap-space-md relative z-10">
              <div className="flex items-center justify-between flex-wrap gap-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-tertiary-fixed-dim animate-ping" />
                  <span className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider">
                    Next Up • Tomorrow
                  </span>
                </div>
                <span className="font-label-sm text-label-sm bg-primary-container text-primary-fixed px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">videocam</span> 60 Min
                  Technical
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
                <div className="flex items-start gap-space-md">
                  <SafeImage
                    alt="Apex Cloud Systems"
                    className="w-14 h-14 rounded-lg object-cover shrink-0 bg-surface-container shadow-sm"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAW9dbWM71hAxljxNgInMCiwTwx8DLMCNviSdukNE4PCXYZQi8tCs7jHqdYZRB5dgz_U6M0NGrtEOXNLbMSpKt_M4rs74j9efah3gDBxRsyNSc_737iKUbqIygyuL2SMxNgMTucDnkjCCvDeNS0u3miJ7kw276FtH_blJmQTKNTzWRWQ0eAYH7GaMZa4VHIvsxZ8UOSeoMQP464GFDFr9kJHFObwxAcIx2wdTjaQLc"
                  />
                  <div className="flex flex-col">
                    <h2 className="font-headline-md text-headline-md text-on-primary">
                      Technical Deep Dive with Apex Cloud Systems
                    </h2>
                    <p className="font-body-sm text-body-sm text-primary-fixed mt-0.5">
                      Tomorrow, 2:00 PM – 3:00 PM EST • Zoom
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <SafeImage
                        alt="Marcus Vance"
                        className="w-6 h-6 rounded-full object-cover"
                        src={MARCUS_AVANCE_AVATAR}
                      />
                      <span className="font-label-md text-label-md text-inverse-on-surface">
                        Marcus Vance (VP Engineering)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {prepNotesOpen && (
                <div className="p-3.5 rounded-xl bg-black/25 text-primary-fixed text-body-sm space-y-1">
                  <p className="font-label-md text-white font-bold">
                    System Design Rubric Highlights
                  </p>
                  <p>• Multi-region telemetry streaming architecture &amp; WebSocket backpressure</p>
                  <p>• Next.js App Router caching boundaries &amp; Edge SSR budgets</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-space-xs pt-space-xs">
                <button
                  className="w-full sm:w-auto h-11 px-space-lg rounded-lg bg-surface-container-lowest text-primary font-label-lg text-label-lg hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center gap-space-xs"
                  onClick={() => showToast('Zoom meeting room opens 15 min prior', 'videocam')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">videocam</span>
                  <span>Join Meeting</span>
                </button>
                <button
                  className="w-full sm:w-auto h-11 px-space-md rounded-lg bg-primary-container/80 text-on-primary font-label-md text-label-md hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-space-xs"
                  onClick={() => setPrepNotesOpen((p) => !p)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">notes</span>
                  <span>{prepNotesOpen ? 'Hide Prep Notes' : 'View Prep Notes & Rubric'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Pipeline Tracker */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  timeline
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Active Pipeline Tracker
                </h2>
              </div>
              <Link
                className="font-label-md text-label-md text-secondary hover:underline flex items-center gap-1"
                to="/applications"
              >
                <span>View All ({applications.length})</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {!IS_MOCK_MODE ? (
              applications.length === 0 ? (
                <div className="bg-surface-container-low rounded-xl p-space-md text-center flex flex-col items-center gap-2">
                  <p className="font-label-md text-on-surface font-semibold">
                    No submitted applications yet
                  </p>
                  <p className="font-body-sm text-on-surface-variant">
                    Apply to a role to receive confirmation emails and track recruiter review stages here.
                  </p>
                  <Link
                    className="mt-1 h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md font-bold inline-flex items-center gap-1.5"
                    to="/jobs"
                  >
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    <span>Browse Open Roles</span>
                  </Link>
                </div>
              ) : (
                applications.slice(0, 3).map((app) => (
                  <div
                    key={app.id}
                    className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center font-bold text-primary shadow-xs">
                          <span className="font-headline-sm text-headline-sm">
                            {app.company.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface">
                            {app.company}
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {app.jobTitle} • {app.location}
                          </p>
                        </div>
                      </div>
                      <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-space-sm py-1 rounded-full font-semibold">
                        {app.stageBadge}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-space-xs">
                      {app.stageSteps.map((step, idx) => {
                        const completed = idx < app.stageNumber;
                        const current = idx + 1 === app.stageNumber;
                        return (
                          <div key={step} className="flex flex-col gap-1">
                            <div
                              className={`h-2 rounded-full ${
                                completed || current
                                  ? `bg-secondary ${current ? 'animate-pulse' : ''}`
                                  : 'bg-surface-container-highest'
                              }`}
                            />
                            <span
                              className={`font-label-sm text-label-sm truncate ${
                                current
                                  ? 'text-primary font-bold'
                                  : completed
                                    ? 'text-on-surface-variant'
                                    : 'text-on-surface-variant/60'
                              }`}
                            >
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )
            ) : (
              <>
                {/* Preview Item 1 */}
                <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center font-bold text-primary shadow-xs">
                        <span className="font-headline-sm text-headline-sm">A</span>
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface">
                          Apex Cloud Systems
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Lead Systems Architect • Full-time Remote
                        </p>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-space-sm py-1 rounded-full font-semibold">
                      Stage 4 of 5: Final Round
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-space-xs">
                    {['Applied', 'Recruiter', 'Tech Screen', 'System Design'].map((s, idx) => (
                      <div key={s} className="flex flex-col gap-1">
                        <div
                          className={`h-2 rounded-full bg-secondary ${idx === 3 ? 'animate-pulse' : ''}`}
                        />
                        <span
                          className={`font-label-sm text-label-sm truncate ${
                            idx === 3 ? 'text-primary font-bold' : 'text-on-surface-variant'
                          }`}
                        >
                          {s}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Item 2 */}
                <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center font-bold text-secondary shadow-xs">
                        <span className="font-headline-sm text-headline-sm">S</span>
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface">Stripe</h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Staff UI Infrastructure Engineer • Seattle / Hybrid
                        </p>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm bg-surface-container-high text-primary px-space-sm py-1 rounded-full font-semibold">
                      Stage 2 of 4: Tech Screen
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-space-xs">
                    {['Applied', 'Tech Screen', 'Architecture', 'Executive Offer'].map((s, idx) => (
                      <div key={s} className="flex flex-col gap-1">
                        <div
                          className={`h-2 rounded-full ${
                            idx === 0
                              ? 'bg-secondary'
                              : idx === 1
                              ? 'bg-secondary animate-pulse'
                              : 'bg-surface-container-highest'
                          }`}
                        />
                        <span
                          className={`font-label-sm text-label-sm truncate ${
                            idx === 1
                              ? 'text-primary font-bold'
                              : idx > 1
                              ? 'text-on-surface-variant/60'
                              : 'text-on-surface-variant'
                          }`}
                        >
                          {s}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Curated For Your Experience */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span
                  className="material-symbols-outlined text-secondary text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Curated For Your Experience
                </h2>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Updated 2h ago
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {curatedJobs.map((job) => {
                const isSaved = savedJobIds.includes(job.id);
                const isApplied = appliedJobIds.includes(job.id);
                return (
                  <div
                    key={job.id}
                    className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-space-md"
                  >
                    <div className="flex flex-col gap-space-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-space-sm">
                          <SafeImage
                            alt={job.company}
                            className="w-12 h-12 rounded-lg object-cover"
                            src={job.companyLogo}
                          />
                          <div className="flex flex-col">
                            <span className="font-label-md text-label-md text-on-surface-variant">
                              {job.company}
                            </span>
                            <h3 className="font-headline-sm text-headline-sm text-on-surface">
                              {job.title}
                            </h3>
                          </div>
                        </div>
                        <button
                          aria-label="Save Job"
                          className={`p-1 ${
                            isSaved ? 'text-secondary' : 'text-on-surface-variant hover:text-secondary'
                          }`}
                          onClick={() => toggleSaveJob(job.id)}
                          type="button"
                        >
                          <span
                            className="material-symbols-outlined text-[22px]"
                            style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            {isSaved ? 'bookmark' : 'bookmark_border'}
                          </span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-surface-container text-primary font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">bolt</span>{' '}
                          {job.matchScore}% Match
                        </span>
                        <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-tertiary-fixed/30 text-tertiary font-bold">
                          {job.salaryDisplay}
                        </span>
                        <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant">
                          {job.location}
                        </span>
                      </div>

                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                        {job.aboutRole[0]}
                      </p>
                    </div>

                    <div className="flex items-center gap-space-xs pt-space-xs">
                      <button
                        className={`flex-1 h-11 px-space-md rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-1 ${
                          isApplied
                            ? 'bg-tertiary-container text-tertiary-fixed'
                            : 'bg-primary text-on-primary hover:bg-secondary'
                        }`}
                        disabled={isApplied}
                        onClick={async () => {
                          const result = await quickApplyJob(job);
                          if (result === 'auth_required') {
                            navigate('/auth', { state: { from: location.pathname } });
                          }
                        }}
                        type="button"
                      >
                        <span>{isApplied ? 'Applied' : 'Quick Apply'}</span>
                        <span className="material-symbols-outlined text-[16px]">
                          {isApplied ? 'check_circle' : 'send'}
                        </span>
                      </button>
                      <button
                        className="h-11 px-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        type="button"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Trends & Salary Insights */}
          <div className="bg-surface-container-low rounded-xl p-space-md sm:p-space-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex items-start gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">query_stats</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-space-xs flex-wrap">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    Frontend Architecture Insights
                  </h3>
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed text-label-sm font-label-sm px-2 py-0.5 rounded-full font-bold">
                    Q2 High Demand
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Demand is up{' '}
                  <span className="font-semibold text-tertiary">+18% in SF &amp; Remote</span> roles
                  this month. Average base compensation benchmark:{' '}
                  <span className="font-semibold text-on-surface">$192,500</span> + equity packages.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-space-xs shrink-0 w-full md:w-auto">
              <button
                className="w-full md:w-auto h-11 px-space-md rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md hover:bg-surface-container shadow-xs transition-colors flex items-center justify-center gap-1.5"
                onClick={() => setBenchmarkOpen(true)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">insights</span>
                <span>Explore Benchmark Tool</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ExecutiveReportModal onClose={() => setBenchmarkOpen(false)} open={benchmarkOpen} />
    </MobileTabShell>
  );
}
