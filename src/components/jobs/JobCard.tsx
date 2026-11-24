import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { JobPosting } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { useApp } from '../../context/AppContext';

interface JobCardProps {
  job: JobPosting;
  variant?: 'home' | 'search';
}

export function JobCard({ job, variant = 'search' }: JobCardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { savedJobIds, appliedJobIds, toggleSaveJob, quickApplyJob } = useApp();
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isSaved = savedJobIds.includes(job.id);
  const isApplied = appliedJobIds.includes(job.id);

  const handleQuickApply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isApplied || applying || applyingRef.current) return;
    applyingRef.current = true;
    setApplying(true);
    try {
      const result = await quickApplyJob(job);
      if (mountedRef.current && result === 'auth_required') {
        navigate('/auth', { state: { from: location.pathname } });
      }
    } finally {
      applyingRef.current = false;
      if (mountedRef.current) {
        setApplying(false);
      }
    }
  };

  if (variant === 'home') {
    const isHighMatch = job.matchScore >= 98;
    return (
      <article
        className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative cursor-pointer"
        onClick={() => navigate(`/jobs/${job.id}`)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center p-2 overflow-hidden shadow-inner shrink-0">
              <SafeImage
                alt={`${job.company} Logo`}
                className="w-full h-full object-contain"
                fallbackText={job.company.slice(0, 2).toUpperCase()}
                src={job.companyLogo}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                  {job.company}
                </span>
                {job.verified && (
                  <span
                    className="material-symbols-outlined text-tertiary-fixed-dim text-[16px]"
                    title="Verified Employer"
                  >
                    verified
                  </span>
                )}
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold line-clamp-1">
                {job.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold tracking-tight ${
                isHighMatch
                  ? 'bg-tertiary text-tertiary-fixed'
                  : 'bg-secondary-container text-on-secondary-container'
              }`}
            >
              {job.matchScore}% Match
            </span>
            <button
              aria-label="Save Job"
              className={`w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center active:scale-90 transition-transform ${
                isSaved ? 'text-primary' : 'text-on-surface-variant'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                toggleSaveJob(job.id);
              }}
              type="button"
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
              >
                {isSaved ? 'bookmark' : 'bookmark_border'}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-tertiary-container/15 text-tertiary-container font-label-sm text-label-sm font-bold">
            {job.salaryDisplay.replace(' / yr', '')}
          </span>
          {job.equity && (
            <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold">
              {job.equity}
            </span>
          )}
          {job.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm ${
                tag.toLowerCase().includes('remote') || tag.toLowerCase().includes('hybrid')
                  ? 'bg-surface-container-high text-on-surface-variant'
                  : 'bg-secondary-fixed/50 text-on-secondary-fixed-variant'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-3 pt-3 flex items-center justify-between bg-surface-container-low/40 -mx-4 -mb-4 px-4 py-2.5 rounded-b-2xl">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
            <span
              className={`material-symbols-outlined text-[16px] ${
                job.isHot ? 'text-tertiary-container' : ''
              }`}
            >
              {job.isHot ? 'bolt' : job.location.includes('San Francisco') ? 'location_on' : 'schedule'}
            </span>
            <span className={job.isHot ? 'text-tertiary-container font-semibold' : ''}>
              {job.location.includes('San Francisco') ? job.location : job.postedAgo}
            </span>
            <span>•</span>
            <span className="text-secondary font-medium">
              {job.urgencyLabel.split('•')[1]?.trim() || job.employmentType}
            </span>
          </div>

          <button
            className={`font-label-md text-label-md font-bold flex items-center gap-1 ${
              isApplied ? 'text-tertiary-container' : 'text-secondary hover:underline'
            }`}
            disabled={applying || isApplied}
            onClick={handleQuickApply}
            type="button"
          >
            <span>{applying ? 'Applying...' : isApplied ? 'Applied' : 'Quick Apply'}</span>
            <span className="material-symbols-outlined text-[16px]">
              {isApplied ? 'check_circle' : 'send'}
            </span>
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative flex flex-col gap-3 transition-all hover:shadow-md cursor-pointer"
      onClick={() => navigate(`/jobs/${job.id}`)}
    >
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <SafeImage
            alt={`${job.company} Logo`}
            className="w-10 h-10 rounded-lg object-cover bg-surface-container-high shrink-0"
            fallbackText={job.company.slice(0, 2).toUpperCase()}
            src={job.companyLogo}
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-label-lg text-label-lg font-semibold text-on-surface truncate">
                {job.company}
              </span>
              {job.verified && (
                <span
                  className="material-symbols-outlined text-[16px] text-tertiary-container shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  title="Verified Employer"
                >
                  verified
                </span>
              )}
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[14px]">
                {job.workplace === 'Remote' ? 'public' : 'location_on'}
              </span>
              {job.location}
            </span>
          </div>
        </div>

        <button
          aria-label="Bookmark job"
          className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-low active:scale-90 transition-transform shrink-0 ${
            isSaved ? 'text-secondary' : 'text-on-surface-variant'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            toggleSaveJob(job.id);
          }}
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

      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface leading-snug">
          {job.title}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="px-2.5 py-1 rounded-full bg-tertiary-container text-tertiary-fixed font-label-md text-label-md font-bold tracking-tight">
          {job.salaryDisplay}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-primary font-label-md text-label-md">
          {job.employmentType}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
          {job.experienceLevel}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {job.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="pt-2 mt-1 flex items-center justify-between gap-space-sm bg-surface-container-lowest">
        <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              job.urgencyTone === 'secondary'
                ? 'bg-secondary'
                : job.urgencyTone === 'neutral'
                ? 'bg-surface-tint'
                : 'bg-tertiary animate-pulse'
            }`}
          />
          <span>{job.urgencyLabel}</span>
        </div>

        <button
          className={`px-4 py-2 rounded-lg font-label-md text-label-md font-semibold active:scale-95 transition-all shadow-sm flex items-center gap-1 ${
            isApplied
              ? 'bg-tertiary-container text-tertiary-fixed'
              : 'bg-primary text-on-primary hover:bg-secondary'
          }`}
          disabled={applying}
          onClick={handleQuickApply}
          type="button"
        >
          {applying ? (
            <>
              <span className="material-symbols-outlined text-[16px] animate-spin">
                progress_activity
              </span>
              <span>Applying...</span>
            </>
          ) : isApplied ? (
            <>
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Applied</span>
            </>
          ) : (
            <>
              <span>Quick Apply</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}
