import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MobileTabShell } from '../components/layout/MobileTabShell';
import { JobCard } from '../components/jobs/JobCard';
import { FilterSheet } from '../components/jobs/FilterSheet';
import { useApp } from '../context/AppContext';
import { jobService, JobSearchFilters } from '../services/jobService';
import { EmploymentType, JobPosting, WorkplaceType } from '../types';

const SORT_OPTIONS: NonNullable<JobSearchFilters['sortBy']>[] = [
  'Most Relevant',
  'Latest Added',
  'Highest Salary',
  'Fewest Applicants',
];

const PAGE_SIZE = 6;

export function FindJobsPage() {
  const [searchParams] = useSearchParams();
  const { jobs, showToast } = useApp();

  const initialQ = searchParams.get('q') ?? '';
  const initialLoc = searchParams.get('loc') ?? '';

  const [query, setQuery] = useState(initialQ || '');
  const [workplace, setWorkplace] = useState<WorkplaceType | 'All'>('All');
  const [employmentType, setEmploymentType] = useState<EmploymentType | 'All'>('All');
  const [minSalaryK, setMinSalaryK] = useState<number>(80);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [sortBy, setSortBy] = useState<NonNullable<JobSearchFilters['sortBy']>>('Latest Added');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(jobs.length);
  const [loading, setLoading] = useState(false);
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>(jobs);

  useEffect(() => {
    if (initialQ) setQuery(initialQ);
    if (initialLoc.toLowerCase().includes('remote')) {
      setWorkplace('Remote');
    }
  }, [initialQ, initialLoc]);

  useEffect(() => {
    setPage(0);
  }, [query, workplace, employmentType, minSalaryK, selectedTech, sortBy]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    jobService
      .searchJobsPage(
        {
          query,
          workplace,
          employmentType,
          minSalaryK,
          techTag: selectedTech,
          sortBy,
        },
        page,
        PAGE_SIZE,
        jobs
      )
      .then((res) => {
        if (!active) return;
        setFilteredJobs(res.content);
        setTotalPages(Math.max(1, res.totalPages));
        setTotalElements(res.totalElements);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, workplace, employmentType, minSalaryK, selectedTech, sortBy, page, jobs]);

  const activeFilterCount = useMemo(
    () =>
      (workplace !== 'All' ? 1 : 0) +
      (employmentType !== 'All' ? 1 : 0) +
      (minSalaryK > 80 ? 1 : 0) +
      (selectedTech ? 1 : 0),
    [workplace, employmentType, minSalaryK, selectedTech]
  );

  const resetAllFilters = () => {
    setQuery('');
    setWorkplace('All');
    setEmploymentType('All');
    setMinSalaryK(80);
    setSelectedTech('');
    setPage(0);
    showToast('Filters cleared', 'refresh');
  };

  return (
    <MobileTabShell pageLabel="Find Jobs">
      <div className="flex flex-col w-full pb-12">
        {/* Search Command Header */}
        <section className="px-gutter-sm pt-space-md pb-space-sm bg-surface">
          <div className="relative flex items-center bg-surface-container-lowest rounded-xl shadow-sm px-space-md py-space-xs transition-all focus-within:shadow-md">
            <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mr-space-xs">
              search
            </span>
            <input
              className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none py-1.5"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Frontend Engineer, React, Apex Cloud..."
              type="text"
              value={query}
            />
            {query && (
              <button
                aria-label="Clear search"
                className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low active:scale-90 transition-transform shrink-0"
                onClick={() => setQuery('')}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </button>
            )}
            <button
              aria-label="Advanced filters"
              className="ml-space-2xs pl-space-xs py-1 flex items-center text-primary font-label-md text-label-md shrink-0 hover:opacity-80"
              onClick={() => setFilterSheetOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] text-secondary">tune</span>
            </button>
          </div>
        </section>

        {/* Filter Carousel Pills */}
        <section className="py-space-xs">
          <div className="flex items-center gap-space-xs overflow-x-auto px-gutter-sm no-scrollbar scroll-smooth">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-on-primary font-label-md text-label-md shrink-0 shadow-sm active:scale-95 transition-transform"
              onClick={() => setFilterSheetOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Filters ({activeFilterCount})</span>
            </button>

            {workplace !== 'All' && (
              <div className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-surface-container-high text-primary font-label-md text-label-md shrink-0">
                <span>{workplace === 'Remote' ? 'Remote Only' : workplace}</span>
                <button
                  aria-label="Remove workplace filter"
                  className="w-4 h-4 rounded-full flex items-center justify-center text-primary/70 hover:text-primary hover:bg-surface-container-highest transition-colors"
                  onClick={() => setWorkplace('All')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            {employmentType !== 'All' && (
              <div className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-surface-container-high text-primary font-label-md text-label-md shrink-0">
                <span>{employmentType}</span>
                <button
                  aria-label="Remove employment filter"
                  className="w-4 h-4 rounded-full flex items-center justify-center text-primary/70 hover:text-primary hover:bg-surface-container-highest transition-colors"
                  onClick={() => setEmploymentType('All')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            {minSalaryK > 80 && (
              <div className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-tertiary-container text-tertiary-fixed font-label-md text-label-md shrink-0">
                <span className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim">
                  payments
                </span>
                <span>${minSalaryK}k+</span>
                <button
                  aria-label="Remove salary filter"
                  className="w-4 h-4 rounded-full flex items-center justify-center text-tertiary-fixed/80 hover:text-tertiary-fixed hover:bg-tertiary transition-colors"
                  onClick={() => setMinSalaryK(80)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            <button
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md shrink-0 transition-colors shadow-sm ${
                selectedTech === 'React'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
              }`}
              onClick={() => setSelectedTech((prev) => (prev === 'React' ? '' : 'React'))}
              type="button"
            >
              <span>Tech: {selectedTech || 'React'}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-lowest text-on-surface-variant font-label-md text-label-md shrink-0 hover:bg-surface-container-low transition-colors shadow-sm"
              onClick={() => setFilterSheetOpen(true)}
              type="button"
            >
              <span>Experience</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>
        </section>

        {/* Results Count & Sorting */}
        <section className="px-gutter-sm pt-space-md pb-space-xs flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {totalElements}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              matched roles
            </span>
            {loading && (
              <span className="material-symbols-outlined text-[16px] text-secondary animate-spin ml-1">
                refresh
              </span>
            )}
          </div>

          <div className="relative">
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
              onClick={() => setSortMenuOpen((p) => !p)}
              type="button"
            >
              <span className="text-on-surface-variant text-[12px] font-normal">Sort:</span>
              <span className="font-semibold text-primary">{sortBy}</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                arrow_drop_down
              </span>
            </button>

            {sortMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-surface-container-lowest rounded-xl shadow-xl p-1 z-30 flex flex-col gap-0.5">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    className={`w-full text-left px-3 py-2 rounded-lg font-label-md text-label-md flex items-center justify-between ${
                      sortBy === opt
                        ? 'bg-surface-container-low text-primary font-semibold'
                        : 'text-on-surface hover:bg-surface-container-low'
                    }`}
                    onClick={() => {
                      setSortBy(opt);
                      setSortMenuOpen(false);
                      showToast(`Sorted by ${opt}`, 'swap_vert');
                    }}
                    type="button"
                  >
                    <span>{opt}</span>
                    {sortBy === opt && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Job Cards Stream */}
        <div className="px-gutter-sm pt-space-xs">
          {filteredJobs.length === 0 && !loading ? (
            <div className="bg-surface-container-lowest rounded-xl p-8 text-center shadow-sm flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[28px]">search_off</span>
              </div>
              <h3 className="font-headline-sm font-bold text-on-surface">No matching roles found</h3>
              <p className="font-body-sm text-on-surface-variant max-w-xs">
                Try broadening your keyword, lowering the minimum salary threshold, or resetting filters.
              </p>
              <button
                className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md font-semibold"
                onClick={resetAllFilters}
                type="button"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-sm">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} variant="search" />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-space-md flex items-center justify-between bg-surface-container-lowest rounded-xl p-3 shadow-sm">
                  <button
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-md font-semibold disabled:opacity-40 hover:bg-surface-container transition-colors"
                    disabled={page === 0 || loading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    <span>Previous</span>
                  </button>
                  <span className="font-label-md text-on-surface-variant">
                    Page <span className="font-bold text-primary">{page + 1}</span> of{' '}
                    <span className="font-bold text-primary">{totalPages}</span>
                  </span>
                  <button
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-md font-semibold disabled:opacity-40 hover:bg-surface-container transition-colors"
                    disabled={page + 1 >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    type="button"
                  >
                    <span>Next</span>
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Floating Filter FAB */}
        <div className="fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-40">
          <button
            className="flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-primary text-on-primary shadow-xl hover:bg-secondary active:scale-95 transition-all"
            onClick={() => setFilterSheetOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            <span className="font-label-lg text-label-lg font-bold">Filters</span>
            <span className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          </button>
        </div>

        <FilterSheet
          employmentType={employmentType}
          minSalaryK={minSalaryK}
          onClose={() => setFilterSheetOpen(false)}
          onEmploymentTypeChange={setEmploymentType}
          onMinSalaryChange={setMinSalaryK}
          onReset={resetAllFilters}
          onTechChange={setSelectedTech}
          onWorkplaceChange={setWorkplace}
          open={filterSheetOpen}
          resultsCount={totalElements}
          selectedTech={selectedTech}
          workplace={workplace}
        />
      </div>
    </MobileTabShell>
  );
}
