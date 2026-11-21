import React, { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StackShell } from '../components/layout/StackShell';
import { SafeImage } from '../components/common/SafeImage';
import { useApp } from '../context/AppContext';
import { ApplyFormData } from '../types';

export function ApplyJobPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, profile, submitApplication, uploadResume, showToast } = useApp();
  const job = jobs.find((j) => j.id === id) || jobs[0];

  const defaultResume = profile.resumes.find((r) => r.isDefault) || profile.resumes[0];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [editingAutoFill, setEditingAutoFill] = useState(false);

  const [formData, setFormData] = useState<ApplyFormData>({
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: 'San Francisco, CA (Remote)',
    resumeId: defaultResume?.id || 'res-1',
    githubUrl: profile.links.github,
    linkedinUrl: profile.links.linkedin,
    experienceYears: '5-7 yrs',
    workAuthorized: true,
    requiresSponsorship: false,
    noticePeriod: '2 Weeks',
    shortPitch: '',
    consentAgreed: true,
  });

  const selectedResume =
    profile.resumes.find((r) => r.id === formData.resumeId) || profile.resumes[0];

  const handleResumeSwap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadResume(file);
  };

  const handleReview = () => {
    if (!formData.fullName.trim() || !formData.email.trim()) {
      showToast('Please complete your name and email', 'error');
      return;
    }
    if (!formData.consentAgreed) {
      showToast('Please accept the data processing consent checkbox', 'info');
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      await submitApplication(job, formData);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Error toast is surfaced by AppContext via normalizeApiError
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%';
  const stepTitle =
    step === 1
      ? 'Profile & Experience'
      : step === 2
      ? 'Review Application'
      : 'Application Submitted';

  return (
    <StackShell backTo={`/jobs/${job.id}`} title="Apply For Job">
      <div className="flex flex-col w-full pb-28">
        {/* Stepper & Subheader Progress */}
        <div className="px-gutter-sm py-space-sm bg-surface-container-low flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <Link
              className="inline-flex items-center gap-space-2xs text-secondary hover:text-primary transition-colors py-1"
              to={`/jobs/${job.id}`}
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="font-label-md text-label-md">Back to Job Details</span>
            </Link>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              Step {step} of 3
            </span>
          </div>
          <div className="flex items-center justify-between text-on-surface mt-0.5">
            <span className="font-headline-sm text-headline-sm font-semibold">{stepTitle}</span>
            <span className="font-label-sm text-label-sm text-secondary font-bold">
              {step === 1 ? '33%' : step === 2 ? '66%' : '100%'} Complete
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500 ease-out"
              style={{ width: progressPercent }}
            />
          </div>
        </div>

        <div className="px-gutter-sm flex flex-col gap-space-md mt-space-md">
          {/* Context Job Summary Card */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-11 h-11 rounded-lg bg-surface-container flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                <SafeImage
                  alt={job.company}
                  className="w-11 h-11 rounded-lg object-cover"
                  src={job.companyLogo}
                />
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  {job.company}
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                  {job.title}
                </h2>
                <div className="flex items-center gap-space-xs mt-1 flex-wrap">
                  <span className="bg-surface-container-high text-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold">
                    {job.salaryDisplay.replace(' / yr', '')}
                  </span>
                  <span className="bg-surface-container-low text-secondary font-label-sm text-label-sm px-2 py-0.5 rounded-full">
                    {job.workplace === 'Remote' ? 'Remote (US)' : job.location}
                  </span>
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
          </div>

          {step === 1 && (
            <>
              {/* Fast Auto-Fill Delight Banner */}
              <div className="bg-surface-container p-space-sm rounded-xl flex items-center justify-between gap-space-sm shadow-xs transition-all">
                <div className="flex items-center gap-space-xs min-w-0">
                  <div className="w-7 h-7 rounded-full bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
                    <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                  </div>
                  <div className="truncate">
                    <p className="font-label-sm text-label-sm text-on-surface truncate">
                      Auto-filled from{' '}
                      <span className="font-semibold text-secondary">{profile.fullName}</span>
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim" />
                      Profile {profile.completeness}% Complete
                    </p>
                  </div>
                </div>
                <button
                  className="shrink-0 font-label-md text-label-md text-secondary hover:text-primary font-semibold px-2 py-1 rounded hover:bg-surface-container-high transition-colors"
                  onClick={() => {
                    setEditingAutoFill((p) => !p);
                    showToast('Personal fields unlocked for editing', 'edit');
                  }}
                  type="button"
                >
                  {editingAutoFill ? 'Done' : 'Edit'}
                </button>
              </div>

              <form
                className="flex flex-col gap-space-lg"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleReview();
                }}
              >
                {/* Section 1: Personal Information */}
                <section className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-6 h-6 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-label-sm text-label-sm font-bold">
                        1
                      </span>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Personal Information
                      </h3>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Required
                    </span>
                  </div>

                  <div className="flex flex-col gap-space-sm">
                    <div className="flex flex-col gap-1">
                      <label
                        className="font-label-sm text-label-sm font-semibold text-on-surface"
                        htmlFor="fullName"
                      >
                        Full Legal Name
                      </label>
                      <div className="relative">
                        <input
                          className="w-full h-11 px-3 pl-10 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
                          id="fullName"
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, fullName: e.target.value }))
                          }
                          type="text"
                          value={formData.fullName}
                        />
                        <span className="material-symbols-outlined absolute left-3 top-3 text-[18px] text-on-surface-variant">
                          person
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label
                        className="font-label-sm text-label-sm font-semibold text-on-surface"
                        htmlFor="email"
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          className="w-full h-11 px-3 pl-10 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
                          id="email"
                          onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                          type="email"
                          value={formData.email}
                        />
                        <span className="material-symbols-outlined absolute left-3 top-3 text-[18px] text-on-surface-variant">
                          mail
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                      <div className="flex flex-col gap-1">
                        <label
                          className="font-label-sm text-label-sm font-semibold text-on-surface"
                          htmlFor="phone"
                        >
                          Phone Number
                        </label>
                        <div className="relative">
                          <input
                            className="w-full h-11 px-3 pl-10 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
                            id="phone"
                            onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                            type="tel"
                            value={formData.phone}
                          />
                          <span className="material-symbols-outlined absolute left-3 top-3 text-[18px] text-on-surface-variant">
                            call
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label
                          className="font-label-sm text-label-sm font-semibold text-on-surface"
                          htmlFor="location"
                        >
                          Current Location
                        </label>
                        <div className="relative">
                          <input
                            className="w-full h-11 px-3 pl-10 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
                            id="location"
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, location: e.target.value }))
                            }
                            type="text"
                            value={formData.location}
                          />
                          <span className="material-symbols-outlined absolute left-3 top-3 text-[18px] text-on-surface-variant">
                            location_on
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 2: Resume & Portfolios */}
                <section className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-6 h-6 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-label-sm text-label-sm font-bold">
                        2
                      </span>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Resume &amp; Portfolios
                      </h3>
                    </div>
                    <span className="font-label-sm text-label-sm text-tertiary-container font-semibold">
                      Active File
                    </span>
                  </div>

                  <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-space-xs">
                    <div className="flex items-center gap-space-xs min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">description</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                            {selectedResume?.fileName}
                          </span>
                          <span
                            className="material-symbols-outlined text-[16px] text-tertiary-container"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            check_circle
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {selectedResume?.fileSize} • {selectedResume?.uploadedAt}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        aria-label="View Resume"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all"
                        onClick={() =>
                          showToast(`Previewing ${selectedResume?.fileName}`, 'visibility')
                        }
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button
                        aria-label="Replace Resume"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container active:scale-95 transition-all"
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                      </button>
                      <input
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleResumeSwap}
                        ref={fileInputRef}
                        type="file"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-sm">
                    <div className="flex flex-col gap-1">
                      <label
                        className="font-label-sm text-label-sm font-semibold text-on-surface"
                        htmlFor="githubLink"
                      >
                        Portfolio / GitHub Profile
                      </label>
                      <div className="relative">
                        <input
                          className="w-full h-11 px-3 pl-10 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
                          id="githubLink"
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, githubUrl: e.target.value }))
                          }
                          type="url"
                          value={formData.githubUrl}
                        />
                        <span className="material-symbols-outlined absolute left-3 top-3 text-[18px] text-on-surface-variant">
                          code
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label
                        className="font-label-sm text-label-sm font-semibold text-on-surface"
                        htmlFor="linkedinLink"
                      >
                        LinkedIn URL
                      </label>
                      <div className="relative">
                        <input
                          className="w-full h-11 px-3 pl-10 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
                          id="linkedinLink"
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, linkedinUrl: e.target.value }))
                          }
                          type="url"
                          value={formData.linkedinUrl}
                        />
                        <span className="material-symbols-outlined absolute left-3 top-3 text-[18px] text-on-surface-variant">
                          link
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3: Experience & Eligibility */}
                <section className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-md">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-6 h-6 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-label-sm text-label-sm font-bold">
                      3
                    </span>
                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      Experience &amp; Eligibility
                    </h3>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-label-sm text-label-sm font-semibold text-on-surface">
                      Relevant React / Frontend Experience
                    </label>
                    <div className="grid grid-cols-4 gap-space-xs">
                      {['1-3 yrs', '3-5 yrs', '5-7 yrs', '8+ yrs'].map((yr) => (
                        <button
                          key={yr}
                          className={`h-10 rounded-lg font-label-sm text-label-sm font-semibold transition-all flex items-center justify-center ${
                            formData.experienceYears === yr
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                          }`}
                          onClick={() => setFormData((p) => ({ ...p, experienceYears: yr }))}
                          type="button"
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <label className="font-label-sm text-label-sm font-semibold text-on-surface">
                      Legally authorized to work in the US?
                    </label>
                    <div className="flex gap-space-sm">
                      <label className="flex-1 flex items-center gap-2 p-space-xs px-space-sm rounded-lg bg-surface-container-low cursor-pointer">
                        <input
                          checked={formData.workAuthorized}
                          className="w-4 h-4 text-primary focus:ring-secondary"
                          name="work_auth"
                          onChange={() => setFormData((p) => ({ ...p, workAuthorized: true }))}
                          type="radio"
                        />
                        <span className="font-label-md text-label-md text-on-surface">
                          Yes, authorized
                        </span>
                      </label>
                      <label className="flex-1 flex items-center gap-2 p-space-xs px-space-sm rounded-lg bg-surface-container-low cursor-pointer">
                        <input
                          checked={!formData.workAuthorized}
                          className="w-4 h-4 text-primary focus:ring-secondary"
                          name="work_auth"
                          onChange={() => setFormData((p) => ({ ...p, workAuthorized: false }))}
                          type="radio"
                        />
                        <span className="font-label-md text-label-md text-on-surface">No</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <label className="font-label-sm text-label-sm font-semibold text-on-surface">
                      Will you now or in the future require visa sponsorship?
                    </label>
                    <div className="flex gap-space-sm">
                      <label className="flex-1 flex items-center gap-2 p-space-xs px-space-sm rounded-lg bg-surface-container-low cursor-pointer">
                        <input
                          checked={formData.requiresSponsorship}
                          className="w-4 h-4 text-primary focus:ring-secondary"
                          name="sponsorship"
                          onChange={() =>
                            setFormData((p) => ({ ...p, requiresSponsorship: true }))
                          }
                          type="radio"
                        />
                        <span className="font-label-md text-label-md text-on-surface">Yes</span>
                      </label>
                      <label className="flex-1 flex items-center gap-2 p-space-xs px-space-sm rounded-lg bg-surface-container-low cursor-pointer">
                        <input
                          checked={!formData.requiresSponsorship}
                          className="w-4 h-4 text-primary focus:ring-secondary"
                          name="sponsorship"
                          onChange={() =>
                            setFormData((p) => ({ ...p, requiresSponsorship: false }))
                          }
                          type="radio"
                        />
                        <span className="font-label-md text-label-md text-on-surface">
                          No, not required
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <label className="font-label-sm text-label-sm font-semibold text-on-surface">
                      Earliest Availability / Notice Period
                    </label>
                    <div className="grid grid-cols-3 gap-space-xs">
                      {['Immediate', '2 Weeks', '1 Month+'].map((period) => (
                        <button
                          key={period}
                          className={`h-10 rounded-lg font-label-sm text-label-sm font-semibold transition-all flex items-center justify-center ${
                            formData.noticePeriod === period
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                          }`}
                          onClick={() => setFormData((p) => ({ ...p, noticePeriod: period }))}
                          type="button"
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Section 4: Short Pitch */}
                <section className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-6 h-6 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-label-sm text-label-sm font-bold">
                        4
                      </span>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Short Pitch
                      </h3>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Optional
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Share quick highlights of why your engineering toolkit and architecture patterns
                    are a tailored match for {job.company}.
                  </p>
                  <textarea
                    className="w-full p-3 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-surface-container-lowest transition-all placeholder:text-outline resize-none"
                    onChange={(e) => setFormData((p) => ({ ...p, shortPitch: e.target.value }))}
                    placeholder={`Highlight why you're a great fit for ${job.company}... (e.g. Led migration to Next.js App Router, optimized core web vitals by 40%)`}
                    rows={4}
                    value={formData.shortPitch}
                  />
                </section>

                {/* Section 5: Consent */}
                <section className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
                  <div className="flex items-start gap-space-sm">
                    <input
                      checked={formData.consentAgreed}
                      className="mt-1 w-5 h-5 rounded text-primary focus:ring-secondary accent-primary cursor-pointer shrink-0"
                      id="consentCheck"
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, consentAgreed: e.target.checked }))
                      }
                      type="checkbox"
                    />
                    <label
                      className="font-body-sm text-body-sm text-on-surface leading-snug cursor-pointer"
                      htmlFor="consentCheck"
                    >
                      I agree to JobConnect Privacy Policy and allow{' '}
                      <span className="font-semibold text-primary">{job.company}</span> to process
                      my candidate data for hiring and interview scheduling purposes.
                    </label>
                  </div>
                </section>
              </form>
            </>
          )}

          {step === 2 && (
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm font-bold text-on-surface">
                  Confirm Application Packet
                </h3>
                <button
                  className="font-label-md text-secondary font-semibold hover:underline"
                  onClick={() => setStep(1)}
                  type="button"
                >
                  Edit Details
                </button>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4 space-y-2.5 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Candidate</span>
                  <span className="font-semibold text-on-surface">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Email</span>
                  <span className="font-semibold text-on-surface">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Resume</span>
                  <span className="font-semibold text-primary truncate max-w-[200px]">
                    {selectedResume?.fileName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Experience &amp; Notice</span>
                  <span className="font-semibold text-on-surface">
                    {formData.experienceYears} • {formData.noticePeriod}
                  </span>
                </div>
                {formData.shortPitch && (
                  <div className="pt-2 border-t border-outline-variant/30">
                    <span className="font-label-sm text-on-surface-variant block mb-1">
                      Short Pitch
                    </span>
                    <p className="text-on-surface italic">“{formData.shortPitch}”</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-md text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                <span
                  className="material-symbols-outlined text-[36px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                  Application Sent to {job.company}!
                </h3>
                <p className="font-body-sm text-on-surface-variant mt-1 max-w-sm">
                  Your packet with <span className="font-semibold">{selectedResume?.fileName}</span>{' '}
                  has been added to your active pipeline.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
                <button
                  className="flex-1 py-3 rounded-xl bg-surface-container text-primary font-label-lg font-semibold"
                  onClick={() => navigate('/jobs')}
                  type="button"
                >
                  Browse More Roles
                </button>
                <button
                  className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-label-lg font-bold shadow-md"
                  onClick={() => navigate('/applications')}
                  type="button"
                >
                  Track in My Applications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Floating CTA Dock */}
        {step < 3 && (
          <div className="fixed bottom-0 inset-x-0 bg-surface/90 backdrop-blur-md px-gutter-sm py-space-sm shadow-xl z-40 pb-safe">
            <div className="flex items-center gap-space-sm max-w-lg mx-auto">
              <button
                className="h-12 px-4 rounded-lg bg-surface-container-high text-primary font-label-lg text-label-lg font-semibold hover:bg-surface-container active:scale-95 transition-all flex items-center justify-center gap-1 shrink-0"
                onClick={() => showToast('Application draft saved locally', 'bookmark')}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">bookmark_border</span>
                <span className="hidden sm:inline">Save Draft</span>
              </button>

              {step === 1 ? (
                <button
                  className="flex-1 h-12 px-space-md rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold hover:bg-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-space-xs shadow-md"
                  onClick={handleReview}
                  type="button"
                >
                  <span>Review &amp; Submit Application</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              ) : (
                <button
                  className="flex-1 h-12 px-space-md rounded-lg bg-tertiary-container text-tertiary-fixed font-label-lg text-label-lg font-bold hover:bg-tertiary active:scale-[0.98] transition-all flex items-center justify-center gap-space-xs shadow-md disabled:opacity-60"
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                  type="button"
                >
                  <span>{submitting ? 'Submitting...' : 'Confirm & Submit Now'}</span>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </StackShell>
  );
}
