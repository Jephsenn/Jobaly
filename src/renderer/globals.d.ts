// Global type declarations for renderer process

/// <reference types="react" />
/// <reference types="react-dom" />

interface Window {
  electronAPI: {
    platform: string;
    versions: {
      node: string;
      chrome: string;
      electron: string;
    };
    jobs: {
      getAll: () => Promise<any[]>;
      getById: (id: number) => Promise<any>;
      updateStatus: (id: number, status: string) => Promise<boolean>;
      markApplied: (id: number) => Promise<boolean>;
      delete: (id: number) => Promise<boolean>;
      onJobAdded: (callback: (job: any) => void) => void;
    };
    resumes: {
      getAll: () => Promise<any[]>;
      save: (resumeData: any) => Promise<any>;
      setPrimary: (id: number) => Promise<boolean>;
      delete: (id: number) => Promise<boolean>;
    };
    matches: {
      getJobMatches: () => Promise<any[]>;
    };
    applications: {
      getAll: () => Promise<any[]>;
      getMaterials: (jobId: number) => Promise<any>;
      updateStatus: (id: number, status: string) => Promise<boolean>;
      addNote: (id: number, note: string) => Promise<boolean>;
      downloadResume: (jobId: number) => Promise<void>;
      downloadCoverLetter: (jobId: number) => Promise<void>;
      regenerateMaterials: (jobId: number) => Promise<boolean>;
    };
    settings: {
      save: (settings: any) => Promise<boolean>;
      get: () => Promise<any>;
    };
  };
}

// Fix for HTMLInputElement files property
interface HTMLInputElement {
  files: FileList | null;
}

// Fix for DataTransfer files property
interface DataTransfer {
  files: FileList;
}

// Global functions
declare function alert(message: string): void;
declare function confirm(message: string): boolean;
