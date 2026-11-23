import React, { useState } from 'react';
import { CreateUrgentRolePayload } from '../../services/adminService';

interface PostUrgentRoleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateUrgentRolePayload) => Promise<void>;
}

export function PostUrgentRoleModal({ open, onClose, onSubmit }: PostUrgentRoleModalProps) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('Remote - US & EU');
  const [salaryDisplay, setSalaryDisplay] = useState('$175,000 - $210,000 / yr');
  const [workplace, setWorkplace] = useState<'Remote' | 'Hybrid' | 'On-site'>('Remote');
  const [sector, setSector] = useState('Frontend');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        salaryDisplay: salaryDisplay.trim(),
        workplace,
        sector,
      });
      setTitle('');
      setCompany('');
      onClose();
    } catch {
      // Error toast is handled by AppContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3.5"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-label-sm text-secondary uppercase font-bold">Admin Fast-Track</span>
            <h3 className="font-headline-sm text-headline-sm font-bold text-primary">
              Post Urgent Role
            </h3>
          </div>
          <button
            aria-label="Close modal"
            className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-sm font-semibold text-on-surface">Role Title</label>
          <input
            className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Principal AI Systems Engineer"
            required
            type="text"
            value={title}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-sm font-semibold text-on-surface">Company</label>
          <input
            className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Anthropic"
            required
            type="text"
            value={company}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="font-label-sm font-semibold text-on-surface">Workplace</label>
            <select
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              onChange={(e) => setWorkplace(e.target.value as 'Remote' | 'Hybrid' | 'On-site')}
              value={workplace}
            >
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-sm font-semibold text-on-surface">Sector</label>
            <select
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              onChange={(e) => setSector(e.target.value)}
              value={sector}
            >
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="AI & ML">AI &amp; ML</option>
              <option value="Product Design">Product Design</option>
              <option value="DevOps">DevOps</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-sm font-semibold text-on-surface">Location</label>
          <input
            className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            onChange={(e) => setLocation(e.target.value)}
            type="text"
            value={location}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-sm font-semibold text-on-surface">Salary Range</label>
          <input
            className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            onChange={(e) => setSalaryDisplay(e.target.value)}
            type="text"
            value={salaryDisplay}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md font-semibold"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-[1.5] py-2.5 rounded-xl bg-primary-container hover:bg-secondary text-on-primary font-label-md font-bold shadow-sm disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Publishing...' : 'Publish Role Now'}
          </button>
        </div>
      </form>
    </div>
  );
}
