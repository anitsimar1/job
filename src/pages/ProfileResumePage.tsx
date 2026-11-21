import React, { useRef, useState } from 'react';
import { MobileTabShell } from '../components/layout/MobileTabShell';
import { SafeImage } from '../components/common/SafeImage';
import { useApp } from '../context/AppContext';

export function ProfileResumePage() {
  const {
    profile,
    updateProfile,
    uploadResume,
    downloadResume,
    setDefaultResume,
    deleteResume,
    addSkill,
    addExperience,
    showToast,
  } = useApp();

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkillText, setNewSkillText] = useState('');
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [prefsSalaryMin, setPrefsSalaryMin] = useState(profile.desiredSalaryMin / 1000);
  const [prefsSalaryMax, setPrefsSalaryMax] = useState(profile.desiredSalaryMax / 1000);
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleOrg, setNewRoleOrg] = useState('');
  const [newRolePeriod, setNewRolePeriod] = useState('2024 - Present');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [atsModalOpen, setAtsModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const primaryResume = profile.resumes.find((r) => r.isDefault) || profile.resumes[0];
  const secondaryResumes = profile.resumes.filter((r) => r.id !== primaryResume?.id);

  const handleSaveChanges = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    await updateProfile({
      ...profile,
      desiredSalaryMin: prefsSalaryMin * 1000,
      desiredSalaryMax: prefsSalaryMax * 1000,
    });
    setSaving(false);
    setSavedSuccess(true);
    window.setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillText.trim()) return;
    addSkill(newSkillText);
    setNewSkillText('');
    setAddingSkill(false);
  };

  const handleAddRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleTitle.trim() || !newRoleOrg.trim()) return;
    await addExperience({
      title: newRoleTitle.trim(),
      organization: newRoleOrg.trim(),
      period: newRolePeriod.trim(),
      type: 'work',
      icon: 'corporate_fare',
      description: newRoleDesc.trim() || 'Led technical architecture and product execution.',
    });
    setNewRoleTitle('');
    setNewRoleOrg('');
    setNewRoleDesc('');
    setAddingRole(false);
  };

  const handleAvatarSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateProfile({ ...profile, avatar: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <MobileTabShell pageLabel="Profile & Resume">
      <div className="flex flex-col w-full pb-10">
        <div className="w-full px-gutter-sm space-y-space-md max-w-4xl mx-auto">
          {/* Profile Completeness Banner */}
          <div className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl p-space-md shadow-md relative overflow-hidden mt-2">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span
                    className="material-symbols-outlined text-[20px] text-tertiary-fixed-dim"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    stars
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-primary font-bold">
                    Profile Strength: Exceptional
                  </span>
                </div>
                <span className="font-label-md text-label-md bg-white/15 px-space-xs py-0.5 rounded-full text-surface-bright font-semibold">
                  {profile.completeness}% Complete
                </span>
              </div>

              <p className="font-body-sm text-body-sm text-on-primary-container leading-relaxed">
                Your profile ranks in the{' '}
                <span className="text-tertiary-fixed font-semibold">Top 2%</span> of engineering
                candidates this week. 14 tech leads viewed you recently.
              </p>

              <div className="w-full bg-black/25 h-2 rounded-full overflow-hidden mt-space-2xs">
                <div
                  className="bg-gradient-to-r from-tertiary-fixed-dim to-secondary-fixed h-full rounded-full transition-all duration-500"
                  style={{ width: `${profile.completeness}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-space-2xs">
                <div className="flex items-center gap-1.5 text-surface-variant font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">
                    verified
                  </span>
                  <span>All core verifications complete</span>
                </div>
                <button
                  className="inline-flex items-center gap-1 font-label-md text-label-md text-surface-bright hover:text-white transition-colors underline underline-offset-2"
                  onClick={() => setPreviewOpen(true)}
                  type="button"
                >
                  <span>Public Preview</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_outward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Identity & Status Card */}
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-md relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-md">
              <div className="relative shrink-0">
                <SafeImage
                  alt={profile.fullName}
                  className="w-20 h-20 rounded-full object-cover shadow-sm bg-surface-container"
                  src={profile.avatar}
                />
                <button
                  aria-label="Update profile photo"
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:bg-secondary transition-all active:scale-90"
                  onClick={() => avatarInputRef.current?.click()}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                </button>
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelected}
                  ref={avatarInputRef}
                  type="file"
                />
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
                  <span
                    className="material-symbols-outlined text-tertiary-fixed-dim bg-tertiary rounded-full p-0.5 text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-space-xs">
                  <h1 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                    {profile.fullName}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-primary font-semibold">
                    <span className="material-symbols-outlined text-[13px] text-secondary">
                      verified
                    </span>
                    <span>Verified Pro</span>
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant font-medium mt-0.5">
                  {profile.title}
                </p>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-space-md mt-space-2xs text-on-surface-variant font-body-sm text-body-sm">
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[17px] text-outline">
                      location_on
                    </span>
                    <span>{profile.location}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[17px] text-outline">
                      schedule
                    </span>
                    <span>{profile.timezone}</span>
                  </span>
                </div>
                <div className="mt-space-sm">
                  <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container-low text-tertiary font-label-sm text-label-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse" />
                    <span>{profile.availabilityStatus}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumes & Documents */}
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-md space-y-space-md">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[22px]">
                    description
                  </span>
                  <span>Resumes &amp; Documents</span>
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Manage curated resumes for instant role-tailored applications
                </p>
              </div>
              <button
                className="inline-flex items-center gap-1.5 bg-primary text-on-primary hover:bg-secondary active:scale-95 transition-all px-space-sm py-2 rounded-lg font-label-sm text-label-sm font-semibold shadow-sm shrink-0"
                onClick={() => resumeInputRef.current?.click()}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                <span className="hidden sm:inline">Upload New CV</span>
                <span className="sm:hidden">Upload</span>
              </button>
              <input
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadResume(file);
                }}
                ref={resumeInputRef}
                type="file"
              />
            </div>

            {/* Primary Resume Card */}
            {primaryResume && (
              <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm space-y-space-sm relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                  <div className="flex items-start gap-space-sm min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 text-primary">
                      <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                          {primaryResume.fileName}
                        </span>
                        <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm px-space-xs py-0.5 rounded-full font-bold">
                          {primaryResume.label}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {primaryResume.fileSize} • {primaryResume.uploadedAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-2xs shrink-0 self-end sm:self-center">
                    <button
                      className="w-9 h-9 rounded-lg bg-surface-container-lowest text-on-surface hover:text-primary active:scale-95 flex items-center justify-center shadow-sm transition-all"
                      onClick={() => downloadResume(primaryResume.id, primaryResume.fileName)}
                      title="Download Resume"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </button>
                    <button
                      className="w-9 h-9 rounded-lg bg-surface-container-lowest text-on-surface hover:text-primary active:scale-95 flex items-center justify-center shadow-sm transition-all"
                      onClick={() => resumeInputRef.current?.click()}
                      title="Replace File"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">sync</span>
                    </button>
                    <button
                      className="w-9 h-9 rounded-lg bg-surface-container-lowest text-error hover:bg-error-container active:scale-95 flex items-center justify-center shadow-sm transition-all"
                      onClick={() => deleteResume(primaryResume.id)}
                      title="Delete Resume"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* ATS Score Panel */}
                <div className="bg-surface-container-lowest rounded-lg p-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs shadow-sm">
                  <div className="flex items-center gap-space-sm">
                    <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-surface-container"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                        />
                        <path
                          className="text-tertiary-fixed-dim"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray={`${primaryResume.atsScore || 94}, 100`}
                          strokeLinecap="round"
                          strokeWidth="3.5"
                        />
                      </svg>
                      <span className="absolute font-label-sm text-label-sm font-bold text-on-surface">
                        {primaryResume.atsScore || 94}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-md text-label-md text-on-surface font-bold">
                        ATS Compatibility Score: {primaryResume.atsScore || 94}/100
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {primaryResume.atsSummary ||
                          'Fully indexed for Staff, Architect, & Design Engineering roles'}
                      </p>
                    </div>
                  </div>
                  <button
                    className="font-label-sm text-label-sm text-secondary font-semibold hover:underline text-left sm:text-right"
                    onClick={() => setAtsModalOpen(true)}
                    type="button"
                  >
                    View Optimization Report →
                  </button>
                </div>
              </div>
            )}

            {/* Secondary Resume Cards */}
            {secondaryResumes.map((res) => (
              <div
                key={res.id}
                className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs"
              >
                <div className="flex items-start gap-space-sm min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 text-primary">
                    <span className="material-symbols-outlined text-[24px]">description</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                        {res.fileName}
                      </span>
                      <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm px-space-xs py-0.5 rounded-full">
                        {res.label}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {res.fileSize} • {res.uploadedAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-space-2xs shrink-0 self-end sm:self-center">
                  <button
                    className="px-space-xs py-1.5 rounded-lg bg-surface-container-lowest font-label-sm text-label-sm text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
                    onClick={() => setDefaultResume(res.id)}
                    type="button"
                  >
                    Set as Default
                  </button>
                  <button
                    className="w-9 h-9 rounded-lg bg-surface-container-lowest text-on-surface hover:text-primary active:scale-95 flex items-center justify-center shadow-sm transition-all"
                    onClick={() => downloadResume(res.id, res.fileName)}
                    title="Download"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                  <button
                    className="w-9 h-9 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-error active:scale-95 flex items-center justify-center shadow-sm transition-all"
                    onClick={() => deleteResume(res.id)}
                    title="Delete"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Target Career Preferences */}
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-md space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[22px]">target</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Target Career Preferences
                </h2>
              </div>
              <button
                className="font-label-sm text-label-sm text-secondary hover:underline font-semibold flex items-center gap-1"
                onClick={() => setEditingPrefs((p) => !p)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {editingPrefs ? 'check' : 'edit'}
                </span>
                <span>{editingPrefs ? 'Done' : 'Edit'}</span>
              </button>
            </div>

            {editingPrefs && (
              <div className="p-3 rounded-xl bg-surface-container-low space-y-2">
                <div className="flex justify-between font-label-sm text-on-surface">
                  <span>Desired Base Range ($k)</span>
                  <span className="font-bold text-primary">
                    ${prefsSalaryMin}k – ${prefsSalaryMax}k
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="w-full accent-secondary"
                    max={250}
                    min={100}
                    onChange={(e) => setPrefsSalaryMin(Number(e.target.value))}
                    step={5}
                    type="range"
                    value={prefsSalaryMin}
                  />
                  <input
                    className="w-full accent-secondary"
                    max={300}
                    min={120}
                    onChange={(e) => setPrefsSalaryMax(Number(e.target.value))}
                    step={5}
                    type="range"
                    value={prefsSalaryMax}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
              <div className="bg-surface-container-low p-space-sm rounded-lg space-y-space-xs">
                <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[16px] text-secondary">work</span>
                  <span>Target Roles</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.targetRoles.map((role) => (
                    <span
                      key={role}
                      className="bg-surface-container-lowest text-on-surface font-label-sm text-label-sm px-space-xs py-1 rounded shadow-sm font-medium"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-surface-container-low p-space-sm rounded-lg space-y-space-xs">
                <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[16px] text-tertiary-container">
                    payments
                  </span>
                  <span>Desired Compensation</span>
                </div>
                <div className="space-y-0.5">
                  <div className="font-label-lg text-label-lg font-bold text-tertiary-container">
                    ${prefsSalaryMin},000 - ${prefsSalaryMax},000
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {profile.compensationNote}
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-low p-space-sm rounded-lg space-y-space-xs">
                <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[16px] text-primary">public</span>
                  <span>Work Arrangements</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.workArrangements.map((arr, idx) => (
                    <span
                      key={arr}
                      className="bg-surface-container-lowest text-on-surface font-label-sm text-label-sm px-space-xs py-1 rounded shadow-sm font-medium flex items-center gap-1"
                    >
                      {idx === 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim" />
                      )}
                      {arr}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Verified Skills & Endorsements */}
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-md space-y-space-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[22px]">
                    verified_user
                  </span>
                  <span>Verified Skills &amp; Endorsements</span>
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Validated via JobConnect Technical Screenings &amp; Peer Reviews
                </p>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container px-space-xs py-1 rounded-full text-primary font-bold">
                {profile.skills.length} Core Skills
              </span>
            </div>

            <div className="flex flex-wrap gap-space-xs">
              {profile.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="inline-flex items-center gap-1.5 bg-surface-container-low text-on-surface px-space-sm py-1.5 rounded-full font-label-md text-label-md font-semibold shadow-sm"
                >
                  {skill.verified && (
                    <span
                      className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  )}
                  <span>{skill.name}</span>
                  {skill.percentile && (
                    <span className="bg-surface-container text-tertiary text-label-sm font-bold px-1.5 py-0.5 rounded-full">
                      {skill.percentile}
                    </span>
                  )}
                </div>
              ))}

              {addingSkill ? (
                <form className="inline-flex items-center gap-1.5" onSubmit={handleAddSkillSubmit}>
                  <input
                    autoFocus
                    className="h-8 px-3 rounded-full bg-surface-container-low text-on-surface text-label-md focus:outline-none focus:ring-2 focus:ring-secondary"
                    onChange={(e) => setNewSkillText(e.target.value)}
                    placeholder="Skill name..."
                    type="text"
                    value={newSkillText}
                  />
                  <button
                    className="h-8 px-3 rounded-full bg-primary text-on-primary text-label-sm font-bold"
                    type="submit"
                  >
                    Add
                  </button>
                </form>
              ) : (
                <button
                  className="inline-flex items-center gap-1 bg-surface-container-high hover:bg-surface-container-highest text-primary px-space-sm py-1.5 rounded-full font-label-md text-label-md font-semibold active:scale-95 transition-all"
                  onClick={() => setAddingSkill(true)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Skill</span>
                </button>
              )}
            </div>
          </div>

          {/* Experience & Education */}
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-md space-y-space-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  history_edu
                </span>
                <span>Experience &amp; Education</span>
              </h2>
              <button
                className="font-label-sm text-label-sm text-primary hover:underline font-semibold flex items-center gap-1"
                onClick={() => setAddingRole((p) => !p)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>{addingRole ? 'Cancel' : 'Add Role'}</span>
              </button>
            </div>

            {addingRole && (
              <form
                className="p-3.5 rounded-xl bg-surface-container-low space-y-2.5"
                onSubmit={handleAddRoleSubmit}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    className="h-10 px-3 rounded-lg bg-surface-container-lowest text-body-sm"
                    onChange={(e) => setNewRoleTitle(e.target.value)}
                    placeholder="Role Title (e.g. Principal Engineer)"
                    required
                    type="text"
                    value={newRoleTitle}
                  />
                  <input
                    className="h-10 px-3 rounded-lg bg-surface-container-lowest text-body-sm"
                    onChange={(e) => setNewRoleOrg(e.target.value)}
                    placeholder="Company & Type"
                    required
                    type="text"
                    value={newRoleOrg}
                  />
                </div>
                <input
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest text-body-sm"
                  onChange={(e) => setNewRolePeriod(e.target.value)}
                  placeholder="Period (e.g. 2023 - Present)"
                  type="text"
                  value={newRolePeriod}
                />
                <textarea
                  className="w-full p-3 rounded-lg bg-surface-container-lowest text-body-sm"
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Key impact & achievements..."
                  rows={2}
                  value={newRoleDesc}
                />
                <button
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md font-bold"
                  type="submit"
                >
                  Add Experience Entry
                </button>
              </form>
            )}

            <div className="space-y-space-sm relative">
              {profile.experience.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 text-primary">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <h3 className="font-label-lg text-label-lg text-on-surface font-bold">
                        {item.title}
                      </h3>
                      <span
                        className={`font-label-sm text-label-sm px-space-xs py-0.5 rounded-full ${
                          item.period.includes('Present')
                            ? 'text-tertiary bg-surface-container font-semibold'
                            : 'text-on-surface-variant bg-surface-container'
                        }`}
                      >
                        {item.period}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-secondary font-medium">
                      {item.organization}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Linked Accounts & Portfolio */}
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-md space-y-space-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[22px]">link</span>
                <span>Linked Profiles &amp; Work</span>
              </h2>
              <span className="font-label-sm text-label-sm text-tertiary-fixed-dim bg-tertiary px-space-xs py-0.5 rounded-full font-bold">
                All Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
              <a
                className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-all group shadow-sm"
                href={profile.links.github}
                rel="noreferrer"
                target="_blank"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface">
                  <span className="material-symbols-outlined text-[20px]">terminal</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-label-md text-label-md text-on-surface font-bold group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>GitHub</span>
                    <span className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim">
                      verified
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    {profile.links.githubMeta}
                  </p>
                </div>
              </a>

              <a
                className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-all group shadow-sm"
                href={profile.links.linkedin}
                rel="noreferrer"
                target="_blank"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-label-md text-label-md text-on-surface font-bold group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>LinkedIn</span>
                    <span className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim">
                      verified
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    linkedin.com/in/erostova
                  </p>
                </div>
              </a>

              <a
                className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-all group shadow-sm"
                href={profile.links.portfolio}
                rel="noreferrer"
                target="_blank"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">language</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-label-md text-label-md text-on-surface font-bold group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Portfolio</span>
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      open_in_new
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    erostova.design
                  </p>
                </div>
              </a>
            </div>
          </div>

          {/* Sticky Save Action Bar */}
          <div className="sticky bottom-20 lg:bottom-4 z-40 bg-surface-container-lowest/95 backdrop-blur-md rounded-xl p-space-sm shadow-xl flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm hidden sm:flex">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim" />
              <span>Auto-synced with talent pool</span>
            </div>
            <div className="flex items-center gap-space-xs w-full sm:w-auto justify-end">
              <button
                className="px-space-md py-2.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors"
                onClick={() => {
                  setPrefsSalaryMin(profile.desiredSalaryMin / 1000);
                  setPrefsSalaryMax(profile.desiredSalaryMax / 1000);
                  setEditingPrefs(false);
                  showToast('Unsaved changes discarded', 'refresh');
                }}
                type="button"
              >
                Discard
              </button>
              <button
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-space-lg py-2.5 rounded-lg text-on-primary font-label-md text-label-md font-bold shadow-md active:scale-95 transition-all ${
                  savedSuccess ? 'bg-tertiary' : 'bg-primary hover:bg-secondary'
                }`}
                disabled={saving}
                onClick={handleSaveChanges}
                type="button"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      refresh
                    </span>
                    <span>Saving...</span>
                  </>
                ) : savedSuccess ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">done_all</span>
                    <span>Saved Successfully</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ATS Report Modal */}
      {atsModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAtsModalOpen(false);
          }}
        >
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm font-bold text-on-surface">
                ATS Optimization Report (94/100)
              </h3>
              <button
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
                onClick={() => setAtsModalOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-2 text-body-sm">
              <div className="p-3 rounded-xl bg-surface-container-low flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary-container">check_circle</span>
                <span>Strong quantifiable impact metrics (42% TTFB improvement)</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary-container">check_circle</span>
                <span>Core React 19, Next.js 15, TypeScript keywords indexed</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">tips_and_updates</span>
                <span>Tip: Add WCAG 2.2 accessibility audit metrics for +4 pts</span>
              </div>
            </div>
            <button
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md font-bold"
              onClick={() => setAtsModalOpen(false)}
              type="button"
            >
              Close Report
            </button>
          </div>
        </div>
      )}

      {/* Public Preview Modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-[70] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
        >
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-secondary font-bold uppercase">
                Recruiter View
              </span>
              <button
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
                onClick={() => setPreviewOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <SafeImage
                alt={profile.fullName}
                className="w-14 h-14 rounded-full object-cover"
                src={profile.avatar}
              />
              <div>
                <h3 className="font-headline-sm font-bold text-on-surface">{profile.fullName}</h3>
                <p className="text-body-sm text-on-surface-variant">{profile.title}</p>
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Visible to verified hiring managers: {profile.skills.length} skills,{' '}
              {profile.experience.length} timeline items, default CV ({primaryResume?.fileName}).
            </p>
            <button
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md font-bold"
              onClick={() => setPreviewOpen(false)}
              type="button"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </MobileTabShell>
  );
}
