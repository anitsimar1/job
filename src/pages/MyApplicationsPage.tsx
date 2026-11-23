import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileTabShell } from '../components/layout/MobileTabShell';
import { SafeImage } from '../components/common/SafeImage';
import { OfferReviewModal } from '../components/modals/OfferReviewModal';
import { useApp } from '../context/AppContext';
import { ApplicationStatus, JobApplication, OfferSpotlight } from '../types';

type FilterTabKey = 'all' | ApplicationStatus;

function buildOfferFromApp(app: JobApplication): OfferSpotlight {
  const offerId = app.id.startsWith('app-') || app.id.startsWith('offer-') ? app.id : `app-${app.id}`;
  const status =
    app.stageBadge === 'Offer Accepted'
      ? 'accepted'
      : app.stageBadge === 'Offer Declined'
      ? 'declined'
      : 'pending';
  return {
    id: offerId,
    jobId: app.jobId,
    company: app.company,
    companyLogo: app.companyLogo,
    roleTitle: app.jobTitle,
    compensation: app.salaryRange,
    expiresIn: status === 'accepted' ? 'Accepted' : status === 'declined' ? 'Declined' : 'Expires in 7 days',
    decisionDeadline: status === 'accepted' ? 'Onboarding Active' : 'Active Offer',
    equityDetails: 'Standard equity & benefits package',
    signingBonus: 'Included in offer letter',
    status,
  };
}

export function MyApplicationsPage() {
  const navigate = useNavigate();
  const {
    applications,
    offerSpotlight,
    withdrawApplication,
    respondToOffer,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTabKey>('all');
  const [sortNewest, setSortNewest] = useState(true);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<OfferSpotlight | null>(null);

  const counts = useMemo(() => {
    const inReview = applications.filter((a) => a.status === 'in-review').length;
    const interviewing = applications.filter((a) => a.status === 'interviewing').length;
    const offeredAppsCount = applications.filter((a) => a.status === 'offered').length;
    const offered =
      offeredAppsCount > 0
        ? offeredAppsCount
        : offerSpotlight.status === 'pending' || offerSpotlight.status === 'accepted'
        ? 1
        : 0;
    const archived = applications.filter((a) => a.status === 'archived').length;
    const activeTotal = applications.filter((a) => a.status !== 'archived').length;
    return {
      all: applications.length,
      inReview,
      interviewing,
      offered,
      archived,
      activeTotal,
    };
  }, [applications, offerSpotlight.status]);

  const activeModalOffer = selectedOffer || offerSpotlight;

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = applications.filter((app) => {
      const matchesTab = activeFilter === 'all' || app.status === activeFilter;
      const matchesQ =
        !q ||
        app.company.toLowerCase().includes(q) ||
        app.jobTitle.toLowerCase().includes(q) ||
        app.stageBadge.toLowerCase().includes(q);
      return matchesTab && matchesQ;
    });
    return sortNewest ? list : [...list].reverse();
  }, [applications, activeFilter, searchQuery, sortNewest]);

  const handleExport = () => {
    const csvRows = [
      ['Company', 'Role', 'Location', 'Salary', 'Stage', 'Applied'],
      ...applications.map((a) => [
        a.company,
        a.jobTitle,
        a.location,
        a.salaryRange,
        a.stageBadge,
        a.appliedAgo,
      ]),
    ];
    const csv = csvRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-applications-jobconnect.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Applications exported as CSV', 'download');
  };

  return (
    <MobileTabShell pageLabel="My Applications">
      <div className="flex flex-col w-full px-gutter-sm space-y-space-md pb-8">
        {/* Header & Pipeline Summary */}
        <div className="pt-space-sm flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface">
                My Applications
              </h1>
              <span className="bg-secondary-container/15 text-secondary px-space-xs py-0.5 rounded-full font-label-sm text-label-sm">
                {counts.activeTotal} Active
              </span>
            </div>
            <button
              aria-label="Export Applications"
              className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
              onClick={handleExport}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
            </button>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Track interview stages, upcoming milestones, and received offers in real time.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-space-xs">
          <div className="flex-1 relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-outline text-[20px] pointer-events-none">
              search
            </span>
            <input
              className="w-full bg-surface-container-lowest text-on-surface font-body-sm text-body-sm pl-10 pr-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:bg-surface-container-low transition-all placeholder:text-outline"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by company, role, or stage..."
              type="search"
              value={searchQuery}
            />
          </div>
          <button
            className="h-10 px-space-sm bg-surface-container-lowest text-on-surface font-label-md text-label-md rounded-lg shadow-sm flex items-center gap-1 hover:bg-surface-container transition-all"
            onClick={() => {
              setSortNewest((p) => !p);
              showToast(sortNewest ? 'Sorted oldest first' : 'Sorted newest first', 'swap_vert');
            }}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">swap_vert</span>
            <span className="hidden sm:inline">Sort</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-1">
          {[
            { key: 'all' as FilterTabKey, label: 'All', count: counts.all },
            { key: 'in-review' as FilterTabKey, label: 'In Review', count: counts.inReview },
            {
              key: 'interviewing' as FilterTabKey,
              label: 'Interviewing',
              count: counts.interviewing,
            },
            { key: 'offered' as FilterTabKey, label: 'Offered', count: counts.offered },
            { key: 'archived' as FilterTabKey, label: 'Archived', count: counts.archived },
          ].map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm whitespace-nowrap shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform ${
                  active
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                }`}
                onClick={() => setActiveFilter(tab.key)}
                type="button"
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full font-label-sm text-[10px] ${
                    active
                      ? 'bg-on-primary/20'
                      : tab.key === 'interviewing'
                      ? 'bg-secondary/15 text-secondary'
                      : tab.key === 'offered'
                      ? 'bg-tertiary-fixed-dim/30 text-tertiary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Offer Spotlight Banner */}
        {(activeFilter === 'all' || activeFilter === 'offered') && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-tertiary via-tertiary-container to-secondary p-space-md text-on-tertiary shadow-md">
            <div className="flex flex-col gap-space-xs relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-0.5 rounded-full font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[14px]">celebration</span>
                  {offerSpotlight.status === 'accepted'
                    ? 'Offer Accepted'
                    : offerSpotlight.status === 'declined'
                    ? 'Offer Declined'
                    : 'Offer Received'}
                </span>
                <span className="bg-on-tertiary/15 text-on-tertiary px-2 py-0.5 rounded-full font-label-sm text-[11px] backdrop-blur-sm">
                  {offerSpotlight.expiresIn}
                </span>
              </div>

              <div className="flex items-start gap-space-sm mt-1">
                <div className="w-11 h-11 rounded-lg bg-surface-container-lowest flex items-center justify-center shadow-sm shrink-0 overflow-hidden p-1.5">
                  <SafeImage
                    alt={offerSpotlight.company}
                    className="w-8 h-8 object-contain"
                    src={offerSpotlight.companyLogo}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-headline-sm text-headline-sm text-on-tertiary truncate">
                    {offerSpotlight.roleTitle}
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-tertiary/80 flex items-center gap-1 flex-wrap">
                    <span>{offerSpotlight.company}</span>
                    <span>•</span>
                    <span className="text-tertiary-fixed font-semibold">
                      {offerSpotlight.compensation}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-space-sm pt-space-xs mt-1">
                <span className="font-label-sm text-label-sm text-on-tertiary/75 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  Decision: {offerSpotlight.decisionDeadline}
                </span>
                <button
                  className="px-space-md py-2 bg-tertiary-fixed hover:bg-tertiary-fixed-dim text-on-tertiary-fixed rounded-lg font-label-md text-label-md transition-all shadow-sm active:scale-95 flex items-center gap-1"
                  onClick={() => {
                    setSelectedOffer(offerSpotlight);
                    setOfferModalOpen(true);
                  }}
                  type="button"
                >
                  <span>Review Offer</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Applications List */}
        {filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-space-2xl text-center bg-surface-container-lowest rounded-xl shadow-sm">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-space-sm text-secondary">
              <span className="material-symbols-outlined text-[32px]">folder_off</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
              No applications found
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs mb-space-md">
              We couldn't find any job applications matching your current filter. Try adjusting your
              search query or view all.
            </p>
            <button
              className="px-space-md py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:bg-primary-container transition-colors"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              type="button"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
            {filteredApps.map((app) => (
              <article
                key={app.id}
                className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm transition-all hover:shadow-md flex flex-col gap-space-sm"
              >
                <div className="flex items-start justify-between gap-space-xs">
                  <div className="flex items-start gap-space-sm min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 overflow-hidden">
                      <SafeImage
                        alt={app.company}
                        className="w-full h-full object-cover"
                        src={app.companyLogo}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">
                        {app.jobTitle}
                      </h3>
                      <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm truncate">
                        <span>{app.company}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">
                            {app.location.toLowerCase().includes('remote')
                              ? 'public'
                              : app.location.toLowerCase().includes('hybrid')
                              ? 'apartment'
                              : 'location_on'}
                          </span>
                          {app.location}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    aria-label="View Job Details"
                    className="text-outline hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors"
                    onClick={() => navigate(`/jobs/${app.jobId}`)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>

                {/* Stage Badge & Salary */}
                <div className="flex flex-wrap items-center gap-space-xs">
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm flex items-center gap-1 ${
                      app.stageNumber === 4
                        ? 'bg-primary-container text-on-primary'
                        : app.stageNumber === 3
                        ? 'bg-surface-container-highest text-on-surface'
                        : app.status === 'archived'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-secondary-fixed text-on-secondary-fixed-variant'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        app.stageNumber === 4 ? 'bg-secondary-fixed animate-pulse' : 'bg-secondary'
                      }`}
                    />
                    {app.stageBadge}
                  </span>
                  <span className="bg-surface-container text-on-surface-variant px-2.5 py-0.5 rounded-full font-label-sm text-label-sm">
                    {app.salaryRange}
                  </span>
                </div>

                {/* Next Milestone or Activity */}
                {app.nextMilestone && (
                  <div className="bg-surface-container-low rounded-lg p-space-sm flex items-start gap-space-xs">
                    <span
                      className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${
                        app.nextMilestone.tone === 'secondary' ? 'text-secondary' : 'text-outline'
                      }`}
                    >
                      {app.nextMilestone.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`font-label-sm text-label-sm block ${
                          app.nextMilestone.tone === 'secondary'
                            ? 'text-secondary'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {app.nextMilestone.label}
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface">
                        {app.nextMilestone.detail}
                        {app.nextMilestone.highlight && (
                          <strong className="font-semibold text-on-surface">
                            {app.nextMilestone.highlight}
                          </strong>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {app.activityNote && (
                  <div className="bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between">
                    <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
                      <span className="material-symbols-outlined text-secondary text-[18px]">
                        {app.activityNote.includes('Tailored') ? 'check_circle' : 'visibility'}
                      </span>
                      <span className="text-on-surface">{app.activityNote}</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline">
                      {app.appliedAgo}
                    </span>
                  </div>
                )}

                {/* Progress Timeline for interviewing cards */}
                {app.status === 'interviewing' && (
                  <div className="pt-space-2xs">
                    <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-[11px] mb-1.5">
                      <span className="text-primary font-semibold">
                        Stage {app.stageNumber} of {app.totalStages}
                      </span>
                      <span>{app.appliedAgo}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 w-full">
                      {app.stageSteps.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full ${
                            idx + 1 < app.stageNumber
                              ? 'bg-secondary'
                              : idx + 1 === app.stageNumber
                              ? 'bg-secondary-container animate-pulse'
                              : 'bg-surface-container'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-1 text-center font-label-sm text-[10px] text-on-surface-variant">
                      {app.stageSteps.map((stepName, idx) => (
                        <span
                          key={stepName}
                          className={`truncate ${
                            idx + 1 === app.stageNumber
                              ? 'text-secondary font-semibold'
                              : idx + 1 > app.stageNumber
                              ? 'text-outline'
                              : ''
                          }`}
                        >
                          {stepName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between gap-space-xs pt-space-2xs mt-auto">
                  {app.status === 'in-review' ? (
                    <button
                      className="text-outline hover:text-error font-label-sm text-label-sm transition-colors py-1 flex items-center gap-1"
                      onClick={() => withdrawApplication(app.id)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">archive</span>
                      <span>Withdraw</span>
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-space-xs">
                    <button
                      className="px-space-sm py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center gap-1 active:scale-95"
                      onClick={() => navigate(`/jobs/${app.jobId}`)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>View Job</span>
                    </button>
                    {app.status === 'offered' ? (
                      <button
                        className="px-space-md py-2 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-1 active:scale-95 bg-tertiary-container hover:bg-tertiary text-tertiary-fixed shadow-sm"
                        onClick={() => {
                          const normalizedAppOfferId =
                            app.id.startsWith('app-') || app.id.startsWith('offer-')
                              ? app.id
                              : `app-${app.id}`;
                          const offerObj =
                            offerSpotlight.id === normalizedAppOfferId ||
                            offerSpotlight.id === app.id
                              ? offerSpotlight
                              : buildOfferFromApp(app);
                          setSelectedOffer(offerObj);
                          setOfferModalOpen(true);
                        }}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>
                          {app.stageBadge === 'Offer Accepted' ? 'Offer Accepted' : 'Review Offer'}
                        </span>
                      </button>
                    ) : (
                      <button
                        className={`px-space-md py-2 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-1 active:scale-95 ${
                          app.stageNumber === 4
                            ? 'bg-secondary hover:bg-secondary-container text-on-secondary shadow-sm'
                            : 'bg-surface-container hover:bg-surface-container-high text-secondary'
                        }`}
                        onClick={() =>
                          showToast(
                            app.stageNumber === 4
                              ? 'Opening System Design prep rubric'
                              : `Follow-up reminder sent for ${app.company}`,
                            'event'
                          )
                        }
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {app.stageNumber === 4 ? 'event' : 'mail'}
                        </span>
                        <span>{app.stageNumber === 4 ? 'Prepare Interview' : 'Follow Up'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <OfferReviewModal
        offer={activeModalOffer}
        onAccept={() => respondToOffer('accepted', activeModalOffer)}
        onClose={() => {
          setOfferModalOpen(false);
          setSelectedOffer(null);
        }}
        onDecline={() => respondToOffer('declined', activeModalOffer)}
        open={offerModalOpen}
      />
    </MobileTabShell>
  );
}
