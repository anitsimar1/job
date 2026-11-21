import { CandidateProfile, ExperienceItem, ResumeDocument } from '../types';
import { resumeService } from './resumeService';
import { userService } from './userService';

/**
 * Compatibility facade preserving existing profileService imports while delegating
 * to separated userService and resumeService modules.
 */
export const profileService = {
  getCurrentProfile(): Promise<CandidateProfile> {
    return userService.getCurrentProfile();
  },
  updateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
    return userService.updateProfile(profile);
  },
  uploadResume(file: File): Promise<ResumeDocument> {
    return resumeService.uploadResume(file);
  },
  addExperience(item: Omit<ExperienceItem, 'id'>): Promise<ExperienceItem> {
    return userService.addExperience(item);
  },
};
