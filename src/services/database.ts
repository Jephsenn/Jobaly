import Dexie, { Table } from 'dexie';

// Database Models
export interface Job {
  id?: number;
  title: string;
  company_name: string;
  url: string;
  description: string;
  location?: string;
  location_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_period?: string;
  employment_type?: string;
  experience_years?: number;
  education_level?: string;
  required_skills?: string;
  preferred_skills?: string;
  benefits?: string;
  platform: string;
  is_saved: boolean;
  created_at: string;
  has_generated_materials?: boolean; // Flag to indicate if materials have been generated
}

// Generated materials for a job application
export interface GeneratedMaterials {
  id?: number;
  job_id: number;
  enhanced_resume: any; // EnhancedResume object from resumeEnhancer
  generated_at: string;
}

// Resume structure for storing parsed content with formatting
export interface ResumeSection {
  type: 'header' | 'experience' | 'education' | 'skills' | 'summary' | 'certifications' | 'other';
  title?: string;
  content: string;
  items?: ResumeBulletPoint[];
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontFamily?: string;
    alignment?: 'left' | 'center' | 'right';
  };
}

export interface ResumeBulletPoint {
  text: string;
  level: number; // indentation level
  formatting?: {
    bold?: boolean;
    italic?: boolean;
  };
}

export interface WorkExperience {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  bulletPoints: string[];
}

export interface EducationEntry {
  school: string;
  degree: string; // e.g., "Bachelor's", "Master's", "Associate's", "PhD"
  field?: string; // e.g., "Computer Science", "Business Administration"
  graduationDate?: string; // e.g., "May 2023", "2023"
  gpa?: string; // e.g., "3.8", "3.8/4.0"
  location?: string; // e.g., "Boston, MA"
}

export interface Resume {
  id?: number;
  name: string;
  full_text: string;
  is_primary: boolean;
  
  // Original file storage (for template preservation)
  original_file?: string; // base64 encoded original file
  file_type?: string; // 'pdf', 'docx', 'doc', 'txt'
  
  // Parsed structure (for AI enhancement)
  sections?: ResumeSection[];
  work_experiences?: WorkExperience[];
  education_entries?: EducationEntry[];
  
  // Extracted metadata
  hard_skills?: string;
  soft_skills?: string;
  tools_technologies?: string;
  years_of_experience?: number;
  current_title?: string;
  education?: string; // Legacy field for backward compatibility
  certifications?: string;
  work_experience?: string;
  
  // Contact info
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  
  created_at: string;
}

export interface Application {
  id?: number;
  job_id: number;
  resume_id?: number;
  status: string;
  applied_date?: string;
  notes?: string;
  resume_version_snapshot?: string;
  cover_letter_text?: string;
  created_at: string;
}

// Dexie Database Class
export class JobalyDB extends Dexie {
  jobs!: Table<Job, number>;
  resumes!: Table<Resume, number>;
  applications!: Table<Application, number>;
  generated_materials!: Table<GeneratedMaterials, number>;

  constructor() {
    super('JobalyDB');
    
    this.version(1).stores({
      jobs: '++id, title, company_name, platform, is_saved, created_at',
      resumes: '++id, name, is_primary, created_at',
      applications: '++id, job_id, resume_id, status, applied_date, created_at'
    });
    
    // Version 2: Add generated_materials table
    this.version(2).stores({
      jobs: '++id, title, company_name, platform, is_saved, created_at, has_generated_materials',
      resumes: '++id, name, is_primary, created_at',
      applications: '++id, job_id, resume_id, status, applied_date, created_at',
      generated_materials: '++id, job_id, generated_at'
    });
  }
}

// Export singleton instance
export const db = new JobalyDB();

// Helper functions for common operations
export const jobsAPI = {
  async getAll() {
    return await db.jobs.orderBy('created_at').reverse().toArray();
  },

  async getById(id: number) {
    return await db.jobs.get(id);
  },

  async getSaved() {
    return await db.jobs.where('is_saved').equals(1).toArray();
  },

  async add(job: Omit<Job, 'id' | 'created_at'>) {
    return await db.jobs.add({
      ...job,
      created_at: new Date().toISOString()
    });
  },

  async update(id: number, updates: Partial<Job>) {
    return await db.jobs.update(id, updates);
  },

  async delete(id: number) {
    return await db.jobs.delete(id);
  },

  async markSaved(id: number, saved: boolean = true) {
    return await db.jobs.update(id, { is_saved: saved });
  }
};

export const resumesAPI = {
  async getAll() {
    return await db.resumes.orderBy('created_at').reverse().toArray();
  },

  async getById(id: number) {
    return await db.resumes.get(id);
  },

  async getPrimary() {
    const resumes = await db.resumes.toArray();
    return resumes.find(r => r.is_primary === true);
  },

  async add(resume: Omit<Resume, 'id' | 'created_at'>) {
    // If setting as primary, unset others
    if (resume.is_primary) {
      await db.resumes.toCollection().modify({ is_primary: false });
    }
    
    return await db.resumes.add({
      ...resume,
      created_at: new Date().toISOString()
    });
  },

  async update(id: number, updates: Partial<Resume>) {
    // If setting as primary, unset others
    if (updates.is_primary) {
      await db.resumes.toCollection().modify({ is_primary: false });
    }
    
    return await db.resumes.update(id, updates);
  },

  async delete(id: number) {
    return await db.resumes.delete(id);
  }
};

export const applicationsAPI = {
  async getAll() {
    return await db.applications.orderBy('created_at').reverse().toArray();
  },

  async getById(id: number) {
    return await db.applications.get(id);
  },

  async getByJobId(jobId: number) {
    return await db.applications.where('job_id').equals(jobId).toArray();
  },

  async getByStatus(status: string) {
    return await db.applications.where('status').equals(status).toArray();
  },

  async add(application: Omit<Application, 'id' | 'created_at'>) {
    return await db.applications.add({
      ...application,
      created_at: new Date().toISOString()
    });
  },

  async update(id: number, updates: Partial<Application>) {
    return await db.applications.update(id, updates);
  },

  async updateStatus(id: number, status: string) {
    return await db.applications.update(id, { status });
  },

  async addNote(id: number, note: string) {
    const app = await db.applications.get(id);
    const existingNotes = app?.notes || '';
    const timestamp = new Date().toLocaleString();
    const newNote = existingNotes 
      ? `${existingNotes}\n\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`;
    
    return await db.applications.update(id, { notes: newNote });
  },

  async delete(id: number) {
    return await db.applications.delete(id);
  }
};

// Generated Materials API
export const generatedMaterialsAPI = {
  async save(jobId: number, enhancedResume: any) {
    // Check if materials already exist for this job
    const existing = await db.generated_materials
      .where('job_id')
      .equals(jobId)
      .first();
    
    const materials: GeneratedMaterials = {
      job_id: jobId,
      enhanced_resume: enhancedResume,
      generated_at: new Date().toISOString()
    };
    
    if (existing) {
      // Update existing materials
      await db.generated_materials.update(existing.id!, {
        enhanced_resume: enhancedResume,
        generated_at: new Date().toISOString()
      });
      await db.jobs.update(jobId, { has_generated_materials: true });
      return existing.id;
    } else {
      // Create new materials
      const id = await db.generated_materials.add(materials);
      await db.jobs.update(jobId, { has_generated_materials: true });
      return id;
    }
  },

  async getByJobId(jobId: number) {
    return await db.generated_materials
      .where('job_id')
      .equals(jobId)
      .first();
  },

  async delete(jobId: number) {
    const materials = await this.getByJobId(jobId);
    if (materials?.id) {
      await db.generated_materials.delete(materials.id);
      await db.jobs.update(jobId, { has_generated_materials: false });
    }
  },

  async exists(jobId: number): Promise<boolean> {
    const materials = await this.getByJobId(jobId);
    return !!materials;
  }
};

// Export/Import functionality
export const dataAPI = {
  async exportAll() {
    const data = {
      jobs: await db.jobs.toArray(),
      resumes: await db.resumes.toArray(),
      applications: await db.applications.toArray(),
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobaly-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importData(file: File) {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Clear existing data
    await db.jobs.clear();
    await db.resumes.clear();
    await db.applications.clear();
    
    // Import new data
    if (data.jobs?.length) await db.jobs.bulkAdd(data.jobs);
    if (data.resumes?.length) await db.resumes.bulkAdd(data.resumes);
    if (data.applications?.length) await db.applications.bulkAdd(data.applications);
    
    return {
      jobs: data.jobs?.length || 0,
      resumes: data.resumes?.length || 0,
      applications: data.applications?.length || 0
    };
  },

  async clearAll() {
    await db.jobs.clear();
    await db.resumes.clear();
    await db.applications.clear();
  }
};
