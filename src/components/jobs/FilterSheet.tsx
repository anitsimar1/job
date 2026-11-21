import { EmploymentType, WorkplaceType } from '../../types';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  workplace: WorkplaceType | 'All';
  onWorkplaceChange: (w: WorkplaceType | 'All') => void;
  employmentType: EmploymentType | 'All';
  onEmploymentTypeChange: (e: EmploymentType | 'All') => void;
  minSalaryK: number;
  onMinSalaryChange: (val: number) => void;
  selectedTech: string;
  onTechChange: (tag: string) => void;
  resultsCount: number;
  onReset: () => void;
}

const TECH_TAGS = ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL'];

export function FilterSheet({
  open,
  onClose,
  workplace,
  onWorkplaceChange,
  employmentType,
  onEmploymentTypeChange,
  minSalaryK,
  onMinSalaryChange,
  selectedTech,
  onTechChange,
  resultsCount,
  onReset,
}: FilterSheetProps) {
  if (!open) return null;

  const activeFilterCount =
    (workplace !== 'All' ? 1 : 0) +
    (employmentType !== 'All' ? 1 : 0) +
    (minSalaryK > 80 ? 1 : 0) +
    (selectedTech ? 1 : 0);

  return (
    <div
      className="fixed inset-0 z-[60] bg-inverse-surface/50 backdrop-blur-xs flex flex-col justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl mx-auto max-h-[85vh] bg-surface-container-lowest rounded-t-3xl p-gutter-sm sm:p-gutter flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-space-sm">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Filter Opportunities
            </span>
            <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold">
              {activeFilterCount} Active
            </span>
          </div>
          <button
            aria-label="Close filters"
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-90"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-space-sm flex flex-col gap-space-md">
          {/* Workplace Preference */}
          <div className="flex flex-col gap-2">
            <span className="font-label-lg text-label-lg font-bold text-on-surface">
              Workplace Model
            </span>
            <div className="grid grid-cols-4 gap-2">
              {(['All', 'Remote', 'Hybrid', 'On-site'] as const).map((option) => (
                <button
                  key={option}
                  className={`py-2.5 rounded-lg font-label-md text-label-md font-semibold text-center transition-all ${
                    workplace === option
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                  onClick={() => onWorkplaceChange(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Employment Type */}
          <div className="flex flex-col gap-2">
            <span className="font-label-lg text-label-lg font-bold text-on-surface">
              Employment Type
            </span>
            <div className="flex flex-wrap gap-2">
              {(['All', 'Full-time', 'Contract / C2C', 'Executive Advisory'] as const).map(
                (type) => (
                  <button
                    key={type}
                    className={`px-3.5 py-2 rounded-lg font-label-md text-label-md font-semibold transition-all ${
                      employmentType === type
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                    onClick={() => onEmploymentTypeChange(type)}
                    type="button"
                  >
                    {type === 'All' ? 'All Types' : type}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Minimum Compensation Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-label-lg text-label-lg font-bold text-on-surface">
                Min. Base Salary
              </span>
              <span className="font-label-lg text-label-lg font-bold text-tertiary-container">
                ${minSalaryK},000 / yr
              </span>
            </div>
            <input
              className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-secondary"
              max={240}
              min={80}
              onChange={(e) => onMinSalaryChange(Number(e.target.value))}
              step={10}
              type="range"
              value={minSalaryK}
            />
            <div className="flex justify-between text-on-surface-variant font-label-sm text-label-sm">
              <span>$80k</span>
              <span>$160k</span>
              <span>$240k+</span>
            </div>
          </div>

          {/* Tech Stack Tags */}
          <div className="flex flex-col gap-2">
            <span className="font-label-lg text-label-lg font-bold text-on-surface">
              Tech Stack Tags
            </span>
            <div className="flex flex-wrap gap-2">
              {TECH_TAGS.map((tag) => {
                const selected = selectedTech === tag;
                return (
                  <button
                    key={tag}
                    className={`px-3 py-1.5 rounded-lg font-label-md text-label-md flex items-center gap-1.5 transition-all ${
                      selected
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                    onClick={() => onTechChange(selected ? '' : tag)}
                    type="button"
                  >
                    <span>{tag}</span>
                    {selected && <span className="material-symbols-outlined text-[14px]">close</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-space-md flex items-center gap-space-sm mt-auto">
          <button
            className="flex-1 py-3 rounded-xl bg-surface-container-low text-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-container active:scale-95 transition-all text-center"
            onClick={onReset}
            type="button"
          >
            Reset All
          </button>
          <button
            className="flex-[2] py-3 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-md hover:bg-secondary active:scale-95 transition-all text-center"
            onClick={onClose}
            type="button"
          >
            View {resultsCount} Results
          </button>
        </div>
      </div>
    </div>
  );
}
