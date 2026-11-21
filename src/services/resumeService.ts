import { INITIAL_PROFILE } from '../data/mockData';
import { ResumeDocument } from '../types';
import { apiClient, axiosInstance, IS_MOCK_MODE, normalizeApiError, withMockFallback } from './apiClient';

export interface SpringResumeDto {
  id: number | string;
  fileName: string;
  contentType?: string;
  fileSizeBytes?: number;
  isDefault?: boolean;
  default?: boolean;
  atsScore?: number;
  uploadedAt?: string;
}

export function toResumeDocument(dto: SpringResumeDto): ResumeDocument {
  const bytes = dto.fileSizeBytes ?? 1_200_000;
  const sizeMb = (bytes / (1024 * 1024)).toFixed(1);
  const isDefault = Boolean(dto.isDefault ?? dto.default);
  return {
    id: String(dto.id),
    fileName: dto.fileName,
    fileSize: `${Number(sizeMb) > 0 ? sizeMb : '0.4'} MB`,
    uploadedAt: dto.uploadedAt
      ? `Uploaded ${new Date(dto.uploadedAt).toLocaleDateString()}`
      : 'Uploaded just now',
    isDefault,
    label: isDefault ? 'Default 1-Click' : 'Tailored CV',
    atsScore: dto.atsScore ?? 92,
    atsSummary: 'Indexed and ready for instant 1-click applications',
  };
}

/**
 * Resume & Document service aligned with Spring Boot endpoints:
 * - POST   /resumes/upload (multipart/form-data)
 * - GET    /resumes/my
 * - GET    /resumes/{id}/download
 * - PATCH  /resumes/{id}/default
 * - DELETE /resumes/{id}
 */
export const resumeService = {
  async listResumes(): Promise<ResumeDocument[]> {
    return withMockFallback(
      async () => {
        const res = await apiClient.get<SpringResumeDto[]>('/resumes/my');
        return res.map(toResumeDocument);
      },
      () => INITIAL_PROFILE.resumes
    );
  },

  async uploadResume(file: File): Promise<ResumeDocument> {
    return withMockFallback(
      async () => {
        const formData = new FormData();
        formData.append('file', file);
        const dto = await apiClient.upload<SpringResumeDto>('/resumes/upload', formData);
        return toResumeDocument(dto);
      },
      () => {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        return {
          id: `res-${Date.now()}`,
          fileName: file.name,
          fileSize: `${Number(sizeMb) > 0 ? sizeMb : '0.4'} MB`,
          uploadedAt: 'Uploaded just now',
          isDefault: false,
          label: 'Tailored CV',
          atsScore: 92,
          atsSummary: 'Indexed and ready for instant 1-click applications',
        };
      }
    );
  },

  async downloadResume(resumeId: string, fileName: string): Promise<void> {
    if (IS_MOCK_MODE) {
      const blob = new Blob([`JobConnect Preview Resume: ${fileName}`], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    try {
      const response = await axiosInstance.get<Blob>(
        `/resumes/${encodeURIComponent(resumeId)}/download`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async setDefaultResume(resumeId: string): Promise<void> {
    return withMockFallback(
      () => apiClient.patch<void>(`/resumes/${encodeURIComponent(resumeId)}/default`),
      () => undefined
    );
  },

  async deleteResume(resumeId: string): Promise<void> {
    return withMockFallback(
      () => apiClient.delete<void>(`/resumes/${encodeURIComponent(resumeId)}`),
      () => undefined
    );
  },
};
