import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MobileTabShell } from '../components/layout/MobileTabShell';
import { JobCard } from '../components/jobs/JobCard';
import { SafeImage } from '../components/common/SafeImage';
import { ExecutiveReportModal } from '../components/modals/ExecutiveReportModal';
import { FEATURED_EMPLOYERS, SECTORS } from '../data/mockData';
import { useApp } from '../context/AppContext';

const LOCATIONS = ['Remote, Worldwide', 'San Francisco, CA', 'New York, NY', 'Hybrid'];

export function HomePage() {
  const navigate = useNavigate();
  const { jobs, showToast } = useApp();
  const [keyword, setKeyword] = useState('Staff Engineer');
  const [locationIndex, setLocationIndex] = useState(0);
  const [activeSector, setActiveSector] = useState<string>('Frontend');
  const [reportOpen, setReportOpen] = useState(false);

  const slugMatchedFeatured = jobs.filter((j) =>
    ['vercel-senior-react', 'linear-lead-ux', 'stripe-staff-backend'].includes(j.id)
  );
  const featuredHomeJobs =
    slugMatchedFeatured.length > 0 ? slugMatchedFeatured : jobs.slice(0, 3);

  const displayedJobs =
    activeSector === 'All'
      ? featuredHomeJobs
      : jobs.filter((j) => j.sector === activeSector).slice(0, 3);

  const resolvedJobs = displayedJobs.length > 0 ? displayedJobs : featuredHomeJobs;

  const handleExplore = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    params.set('loc', LOCATIONS[locationIndex]);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <MobileTabShell pageLabel="Home">
      <div className="flex flex-col w-full pb-6 space-y-6">
        {/* Greeting Hero Banner */}
        <section className="relative overflow-hidden bg-primary text-on-primary rounded-b-3xl lg:rounded-3xl lg:mt-4 p-5 sm:p-6 shadow-lg">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-tertiary-fixed-dim/10 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest/15 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse" />
                <span className="font-label-sm text-label-sm text-surface-bright tracking-wide">
                  Executive Discovery Feed
                </span>
              </div>
              <Link
                className="flex items-center gap-1 text-on-primary-container font-label-sm text-label-sm hover:text-white transition-colors"
                to="/profile"
              >
                <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">
                  verified
                </span>
                <span>Matched to Profile</span>
              </Link>
            </div>

            <div className="space-y-1">
              <h1 className="font-headline-xl-mobile sm:text-headline-xl text-headline-xl-mobile text-on-primary tracking-tight">
                Find your next <span className="text-tertiary-fixed">high-impact</span> role.
              </h1>
              <p className="font-body-sm text-body-sm text-surface-container-high/90">
                Hand-vetted technical &amp; product leadership opportunities.
              </p>
            </div>

            {/* Search Command Box */}
            <form
              className="bg-surface-container-lowest rounded-2xl p-2 shadow-xl space-y-2 text-on-surface"
              onSubmit={handleExplore}
            >
              <div className="flex items-center px-3 py-2 bg-surface-container-low rounded-xl gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  search
                </span>
                <input
                  className="w-full bg-transparent text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none"
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Role, skill (e.g. Staff React, AI)..."
                  type="text"
                  value={keyword}
                />
                {keyword && (
                  <button
                    aria-label="Clear keyword"
                    className="text-outline hover:text-on-surface p-1"
                    onClick={() => setKeyword('')}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  className="flex-1 flex items-center justify-between px-3 py-2 bg-surface-container rounded-xl text-left active:scale-[0.98] transition-all"
                  onClick={() => {
                    const next = (locationIndex + 1) % LOCATIONS.length;
                    setLocationIndex(next);
                    showToast(`Location filter: ${LOCATIONS[next]}`, 'public');
                  }}
                  type="button"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      public
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-medium truncate">
                      {LOCATIONS[locationIndex]}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                    expand_more
                  </span>
                </button>

                <button
                  className="h-10 px-4 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary font-label-lg text-label-lg flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                  type="submit"
                >
                  <span>Explore</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Quick Stat Chips */}
        <section className="px-4 lg:px-0">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-surface-container-lowest p-3 rounded-2xl shadow-sm flex flex-col items-center text-center">
              <span className="font-headline-sm text-headline-sm font-bold text-primary">12.4k</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                Active Jobs
              </span>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded-2xl shadow-sm flex flex-col items-center text-center">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" />
                <span className="font-headline-sm text-headline-sm font-bold text-secondary">
                  840
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                New Today
              </span>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded-2xl shadow-sm flex flex-col items-center text-center">
              <span className="font-headline-sm text-headline-sm font-bold text-tertiary">98%</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                Response Rate
              </span>
            </div>
          </div>
        </section>

        {/* Quick Categories Carousel */}
        <section className="space-y-3">
          <div className="px-4 lg:px-0 flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Top Sectors
            </h2>
            <Link
              className="font-label-md text-label-md text-secondary font-semibold flex items-center gap-0.5 hover:underline"
              to="/jobs"
            >
              View all <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 px-4 lg:px-0 overflow-x-auto no-scrollbar scroll-smooth">
            {SECTORS.map((sector) => {
              const active = activeSector === sector.name;
              return (
                <button
                  key={sector.id}
                  className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full shadow-sm active:scale-95 transition-all ${
                    active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                  }`}
                  onClick={() =>
                    setActiveSector((prev) => (prev === sector.name ? 'All' : sector.name))
                  }
                  type="button"
                >
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      active ? 'text-on-primary' : sector.iconColorClass || 'text-secondary'
                    }`}
                  >
                    {sector.icon}
                  </span>
                  <span className="font-label-md text-label-md font-medium">{sector.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full font-label-sm text-label-sm ${
                      active
                        ? 'bg-surface-container-lowest/20 text-on-primary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {sector.countLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Recommended For You Section */}
        <section className="px-4 lg:px-0 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Recommended For You
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold">
                AI Curated
              </span>
            </div>
            <button
              aria-label="Open full job filters"
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container active:scale-95"
              onClick={() => navigate('/jobs')}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {resolvedJobs.map((job) => (
              <JobCard key={job.id} job={job} variant="home" />
            ))}
          </div>
        </section>

        {/* Featured Employers Carousel */}
        <section className="space-y-3">
          <div className="px-4 lg:px-0 flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Featured Employers
              </h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Top-tier verified organizations hiring now
              </p>
            </div>
            <Link
              className="font-label-md text-label-md text-secondary font-semibold hover:underline"
              to="/jobs"
            >
              View all
            </Link>
          </div>

          <div className="flex items-center gap-3 px-4 lg:px-0 overflow-x-auto no-scrollbar scroll-smooth">
            {FEATURED_EMPLOYERS.map((employer) => (
              <button
                key={employer.id}
                className="flex-shrink-0 w-36 bg-surface-container-lowest p-3.5 rounded-2xl shadow-sm hover:shadow-md flex flex-col items-center text-center space-y-2 active:scale-95 transition-all"
                onClick={() => navigate(`/jobs?q=${encodeURIComponent(employer.name)}`)}
                type="button"
              >
                <div className="w-12 h-12 rounded-xl bg-surface-container p-2 flex items-center justify-center">
                  <SafeImage
                    alt={employer.name}
                    className="w-full h-full object-contain"
                    src={employer.logo}
                  />
                </div>
                <div className="min-w-0 w-full">
                  <h4 className="font-label-lg text-label-lg font-bold text-on-surface truncate">
                    {employer.name}
                  </h4>
                  <span
                    className={`px-2 py-0.5 mt-1 inline-block rounded-full font-label-sm text-label-sm font-semibold ${
                      employer.badgeTone === 'tertiary'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : 'bg-secondary-fixed text-on-secondary-fixed'
                    }`}
                  >
                    {employer.rolesCount} Roles
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Career Insights & Negotiation Guide Banner */}
        <section className="px-4 lg:px-0">
          <div className="relative overflow-hidden bg-inverse-surface text-inverse-on-surface rounded-2xl p-5 shadow-md">
            <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-secondary-container/20 blur-xl pointer-events-none" />
            <div className="relative z-10 flex flex-col space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed-dim/20 text-tertiary-fixed-dim font-label-sm text-label-sm font-semibold">
                  2025 Market Intel
                </span>
                <span className="text-outline-variant font-label-sm text-label-sm">4 min read</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-surface-bright font-bold">
                  Salary Negotiation Guide 2025
                </h3>
                <p className="font-body-sm text-body-sm text-outline-variant mt-1">
                  Data from 4,200 executive offers: learn how to command higher equity allocations
                  and remote parity.
                </p>
              </div>
              <div className="pt-1">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-lowest text-primary font-label-md text-label-md font-bold shadow hover:bg-surface-bright active:scale-95 transition-all"
                  onClick={() => setReportOpen(true)}
                  type="button"
                >
                  <span>Read Executive Report</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ExecutiveReportModal onClose={() => setReportOpen(false)} open={reportOpen} />
    </MobileTabShell>
  );
}
