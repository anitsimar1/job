import { INITIAL_PROFILE } from '../data/mockData';
import { CandidateProfile, ExperienceItem, ResumeDocument, VerifiedSkill } from '../types';
import { apiClient, withMockFallback } from './apiClient';
import { SpringResumeDto, toResumeDocument } from './resumeService';

export interface CareerPreferencesPayload {
  targetRoles: string[];
  desiredSalaryMin: number;
  desiredSalaryMax: number;
  compensationNote: string;
  workArrangements: string[];
}

export interface SpringUserProfileDto {
  id: number | string;
  fullName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  title?: string;
  location?: string;
  professionalSummary?: string;
  skills?: string;
  experience?: string;
  education?: string;
  targetRoles?: string;
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  workArrangements?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumes?: SpringResumeDto[];
}

function mergeProfileDto(dto: SpringUserProfileDto, base: CandidateProfile = INITIAL_PROFILE): CandidateProfile {
  const parsedSkills: VerifiedSkill[] = dto.skills
    ? dto.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name, idx) => ({ id: `sk-${idx + 1}`, name, verified: idx < 3 }))
    : base.skills;

  const parsedRoles = dto.targetRoles
    ? dto.targetRoles
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : base.targetRoles;

  const parsedArrangements = dto.workArrangements
    ? dto.workArrangements
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : base.workArrangements;

  const parsedResumes: ResumeDocument[] = Array.isArray(dto.resumes)
    ? dto.resumes.map(toResumeDocument)
    : base.resumes;

  return {
    ...base,
    fullName: dto.fullName || base.fullName,
    drawerDisplayName: dto.fullName || base.drawerDisplayName,
    email: dto.email || base.email,
    phone: dto.phone ?? base.phone,
    title: dto.title || base.title,
    location: dto.location || base.location,
    avatar: dto.profileImage || base.avatar,
    skills: parsedSkills,
    targetRoles: parsedRoles,
    desiredSalaryMin: dto.desiredSalaryMin ?? base.desiredSalaryMin,
    desiredSalaryMax: dto.desiredSalaryMax ?? base.desiredSalaryMax,
    workArrangements: parsedArrangements,
    resumes: parsedResumes,
    links: {
      github: dto.githubUrl || base.links.github,
      githubMeta: dto.githubUrl ? dto.githubUrl.replace(/^https?:\/\//, '') : base.links.githubMeta,
      linkedin: dto.linkedinUrl || base.links.linkedin,
      portfolio: dto.portfolioUrl || base.links.portfolio,
    },
  };
}

/**
 * Users & Profile service aligned with Spring Boot endpoints:
 * - GET /users/profile
 * - PUT /users/profile
 */
export const userService = {
  async getCurrentProfile(): Promise<CandidateProfile> {
    return withMockFallback(
      async () => {
        const dto = await apiClient.get<SpringUserProfileDto>('/users/profile');
        return mergeProfileDto(dto);
      },
      () => INITIAL_PROFILE
    );
  },

  async updateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
    return withMockFallback(
      async () => {
        const payload = {
          fullName: profile.fullName,
          phone: profile.phone,
          title: profile.title,
          location: profile.location,
          professionalSummary: profile.availabilityStatus,
          skills: profile.skills.map((s) => s.name).join(', '),
          experience: profile.experience
            .filter((e) => e.type === 'work')
            .map((e) => `${e.title} @ ${e.organization} (${e.period}): ${e.description}`)
            .join('\n'),
          education: profile.experience
            .filter((e) => e.type === 'education')
            .map((e) => `${e.title} - ${e.organization} (${e.period})`)
            .join('\n'),
          targetRoles: profile.targetRoles.join(', '),
          desiredSalaryMin: profile.desiredSalaryMin,
          desiredSalaryMax: profile.desiredSalaryMax,
          workArrangements: profile.workArrangements.join(', '),
          githubUrl: profile.links.github,
          linkedinUrl: profile.links.linkedin,
          portfolioUrl: profile.links.portfolio,
        };
        const updatedDto = await apiClient.put<SpringUserProfileDto>('/users/profile', payload);
        return mergeProfileDto(updatedDto, profile);
      },
      () => profile
    );
  },

  async updatePreferences(preferences: CareerPreferencesPayload): Promise<CareerPreferencesPayload> {
    return withMockFallback(
      () => apiClient.put<CareerPreferencesPayload>('/users/profile', preferences),
      () => preferences
    );
  },

  async addSkill(skillName: string): Promise<VerifiedSkill> {
    return {
      id: `sk-${Date.now()}`,
      name: skillName.trim(),
      verified: false,
    };
  },

  async addExperience(item: Omit<ExperienceItem, 'id'>): Promise<ExperienceItem> {
    return {
      ...item,
      id: `exp-${Date.now()}`,
    };
  },
};
