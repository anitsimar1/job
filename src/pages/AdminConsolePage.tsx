import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell, AdminTabKey } from '../components/layout/AdminShell';
import { PostUrgentRoleModal } from '../components/modals/PostUrgentRoleModal';
import { SafeImage } from '../components/common/SafeImage';
import { useApp } from '../context/AppContext';
import { adminService } from '../services/adminService';
import { API_BASE_URL, IS_MOCK_MODE } from '../services/apiClient';
import { BackendApplicationStatus, ModerationListing } from '../types';

const APPLICATION_STATUS_OPTIONS: BackendApplicationStatus[] = [
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'REJECTED',
  'HIRED',
];

const TIMEFRAMES = ['Last 7 Days', 'Last 30 Days', 'Quarter to Date'] as const;
const TENANT_SCOPES = [
  'Global Operations (All Regions)',
  'North America (US & Canada)',
  'Europe & UK Remote Hub',
  'APAC Engineering Network',
] as const;

const WEEKLY_CADENCE: Record<
  (typeof TIMEFRAMES)[number],
  { label: string; candidatesPct: number; listingsPct: number; current?: boolean }[]
> = {
  'Last 7 Days': [
    { label: 'W1', candidatesPct: 54, listingsPct: 32 },
    { label: 'W2', candidatesPct: 68, listingsPct: 45 },
    { label: 'W3', candidatesPct: 82, listingsPct: 58 },
    { label: 'W4', candidatesPct: 94, listingsPct: 76, current: true },
  ],
  'Last 30 Days': [
    { label: 'W1', candidatesPct: 60, listingsPct: 35 },
    { label: 'W2', candidatesPct: 75, listingsPct: 48 },
    { label: 'W3', candidatesPct: 90, listingsPct: 65 },
    { label: 'W4', candidatesPct: 100, listingsPct: 82, current: true },
  ],
  'Quarter to Date': [
    { label: 'W1', candidatesPct: 66, listingsPct: 42 },
    { label: 'W2', candidatesPct: 80, listingsPct: 56 },
    { label: 'W3', candidatesPct: 92, listingsPct: 72 },
    { label: 'W4', candidatesPct: 100, listingsPct: 88, current: true },
  ],
};

export function AdminConsolePage() {
  const {
    jobs,
    profile,
    adminMetrics,
    moderationQueue,
    adminUsers,
    adminApplications,
    moderateListing,
    createUrgentRole,
    deleteJobAdmin,
    updateAdminApplicationStatus,
    refreshAdminData,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTabKey>('overview');
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>('Last 30 Days');
  const [timeframeMenuOpen, setTimeframeMenuOpen] = useState(false);
  const [tenantScopeIdx, setTenantScopeIdx] = useState(0);
  const [urgentModalOpen, setUrgentModalOpen] = useState(false);
  const [investigatingItem, setInvestigatingItem] = useState<ModerationListing | null>(null);
  const [jobFilter, setJobFilter] = useState<'all' | 'remote' | 'featured'>('all');
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [autoFlagDuplicates, setAutoFlagDuplicates] = useState(true);

  useEffect(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  const pendingCount = moderationQueue.filter(
    (m) => m.status === 'NEW LISTING' || m.status === 'DUPLICATE'
  ).length;

  const tenantScope = TENANT_SCOPES[tenantScopeIdx];

  const scopedMetrics = useMemo(() => {
    const scale =
      tenantScopeIdx === 0 ? 1 : tenantScopeIdx === 1 ? 0.58 : tenantScopeIdx === 2 ? 0.27 : 0.15;
    const tfScale = timeframe === 'Last 7 Days' ? 0.28 : timeframe === 'Last 30 Days' ? 1 : 2.6;
    return {
      activeJobs: Math.max(12, Math.round(adminMetrics.activeJobs * scale)),
      totalCandidates: Math.max(180, Math.round(adminMetrics.totalCandidates * scale)),
      applicationsSubmitted: Math.max(
        90,
        Math.round(adminMetrics.applicationsSubmitted * scale * tfScale)
      ),
      placementsMade: Math.max(8, Math.round(adminMetrics.placementsMade * scale * tfScale)),
    };
  }, [adminMetrics, tenantScopeIdx, timeframe]);

  const filteredJobs = useMemo(() => {
    if (jobFilter === 'remote') return jobs.filter((j) => j.workplace === 'Remote');
    if (jobFilter === 'featured') return jobs.filter((j) => j.featured);
    return jobs;
  }, [jobs, jobFilter]);

  const handleCycleTenant = () => {
    const nextIdx = (tenantScopeIdx + 1) % TENANT_SCOPES.length;
    setTenantScopeIdx(nextIdx);
    showToast(`Tenant scope: ${TENANT_SCOPES[nextIdx]}`, 'public');
  };

  const handleExportCsv = () => {
    adminService.exportMetricsCsv(adminMetrics, moderationQueue);
    showToast('Exported metrics & moderation report CSV', 'file_download');
  };

  return (
    <AdminShell activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="flex flex-col w-full pb-6 px-gutter-sm sm:px-gutter">
        {/* Context Switcher & Sub-Header */}
        <div className="flex flex-col gap-space-xs mt-space-sm mb-space-md">
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">
                Admin Console
              </span>
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                Platform Hub
              </span>
            </div>

            <div className="relative">
              <button
                className="flex items-center gap-space-2xs px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-label-sm font-label-sm active:scale-95 transition-transform"
                onClick={() => setTimeframeMenuOpen((prev) => !prev)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  calendar_today
                </span>
                <span>{timeframe}</span>
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                  expand_more
                </span>
              </button>

              {timeframeMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-surface-container-lowest shadow-xl border border-outline-variant/25 py-1 z-30">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      className={`w-full text-left px-3 py-2 text-label-md font-label-md hover:bg-surface-container-low ${
                        tf === timeframe ? 'text-secondary font-bold' : 'text-on-surface'
                      }`}
                      onClick={() => {
                        setTimeframe(tf);
                        setTimeframeMenuOpen(false);
                        showToast(`Metrics window: ${tf}`, 'calendar_today');
                      }}
                      type="button"
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tenant & Global Scope Trigger */}
          <div className="flex items-center justify-between bg-surface-container-lowest p-space-sm rounded-xl shadow-sm">
            <div className="flex items-center gap-space-xs min-w-0">
              <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
                <span className="material-symbols-outlined text-[18px]">public</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold">
                  Tenant Scope
                </span>
                <p className="font-headline-sm text-headline-sm text-primary font-bold truncate">
                  {tenantScope}
                </p>
              </div>
            </div>
            <button
              aria-label="Switch Tenant"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors shrink-0"
              onClick={handleCycleTenant}
              title="Cycle Tenant Region"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
            </button>
          </div>
        </div>

        {/* Primary Action Bar */}
        <div className="flex gap-space-xs overflow-x-auto pb-1 mb-space-md no-scrollbar">
          <button
            className="shrink-0 flex items-center gap-space-xs px-3.5 py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md shadow-sm active:scale-95 transition-all"
            onClick={() => setUrgentModalOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Post Urgent Role</span>
          </button>
          <button
            className="shrink-0 flex items-center gap-space-xs px-3.5 py-2 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md shadow-sm hover:bg-surface-container active:scale-95 transition-all"
            onClick={handleExportCsv}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">
              file_download
            </span>
            <span>Export CSV</span>
          </button>
          <button
            className="shrink-0 flex items-center gap-space-xs px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-sm hover:bg-surface-container active:scale-95 transition-all"
            onClick={() => setActiveTab('jobs')}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              corporate_fare
            </span>
            <span>Manage Employers</span>
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* KPI Metric Cards (2x2 on mobile, 4 cols on lg) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-xs sm:gap-space-sm mb-space-md">
              {/* Active Jobs */}
              <div className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Active Jobs
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-secondary-fixed flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[16px]">work_outline</span>
                  </div>
                </div>
                <div>
                  <p className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
                    {scopedMetrics.activeJobs.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="flex items-center text-[11px] font-bold text-tertiary-container bg-tertiary-fixed/60 px-1.5 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[12px] mr-0.5 font-bold">
                        trending_up
                      </span>
                      {adminMetrics.activeJobsGrowth}
                    </span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant truncate">
                      vs last mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Candidates */}
              <div className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Candidates
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                  </div>
                </div>
                <div>
                  <p className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
                    {scopedMetrics.totalCandidates.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="flex items-center text-[11px] font-bold text-tertiary-container bg-tertiary-fixed/60 px-1.5 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[12px] mr-0.5 font-bold">
                        trending_up
                      </span>
                      {adminMetrics.candidatesGrowth}
                    </span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant truncate">
                      vs last mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Applications Submitted */}
              <div className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Applications
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[16px]">outgoing_mail</span>
                  </div>
                </div>
                <div>
                  <p className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
                    {scopedMetrics.applicationsSubmitted.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="flex items-center text-[11px] font-bold text-tertiary-container bg-tertiary-fixed/60 px-1.5 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[12px] mr-0.5 font-bold">
                        trending_up
                      </span>
                      {adminMetrics.applicationsGrowth}
                    </span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant truncate">
                      vs last mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Placements Made */}
              <div className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Placements
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                </div>
                <div>
                  <p className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
                    {scopedMetrics.placementsMade.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="flex items-center text-[10px] font-semibold text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[11px] mr-0.5 text-secondary">
                        timer
                      </span>
                      {adminMetrics.avgHireDays}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md mb-space-md">
              {/* Hiring Pipeline Funnel Overview */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-space-sm gap-2">
                  <div>
                    <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                      Hiring Funnel Velocity
                    </h2>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Conversion across application lifecycle
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-headline-sm text-headline-sm font-bold text-tertiary-container">
                      {adminMetrics.offerAcceptanceRate}
                    </span>
                    <span className="block font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">
                      Offer Acceptance
                    </span>
                  </div>
                </div>

                {/* Funnel Multi-segment Visual Indicator */}
                <div className="w-full h-3 rounded-full bg-surface-container-low flex overflow-hidden mb-space-sm">
                  <div className="bg-primary-container h-full" style={{ width: '38%' }} title="Applied" />
                  <div className="bg-secondary h-full" style={{ width: '25%' }} title="Screened" />
                  <div
                    className="bg-secondary-container h-full"
                    style={{ width: '18%' }}
                    title="Interviewed"
                  />
                  <div className="bg-surface-tint h-full" style={{ width: '10%' }} title="Offered" />
                  <div className="bg-tertiary-fixed-dim h-full" style={{ width: '9%' }} title="Hired" />
                </div>

                {/* Funnel Stage Micro Metrics */}
                <div className="grid grid-cols-5 gap-1 pt-1 text-center">
                  <div className="flex flex-col items-center">
                    <span className="w-2 h-2 rounded-full bg-primary-container mb-1" />
                    <span className="font-label-sm text-[10px] text-on-surface-variant">Applied</span>
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      14.2k
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="w-2 h-2 rounded-full bg-secondary mb-1" />
                    <span className="font-label-sm text-[10px] text-on-surface-variant">
                      Screened
                    </span>
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      8,410
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="w-2 h-2 rounded-full bg-secondary-container mb-1" />
                    <span className="font-label-sm text-[10px] text-on-surface-variant">
                      Interview
                    </span>
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      3,150
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="w-2 h-2 rounded-full bg-surface-tint mb-1" />
                    <span className="font-label-sm text-[10px] text-on-surface-variant">Offered</span>
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      420
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim mb-1" />
                    <span className="font-label-sm text-[10px] font-bold text-tertiary">Hired</span>
                    <span className="font-label-md text-label-md font-bold text-tertiary">
                      {scopedMetrics.placementsMade}
                    </span>
                  </div>
                </div>
              </div>

              {/* Candidate vs Listing Cadence */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-space-sm gap-2">
                  <div>
                    <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                      Candidate vs Listing Cadence
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Weekly distribution comparison
                    </p>
                  </div>
                  <div className="flex items-center gap-space-xs text-[11px] font-label-sm shrink-0">
                    <span className="flex items-center gap-1 text-on-surface-variant">
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                      Candidates
                    </span>
                    <span className="flex items-center gap-1 text-on-surface-variant">
                      <span className="w-2 h-2 rounded-full bg-surface-variant" />
                      Listings
                    </span>
                  </div>
                </div>

                {/* Inline Column Graph */}
                <div className="w-full h-32 flex items-end justify-between pt-2 pb-1 gap-2">
                  {WEEKLY_CADENCE[timeframe].map((bar) => (
                    <div
                      key={bar.label}
                      className={`flex-1 flex flex-col items-center gap-1 h-full justify-end ${
                        bar.current ? 'bg-surface-container-low/60 rounded-lg p-0.5' : ''
                      }`}
                    >
                      <div className="flex items-end gap-1 h-24">
                        <div
                          className={`w-2.5 rounded-t transition-all duration-300 ${
                            bar.current ? 'bg-primary-container' : 'bg-secondary'
                          }`}
                          style={{ height: `${bar.candidatesPct}%` }}
                        />
                        <div
                          className={`w-2.5 rounded-t transition-all duration-300 ${
                            bar.current ? 'bg-secondary-container' : 'bg-surface-container-highest'
                          }`}
                          style={{ height: `${bar.listingsPct}%` }}
                        />
                      </div>
                      <span
                        className={`font-label-sm text-[10px] ${
                          bar.current ? 'font-bold text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pending Review & Moderation Queue */}
            <div className="flex flex-col gap-space-sm mb-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                    Review &amp; Moderation
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                    {pendingCount > 0 ? `${pendingCount + 1} Pending` : 'All Clear'}
                  </span>
                </div>
                <button
                  className="font-label-sm text-label-sm text-secondary font-semibold hover:underline"
                  onClick={() => setActiveTab('jobs')}
                  type="button"
                >
                  View All ({jobs.length + moderationQueue.length})
                </button>
              </div>

              {moderationQueue.map((item) => {
                const isDuplicate = item.status === 'DUPLICATE';
                const isNew = item.status === 'NEW LISTING';
                const isApproved = item.status === 'APPROVED' || item.status === 'ACTIVE';
                const isRejected = item.status === 'REJECTED';

                return (
                  <div
                    key={item.id}
                    className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex flex-col gap-space-xs"
                  >
                    <div className="flex items-start justify-between gap-space-xs">
                      <div className="flex items-center gap-space-xs min-w-0">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-label-lg shrink-0 ${
                            isDuplicate
                              ? 'bg-error-container/40 text-error'
                              : isApproved
                              ? 'bg-surface-container-high text-secondary'
                              : 'bg-surface-container text-primary'
                          }`}
                        >
                          {item.initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-headline-sm text-[15px] font-bold text-on-surface truncate">
                            {item.title}
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                            {item.company} • {item.location}
                          </p>
                        </div>
                      </div>

                      {isNew && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-label-sm text-[10px] font-bold uppercase tracking-wider">
                          New Listing
                        </span>
                      )}
                      {isDuplicate && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">flag</span>
                          Duplicate
                        </span>
                      )}
                      {isApproved && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-tertiary-fixed text-tertiary font-label-sm text-[10px] font-bold uppercase tracking-wider">
                          {item.status === 'APPROVED' ? 'Approved' : 'Active'}
                        </span>
                      )}
                      {isRejected && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-[10px] font-bold uppercase tracking-wider">
                          Rejected
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-space-2xs gap-2 flex-wrap">
                      {isDuplicate ? (
                        <div className="flex items-center gap-space-2xs text-[11px] text-error font-medium">
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                          <span>{item.flagReason || 'Potential duplicate listing'}</span>
                        </div>
                      ) : item.status === 'ACTIVE' ? (
                        <div className="flex items-center gap-space-2xs text-[11px] text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px] text-secondary">
                            insights
                          </span>
                          <span>{item.submittedAgo}</span>
                          <span>•</span>
                          <span className="font-semibold text-tertiary">
                            {item.note || 'Verified Sponsor'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-space-2xs text-[11px] text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px] text-tertiary">
                            schedule
                          </span>
                          <span>{item.submittedAgo}</span>
                          <span>•</span>
                          <span className="font-semibold text-on-surface">{item.salaryRange}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-space-xs">
                        {isNew && (
                          <>
                            <button
                              className="px-2.5 py-1 rounded bg-surface-container-low text-error font-label-sm text-label-sm font-semibold hover:bg-error-container active:scale-95 transition-all"
                              onClick={() => moderateListing(item.id, 'REJECTED')}
                              type="button"
                            >
                              Reject
                            </button>
                            <button
                              className="px-3 py-1 rounded bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold active:scale-95 transition-all"
                              onClick={() => moderateListing(item.id, 'APPROVED')}
                              type="button"
                            >
                              Approve
                            </button>
                          </>
                        )}

                        {isDuplicate && (
                          <button
                            className="px-3 py-1 rounded bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold active:scale-95 transition-all"
                            onClick={() => setInvestigatingItem(item)}
                            type="button"
                          >
                            Investigate
                          </button>
                        )}

                        {(isApproved || isRejected) && (
                          <button
                            className="px-3 py-1 rounded bg-surface-container text-primary font-label-sm text-label-sm font-semibold hover:bg-surface-container-high active:scale-95 transition-all"
                            onClick={() => setActiveTab('jobs')}
                            type="button"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* System Health & Platform Integrity */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm mb-space-sm">
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim" />
                  <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                    System Telemetry
                  </h2>
                </div>
                <span className="font-label-sm text-label-sm font-semibold text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded">
                  All Systems Green
                </span>
              </div>

              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      sync_alt
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      ATS Ingest Webhooks
                    </span>
                  </div>
                  <span className="font-label-md text-label-md font-bold text-primary">
                    99.98% Healthy
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[18px] text-tertiary">
                      mark_email_read
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      Candidate Email Delivery
                    </span>
                  </div>
                  <span className="font-label-md text-label-md font-bold text-tertiary">
                    100.0% Optimal
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[18px] text-secondary-container">
                      psychology
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      AI Match Ranker
                    </span>
                  </div>
                  <span className="font-label-md text-label-md font-bold text-on-surface">
                    140ms latency
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Jobs & Moderation Management Tab */}
        {activeTab === 'jobs' && (
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                  Active Listings &amp; Employer Directory
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {filteredJobs.length} verified roles currently live on JobConnect
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {(['all', 'remote', 'featured'] as const).map((f) => (
                  <button
                    key={f}
                    className={`px-3 py-1 rounded-full font-label-sm text-label-sm capitalize transition-colors ${
                      jobFilter === f
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                    }`}
                    onClick={() => setJobFilter(f)}
                    type="button"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex flex-col justify-between gap-space-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-space-xs min-w-0">
                      <SafeImage
                        alt={job.company}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 bg-surface-container"
                        fallbackText={job.company.slice(0, 2).toUpperCase()}
                        src={job.companyLogo}
                      />
                      <div className="min-w-0">
                        <h3 className="font-headline-sm text-[15px] font-bold text-on-surface truncate">
                          {job.title}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                          {job.company} • {job.location}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-tertiary-fixed text-tertiary font-label-sm text-[10px] font-bold">
                      {job.workplace}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {job.salaryDisplay} • {job.applicantsCount} applicants
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        className="px-3 py-1 rounded-lg bg-surface-container text-primary font-label-sm font-semibold hover:bg-surface-container-high"
                        to={`/jobs/${job.id}`}
                      >
                        Inspect
                      </Link>
                      <button
                        className="px-2.5 py-1 rounded-lg bg-surface-container-low text-error font-label-sm font-semibold hover:bg-error-container transition-colors"
                        onClick={() => deleteJobAdmin(job.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Candidates & Applications Directory Tab */}
        {activeTab === 'candidates' && (
          <div className="flex flex-col gap-space-md">
            {/* Registered Users & Candidate Profiles */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                    Registered Candidates &amp; Users
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Account directory &amp; verified technical leadership profiles
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-tertiary font-label-sm font-bold">
                  {adminUsers.length > 0 ? `${adminUsers.length} Accounts` : 'Top 2% Cohort'}
                </span>
              </div>

              {(adminUsers.length > 0
                ? adminUsers.map((u) => ({
                    id: String(u.id),
                    name: u.fullName,
                    role: u.email,
                    location: u.phone || 'Verified Contact',
                    match: u.roles.some((r) => r.includes('ADMIN')) ? 'ADMIN' : 'JOB_SEEKER',
                    avatar: u.profileImage || '',
                    skills: [u.enabled ? 'Active Account' : 'Disabled'],
                  }))
                : [
                    {
                      id: 'c1',
                      name: profile.fullName,
                      role: profile.title,
                      location: profile.location,
                      match: '98% Verified',
                      avatar: profile.avatar,
                      skills: profile.skills.slice(0, 3).map((s) => s.name),
                    },
                    {
                      id: 'c2',
                      name: 'Marcus Chen',
                      role: 'Principal Distributed Systems Engineer',
                      location: 'Seattle, WA (Hybrid)',
                      match: '96% Verified',
                      avatar: '',
                      skills: ['Rust', 'Kubernetes', 'Kafka'],
                    },
                    {
                      id: 'c3',
                      name: 'Priya Nair',
                      role: 'Director of Product Design Systems',
                      location: 'New York, NY (Remote)',
                      match: '95% Verified',
                      avatar: '',
                      skills: ['Figma Tokens', 'React 19', 'WCAG AAA'],
                    },
                  ]
              ).map((cand) => (
                <div
                  key={cand.id}
                  className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="flex items-center gap-space-sm">
                    <SafeImage
                      alt={cand.name}
                      className="w-11 h-11 rounded-full object-cover bg-surface-container"
                      fallbackText={cand.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                      src={cand.avatar}
                    />
                    <div>
                      <h3 className="font-headline-sm text-[15px] font-bold text-on-surface">
                        {cand.name}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {cand.role} • {cand.location}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cand.skills.map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded bg-surface-container-low text-[11px] font-label-sm text-primary"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed/60 text-tertiary text-[11px] font-bold">
                      {cand.match}
                    </span>
                    <Link
                      className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-sm font-semibold"
                      to="/profile"
                    >
                      View Dossier
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Candidate Applications Management */}
            <div className="flex flex-col gap-space-sm pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                    Applications Review &amp; Status Control
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Update candidate hiring stage across submitted job applications
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-secondary font-label-sm font-bold">
                  {adminApplications.length} Submitted
                </span>
              </div>

              {adminApplications.length === 0 ? (
                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm text-center font-body-sm text-on-surface-variant">
                  No submitted candidate applications found yet.
                </div>
              ) : (
                adminApplications.map((app) => (
                  <div
                    key={String(app.id)}
                    className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="min-w-0">
                      <h3 className="font-headline-sm text-[15px] font-bold text-on-surface truncate">
                        {app.jobTitle} — {app.company}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {app.applicantName || 'Candidate'} ({app.applicantEmail || 'Verified'}) •{' '}
                        {app.location}
                      </p>
                      {app.resumeFileName && (
                        <p className="font-label-sm text-xs text-secondary mt-0.5">
                          Resume: {app.resumeFileName}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="sr-only" htmlFor={`app-status-${app.id}`}>
                        Application Status
                      </label>
                      <select
                        className="h-9 px-3 rounded-lg bg-surface-container-low text-primary font-label-md text-label-md font-semibold outline-none focus:ring-2 focus:ring-secondary"
                        id={`app-status-${app.id}`}
                        onChange={(e) =>
                          updateAdminApplicationStatus(
                            app.id,
                            e.target.value as BackendApplicationStatus
                          )
                        }
                        value={app.status}
                      >
                        {APPLICATION_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Extended Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
              <h2 className="font-headline-sm text-headline-sm font-bold text-primary mb-1">
                Sector Demand &amp; Velocity Breakdown
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                Regional conversion ratios across {tenantScope} ({timeframe})
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Frontend & Design Systems', share: 88, avgTime: '14 days' },
                  { label: 'Backend & Distributed Ledgers', share: 79, avgTime: '19 days' },
                  { label: 'AI & ML Infrastructure', share: 94, avgTime: '12 days' },
                  { label: 'Cloud & Edge DevOps', share: 72, avgTime: '21 days' },
                ].map((row) => (
                  <div key={row.label} className="flex flex-col gap-1">
                    <div className="flex justify-between text-label-md font-label-md">
                      <span className="text-on-surface font-semibold">{row.label}</span>
                      <span className="text-secondary font-bold">
                        {row.share}% fill velocity • {row.avgTime}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-surface-container-low overflow-hidden">
                      <div
                        className="h-full rounded-full bg-secondary"
                        style={{ width: `${row.share}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings & Spring Boot Backend Integration Tab */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                    Spring Boot API Readiness
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Service-layer configuration for REST backend integration
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full font-label-sm font-bold ${
                    IS_MOCK_MODE
                      ? 'bg-secondary-fixed text-secondary'
                      : 'bg-tertiary-fixed text-tertiary'
                  }`}
                >
                  {IS_MOCK_MODE ? 'Local Mock Data Active' : 'REST API Connected'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low text-body-sm">
                <span className="font-label-sm text-on-surface-variant uppercase block">
                  Configured Endpoint (VITE_API_BASE_URL)
                </span>
                <code className="font-mono text-primary font-semibold">
                  {API_BASE_URL || 'Not configured — running local preview dataset'}
                </code>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-outline-variant/20">
                <div>
                  <p className="font-label-md font-semibold text-on-surface">
                    Real-time ATS Ingest Webhooks
                  </p>
                  <p className="font-body-sm text-on-surface-variant">
                    Stream candidate stage updates from partner hiring systems
                  </p>
                </div>
                <button
                  className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
                    webhookEnabled ? 'bg-secondary justify-end' : 'bg-outline-variant justify-start'
                  }`}
                  onClick={() => {
                    setWebhookEnabled((v) => !v);
                    showToast('Updated ATS webhook preference', 'settings');
                  }}
                  type="button"
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-outline-variant/20">
                <div>
                  <p className="font-label-md font-semibold text-on-surface">
                    Auto-Flag Duplicate Job Postings
                  </p>
                  <p className="font-body-sm text-on-surface-variant">
                    Route ≥90% similarity listings to Moderation Queue
                  </p>
                </div>
                <button
                  className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
                    autoFlagDuplicates
                      ? 'bg-secondary justify-end'
                      : 'bg-outline-variant justify-start'
                  }`}
                  onClick={() => {
                    setAutoFlagDuplicates((v) => !v);
                    showToast('Updated duplicate detection threshold', 'flag');
                  }}
                  type="button"
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Investigation Modal */}
      {investigatingItem && (
        <div
          className="fixed inset-0 z-[70] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInvestigatingItem(null);
          }}
        >
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm font-bold uppercase">
                Duplicate Similarity Check
              </span>
              <button
                aria-label="Close modal"
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
                onClick={() => setInvestigatingItem(null)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-primary">
              {investigatingItem.title}
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {investigatingItem.company} • {investigatingItem.location} (
              {investigatingItem.salaryRange})
            </p>
            <div className="p-3 rounded-xl bg-error-container/30 text-on-error-container text-body-sm">
              {investigatingItem.flagReason || 'Matches 94% with Job #89201'} — identical job
              description hash and employer domain detected.
            </div>
            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-label-md font-semibold"
                onClick={async () => {
                  await moderateListing(investigatingItem.id, 'REJECTED');
                  setInvestigatingItem(null);
                }}
                type="button"
              >
                Archive Duplicate
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md font-semibold"
                onClick={async () => {
                  await moderateListing(investigatingItem.id, 'APPROVED');
                  setInvestigatingItem(null);
                }}
                type="button"
              >
                Approve Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <PostUrgentRoleModal
        onClose={() => setUrgentModalOpen(false)}
        onSubmit={async (payload) => {
          await createUrgentRole(payload);
        }}
        open={urgentModalOpen}
      />
    </AdminShell>
  );
}
