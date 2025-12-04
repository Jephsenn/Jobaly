import type { Job } from './types';

interface Resume {
  id: number;
  name: string;
  is_primary: boolean;
  full_text: string;
  hard_skills: string | null;
  soft_skills: string | null;
  years_of_experience: number | null;
  current_title: string | null;
  created_at: string;
  updated_at: string;
}

interface MatchScore {
  overall: number;
  skills: number;
  experience: number;
  title: number;
  breakdown: {
    matchedSkills: string[];
    missingSkills: string[];
    experienceMatch: boolean;
    titleSimilarity: number;
  };
}

export interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  jobs: {
    getAll: () => Promise<Job[]>;
    getById: (id: number) => Promise<Job | null>;
    updateStatus: (id: number, status: string) => Promise<boolean>;
    markApplied: (id: number) => Promise<boolean>;
    delete: (id: number) => Promise<boolean>;
    onJobAdded: (callback: (job: Job) => void) => void;
  };
  resumes: {
    getAll: () => Promise<Resume[]>;
    save: (resumeData: {
      name: string;
      fileBuffer?: number[];
      fileType?: string;
      full_text?: string;
      is_primary: boolean;
    }) => Promise<{ success: boolean; id?: number; error?: string }>;
    setPrimary: (id: number) => Promise<boolean>;
    delete: (id: number) => Promise<boolean>;
  };
  matches: {
    getJobMatches: () => Promise<Record<number, MatchScore>>;
  };
  applications: {
    getMaterials: (jobId: number) => Promise<{
      tailored_resume: string;
      cover_letter: string;
      status: string;
      applied_date: string | null;
    } | null>;
    downloadResume: (jobId: number) => Promise<{ success: boolean; path?: string }>;
    downloadCoverLetter: (jobId: number) => Promise<{ success: boolean; path?: string }>;
  };
  settings: {
    save: (settings: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      email: string;
      phone: string;
    }) => Promise<{ success: boolean }>;
    get: () => Promise<{
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      email: string;
      phone: string;
    }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
