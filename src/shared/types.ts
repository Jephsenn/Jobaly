// Shared types used across main and renderer processes

export interface User {
  id: number;
  username: string;
  email?: string;
  preferredLocations: string[];
  preferredSalaryMin?: number;
  preferredSalaryMax?: number;
  preferredJobTypes: string[];
  notificationEnabled: boolean;
  notificationThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Resume {
  id: number;
  userId: number;
  name: string;
  isPrimary: boolean;
  fullText: string;
  contactInfo: ContactInfo;
  summary: string;
  workExperience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  hardSkills: string[];
  softSkills: string[];
  toolsTechnologies: string[];
  embeddingVector?: number[];
  yearsOfExperience: number;
  currentTitle: string;
  targetTitles: string[];
  industries: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactInfo {
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  location?: string;
}

export interface WorkExperience {
  title: string;
  company: string;
  startDate: Date;
  endDate: Date | null;
  description: string;
  achievements: string[];
  skills: string[];
}

export interface Education {
  degree: string;
  institution: string;
  field: string;
  startDate: Date;
  endDate: Date | null;
  gpa?: number;
  honors?: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
}

export interface Job {
  id?: number;
  url: string;
  platform: string;
  externalId?: string;
  title?: string;
  company?: string;
  companyLogoUrl?: string;
  location?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: 'hourly' | 'annual';
  description?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  requiredExperienceYears?: number;
  educationLevel?: 'none' | 'bachelors' | 'masters' | 'phd';
  softSkills?: string[];
  benefits?: string[];
  postedDate?: Date;
  expiresDate?: Date;
  detectedAt: Date;
  status: 'detected' | 'saved' | 'dismissed' | 'applied' | 'interviewing' | 'rejected' | 'offer';
  lastViewed?: Date;
  isSaved: boolean;
  isArchived: boolean;
  tags: string[];
  userNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchScore {
  overall: number;
  hardSkills: number;
  softSkills: number;
  experience: number;
  titleAlignment: number;
  industryAlignment: number;
}

export interface JobMatch {
  id: number;
  jobId: number;
  resumeId: number;
  userId: number;
  overallScore: number;
  hardSkillsScore: number;
  softSkillsScore: number;
  experienceScore: number;
  titleAlignmentScore: number;
  industryAlignmentScore: number;
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  topStrengths: string[];
  topGaps: string[];
  estimatedInterviewProbability: number;
  salaryDelta?: number;
  salaryPercentile?: number;
  optimizationSuggestions: OptimizationSuggestion[];
  computedAt: Date;
}

export interface OptimizationSuggestion {
  type: 'add_skill' | 'highlight_experience' | 'adjust_summary' | 'add_certification';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: number;
}

export interface Application {
  id: number;
  userId: number;
  jobId: number;
  resumeId: number;
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  resumeVersionSnapshot: Resume;
  coverLetterText: string;
  applicationMethod: 'platform' | 'email' | 'company_website' | 'referral';
  appliedViaUrl?: string;
  appliedDate: Date;
  lastContactDate?: Date;
  expectedResponseDate?: Date;
  followUpCount: number;
  nextFollowUpDate?: Date;
  followUpNotes?: string;
  interviewStages: InterviewStage[];
  exportedResumePath?: string;
  exportedCoverLetterPath?: string;
  offerAmount?: number;
  offerReceivedDate?: Date;
  offerDeadline?: Date;
  offerAccepted?: boolean;
  rejectionReason?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterPhone?: string;
  userNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewStage {
  stage: string;
  date: Date;
  notes?: string;
  interviewers?: string[];
  outcome?: 'pending' | 'passed' | 'failed';
}

export interface CoverLetter {
  id: number;
  applicationId?: number;
  jobId: number;
  resumeId: number;
  content: string;
  tone: 'professional' | 'enthusiastic' | 'conversational' | 'formal';
  templateUsed?: string;
  llmProvider?: string;
  llmModel?: string;
  companyResearchNotes?: string;
  customIntro?: string;
  wordCount: number;
  generatedAt: Date;
  lastEdited?: Date;
  exportedToPdf: boolean;
  exportedToDocx: boolean;
}

export interface JobAlert {
  id: number;
  userId: number;
  alertName: string;
  keywords: string[];
  requiredSkills: string[];
  locations: string[];
  remoteOnly: boolean;
  salaryMin?: number;
  jobTypes: string[];
  minMatchScore: number;
  notificationEnabled: boolean;
  notificationFrequency: 'instant' | 'daily' | 'weekly';
  lastNotificationSent?: Date;
  isActive: boolean;
  matchedJobsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: number;
  userId: number;
  type: 'job_match' | 'follow_up_reminder' | 'interview_reminder' | 'offer_deadline';
  title: string;
  message: string;
  jobId?: number;
  applicationId?: number;
  alertId?: number;
  isRead: boolean;
  isDismissed: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: Date;
  readAt?: Date;
}

export interface DetectedJob {
  url: string;
  platform: string;
  platformJobId?: string;
  detectedFrom: 'clipboard' | 'window' | 'ocr';
  timestamp: Date;
}

export interface CoverLetterContext {
  candidateName: string;
  candidateTitle: string;
  candidateSummary: string;
  relevantExperience: WorkExperience[];
  topSkills: string[];
  achievements: string[];
  jobTitle: string;
  companyName: string;
  companyIndustry?: string;
  jobRequirements: string[];
  jobDescription: string;
  tone: 'professional' | 'enthusiastic' | 'conversational' | 'formal';
  companyResearch?: string;
  customIntro?: string;
  includeCallToAction: boolean;
}

export interface IPCChannels {
  // Job Detection
  'job:detected': (job: DetectedJob) => void;
  'job:parse': (url: string) => Promise<Job | null>;
  'job:save': (job: Job) => Promise<Job>;
  'job:get': (id: number) => Promise<Job | null>;
  'job:list': (filters?: JobFilters) => Promise<Job[]>;
  'job:archive': (id: number) => Promise<void>;
  
  // Matching
  'match:compute': (jobId: number, resumeId: number) => Promise<JobMatch>;
  'match:get': (jobId: number, resumeId: number) => Promise<JobMatch | null>;
  
  // Resume
  'resume:create': (resume: Partial<Resume>) => Promise<Resume>;
  'resume:update': (id: number, resume: Partial<Resume>) => Promise<Resume>;
  'resume:get': (id: number) => Promise<Resume | null>;
  'resume:list': () => Promise<Resume[]>;
  'resume:delete': (id: number) => Promise<void>;
  'resume:optimize': (resumeId: number, jobId: number) => Promise<Resume>;
  
  // Cover Letter
  'coverletter:generate': (context: CoverLetterContext) => Promise<string>;
  'coverletter:save': (coverLetter: Partial<CoverLetter>) => Promise<CoverLetter>;
  'coverletter:export': (id: number, format: 'pdf' | 'docx') => Promise<string>;
  
  // Application
  'application:create': (application: Partial<Application>) => Promise<Application>;
  'application:update': (id: number, application: Partial<Application>) => Promise<Application>;
  'application:list': (filters?: ApplicationFilters) => Promise<Application[]>;
  'application:stats': () => Promise<ApplicationStats>;
  
  // Notifications
  'notification:list': () => Promise<Notification[]>;
  'notification:markRead': (id: number) => Promise<void>;
  'notification:dismiss': (id: number) => Promise<void>;
  
  // Settings
  'settings:get': (key: string) => Promise<any>;
  'settings:set': (key: string, value: any) => Promise<void>;
  
  // Window Control
  'window:minimize': () => void;
  'window:maximize': () => void;
  'window:close': () => void;
  'window:showWidget': () => void;
  'window:hideWidget': () => void;
}

export interface JobFilters {
  isSaved?: boolean;
  isArchived?: boolean;
  platform?: string;
  minScore?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ApplicationFilters {
  status?: Application['status'];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ApplicationStats {
  total: number;
  byStatus: Record<Application['status'], number>;
  averageMatchScore: number;
  averageResponseTime: number;
  interviewRate: number;
  offerRate: number;
}
