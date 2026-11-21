interface ExecutiveReportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExecutiveReportModal({ open, onClose }: ExecutiveReportModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm font-bold">
              2025 Market Intel
            </span>
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface mt-1.5">
              Salary Negotiation Guide 2025
            </h3>
            <p className="font-body-sm text-on-surface-variant">
              Benchmark data synthesized from 4,200 executive &amp; staff offers
            </p>
          </div>
          <button
            aria-label="Close report"
            className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-container-low rounded-xl p-3 text-center">
            <span className="font-headline-sm font-bold text-primary block">$192.5k</span>
            <span className="font-label-sm text-on-surface-variant">Median Staff Base</span>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3 text-center">
            <span className="font-headline-sm font-bold text-secondary block">+18%</span>
            <span className="font-label-sm text-on-surface-variant">Remote Parity</span>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3 text-center">
            <span className="font-headline-sm font-bold text-tertiary-container block">0.18%</span>
            <span className="font-label-sm text-on-surface-variant">Avg Equity Grant</span>
          </div>
        </div>

        <div className="space-y-3 text-body-sm text-on-surface-variant">
          <div className="p-3 rounded-xl bg-surface-container-low">
            <p className="font-label-md text-on-surface font-bold mb-1">
              1. Anchor Total Compensation, Not Just Base
            </p>
            <p>
              Candidates who negotiate equity refreshers and sign-on bonuses achieve 14.6% higher
              4-year realized packages than base-only negotiations.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low">
            <p className="font-label-md text-on-surface font-bold mb-1">
              2. Leverage Remote Geo-Parity Benchmarks
            </p>
            <p>
              74% of Series B–D technical employers now maintain Tier-1 SF/NY compensation bands
              for Staff+ remote hires across North America and EU hubs.
            </p>
          </div>
        </div>

        <button
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg font-bold hover:bg-secondary transition-colors"
          onClick={onClose}
          type="button"
        >
          Done Reading
        </button>
      </div>
    </div>
  );
}
