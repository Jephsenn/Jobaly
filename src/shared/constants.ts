export const APP_NAME = 'Job Search Assistant';
export const APP_VERSION = '0.1.0';

export const DATABASE_NAME = 'job_search.db';
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export const SUPPORTED_PLATFORMS = [
  'linkedin',
  'indeed',
  'glassdoor',
  'dice',
  'monster',
  'ziprecruiter',
  'custom'
] as const;

export const JOB_STATUS = [
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn'
] as const;

export const NOTIFICATION_TYPES = [
  'job_match',
  'follow_up_reminder',
  'interview_reminder',
  'offer_deadline'
] as const;

export const COVER_LETTER_TONES = [
  'professional',
  'enthusiastic',
  'conversational',
  'formal'
] as const;

// Matching weights
export const MATCH_WEIGHTS = {
  hardSkills: 0.40,
  softSkills: 0.20,
  experience: 0.20,
  titleAlignment: 0.10,
  industryAlignment: 0.10,
} as const;

export const SKILL_MATCH_WEIGHTS = {
  required: 0.70,
  preferred: 0.30,
} as const;

// Embedding model configuration
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBEDDING_DIMENSIONS = 384;

// Job detection configuration
export const CLIPBOARD_POLL_INTERVAL = 1000; // 1 second
export const WINDOW_POLL_INTERVAL = 2000; // 2 seconds

// Platform URL patterns
export const PLATFORM_PATTERNS = {
  linkedin: /linkedin\.com\/jobs\/view\/(\d+)/,
  indeed: /indeed\.com\/viewjob\?jk=([a-z0-9]+)/i,
  glassdoor: /glassdoor\.com\/job-listing\/.*-JV_IC\d+_KO\d+,\d+\.htm/,
  dice: /dice\.com\/jobs\/detail\/([a-z0-9-]+)/i,
} as const;

// Job platform URL detection patterns
export const JOB_PLATFORMS: Record<string, string[]> = {
  LinkedIn: ['linkedin.com/jobs', 'linkedin.com/job'],
  Indeed: ['indeed.com/viewjob', 'indeed.com/rc/clk', 'indeed.com/m/jobs'],
  Glassdoor: ['glassdoor.com/job-listing', 'glassdoor.com/partner/jobListing'],
  Dice: ['dice.com/jobs', 'dice.com/job-detail'],
  Monster: ['monster.com/job-openings', 'monster.com/jobs'],
  ZipRecruiter: ['ziprecruiter.com/c/', 'ziprecruiter.com/jobs'],
  AngelList: ['angel.co/company', 'wellfound.com/company'],
  Greenhouse: ['greenhouse.io', 'boards.greenhouse.io'],
  Lever: ['jobs.lever.co', 'lever.co'],
};

// Salary normalization
export const HOURS_PER_YEAR = 2080; // 40 hours/week * 52 weeks

// File paths
export const USER_DATA_DIR = process.env.APPDATA || 
  (process.platform === 'darwin' 
    ? process.env.HOME + '/Library/Application Support' 
    : process.env.HOME + '/.local/share');

export const APP_DATA_DIR = `${USER_DATA_DIR}/JobSearchAssistant`;
export const DATABASE_PATH = `${APP_DATA_DIR}/${DATABASE_NAME}`;
export const BACKUPS_DIR = `${APP_DATA_DIR}/backups`;
export const EXPORTS_DIR = `${APP_DATA_DIR}/exports`;
export const LOGS_DIR = `${APP_DATA_DIR}/logs`;

// Logging configuration
export const LOG_LEVEL = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
export const LOG_MAX_SIZE = 10 * 1024 * 1024; // 10MB
export const LOG_MAX_FILES = 5;

// UI Configuration
export const WIDGET_WIDTH = 400;
export const WIDGET_HEIGHT = 300;
export const WIDGET_MARGIN = 20;

// Performance
export const MAX_CONCURRENT_EMBEDDINGS = 5;
export const EMBEDDING_CACHE_SIZE = 1000;
export const DATABASE_VACUUM_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Validation
export const MIN_RESUME_LENGTH = 100;
export const MAX_RESUME_LENGTH = 50000;
export const MIN_COVER_LETTER_LENGTH = 200;
export const MAX_COVER_LETTER_LENGTH = 600;
export const MIN_MATCH_SCORE_THRESHOLD = 0.0;
export const MAX_MATCH_SCORE_THRESHOLD = 1.0;
