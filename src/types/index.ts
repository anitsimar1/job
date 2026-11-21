export type WorkplaceType = 'Remote' | 'Hybrid' | 'On-site';
export type EmploymentType = 'Full-time' | 'Contract / C2C' | 'Executive Advisory';
export type ExperienceLevel = 'Mid Level' | 'Senior Level' | 'Staff / Lead' | 'Principal' | 'Engineering Lead';

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  companyTagline?: string;
  companySize?: string;
  companyLogo?: string;
  companyInitials?: string;
  companyIcon?: string;
  verified: boolean;
  location: string;
  workplace: WorkplaceType;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  yearsRequired: string;
  salaryDisplay: string;
  minSalaryK: number;
  maxSalaryK: number;
  equity?: string;
  matchScore: number;
  sector: string;
  tags: string[];
  postedAgo: string;
  applicantsCount: number;
  urgencyLabel: string;
  urgencyTone?: 'tertiary' | 'secondary' | 'neutral';
  featured?: boolean;
  isHot?: boolean;
  aboutRole: string[];
  responsibilities: {
    icon: string;
    title: string;
    description: string;
  }[];
  requirements: string[];
  perks: {
    icon: string;
    title: string;
    subtitle: string;
  }[];
  hiringManager: {
    name: string;
    role: string;
    avatar: string;
    status: string;
    responseTime: string;
    quote: string;
  };
  officeImage?: string;
  officeLabel?: string;
}

export interface FeaturedEmployer {
  id: string;
  name: string;
  rolesCount: number;
  logo: string;
  badgeTone: 'tertiary' | 'secondary';
}

export interface SectorItem {
  id: string;
  name: string;
  icon: string;
  countLabel: string;
  iconColorClass?: string;
}

export type ApplicationStatus = 'in-review' | 'interviewing' | 'offered' | 'archived';

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyLogo: string;
  location: string;
  salaryRange: string;
  status: ApplicationStatus;
  stageBadge: string;
  stageNumber: number;
  totalStages: number;
  stageSteps: string[];
  appliedAgo: string;
  nextMilestone?: {
    label: string;
    detail: string;
    highlight?: string;
    icon: string;
    tone: 'secondary' | 'neutral' | 'tertiary';
  };
  activityNote?: string;
  resumeUsed: string;
  coverNote?: string;
}

export interface OfferSpotlight {
  id: string;
  jobId: string;
  company: string;
  companyLogo: string;
  roleTitle: string;
  compensation: string;
  expiresIn: string;
  decisionDeadline: string;
  equityDetails: string;
  signingBonus: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface ResumeDocument {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  isDefault: boolean;
  label: string;
  atsScore?: number;
  atsSummary?: string;
}

export interface ExperienceItem {
  id: string;
  title: string;
  organization: string;
  period: string;
  type: 'work' | 'education';
  icon: string;
  description: string;
}

export interface VerifiedSkill {
  id: string;
  name: string;
  verified: boolean;
  percentile?: string;
}

export interface CandidateProfile {
  fullName: string;
  drawerDisplayName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  timezone: string;
  availabilityStatus: string;
  avatar: string;
  completeness: number;
  targetRoles: string[];
  desiredSalaryMin: number;
  desiredSalaryMax: number;
  compensationNote: string;
  workArrangements: string[];
  skills: VerifiedSkill[];
  resumes: ResumeDocument[];
  experience: ExperienceItem[];
  links: {
    github: string;
    githubMeta: string;
    linkedin: string;
    portfolio: string;
  };
}

export interface ModerationListing {
  id: string;
  initials: string;
  title: string;
  company: string;
  location: string;
  status: 'NEW LISTING' | 'DUPLICATE' | 'ACTIVE' | 'APPROVED' | 'REJECTED';
  submittedAgo: string;
  salaryRange: string;
  note?: string;
  flagReason?: string;
}

export interface AdminMetrics {
  activeJobs: number;
  activeJobsGrowth: string;
  totalCandidates: number;
  candidatesGrowth: string;
  applicationsSubmitted: number;
  applicationsGrowth: string;
  placementsMade: number;
  avgHireDays: string;
  offerAcceptanceRate: string;
}

export type BackendApplicationStatus =
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'HIRED';

export interface UserSummary {
  id: number | string;
  fullName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  roles: string[];
  enabled: boolean;
  createdAt?: string;
  authProvider?: 'LOCAL' | 'GOOGLE';
  emailVerified?: boolean;
}

export interface AuthSession {
  isAuthenticated: boolean;
  isDemoMode: boolean;
  userId?: string;
  userEmail: string;
  userName: string;
  role: 'JOB_SEEKER' | 'ADMIN';
  authProvider?: 'LOCAL' | 'GOOGLE';
  emailVerified?: boolean;
  rememberMe: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
}

export interface ApplyFormData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  resumeId: string;
  githubUrl: string;
  linkedinUrl: string;
  experienceYears: string;
  workAuthorized: boolean;
  requiresSponsorship: boolean;
  noticePeriod: string;
  shortPitch: string;
  consentAgreed: boolean;
}
