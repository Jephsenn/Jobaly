"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_MATCH_SCORE_THRESHOLD = exports.MIN_MATCH_SCORE_THRESHOLD = exports.MAX_COVER_LETTER_LENGTH = exports.MIN_COVER_LETTER_LENGTH = exports.MAX_RESUME_LENGTH = exports.MIN_RESUME_LENGTH = exports.DATABASE_VACUUM_INTERVAL = exports.EMBEDDING_CACHE_SIZE = exports.MAX_CONCURRENT_EMBEDDINGS = exports.WIDGET_MARGIN = exports.WIDGET_HEIGHT = exports.WIDGET_WIDTH = exports.LOG_MAX_FILES = exports.LOG_MAX_SIZE = exports.LOG_LEVEL = exports.LOGS_DIR = exports.EXPORTS_DIR = exports.BACKUPS_DIR = exports.DATABASE_PATH = exports.APP_DATA_DIR = exports.USER_DATA_DIR = exports.HOURS_PER_YEAR = exports.JOB_PLATFORMS = exports.PLATFORM_PATTERNS = exports.WINDOW_POLL_INTERVAL = exports.CLIPBOARD_POLL_INTERVAL = exports.EMBEDDING_DIMENSIONS = exports.EMBEDDING_MODEL = exports.SKILL_MATCH_WEIGHTS = exports.MATCH_WEIGHTS = exports.COVER_LETTER_TONES = exports.NOTIFICATION_TYPES = exports.JOB_STATUS = exports.SUPPORTED_PLATFORMS = exports.ENCRYPTION_ALGORITHM = exports.DATABASE_NAME = exports.APP_VERSION = exports.APP_NAME = void 0;
exports.APP_NAME = 'Job Search Assistant';
exports.APP_VERSION = '0.1.0';
exports.DATABASE_NAME = 'job_search.db';
exports.ENCRYPTION_ALGORITHM = 'aes-256-gcm';
exports.SUPPORTED_PLATFORMS = [
    'linkedin',
    'indeed',
    'glassdoor',
    'dice',
    'monster',
    'ziprecruiter',
    'custom'
];
exports.JOB_STATUS = [
    'applied',
    'screening',
    'interview',
    'offer',
    'rejected',
    'withdrawn'
];
exports.NOTIFICATION_TYPES = [
    'job_match',
    'follow_up_reminder',
    'interview_reminder',
    'offer_deadline'
];
exports.COVER_LETTER_TONES = [
    'professional',
    'enthusiastic',
    'conversational',
    'formal'
];
// Matching weights
exports.MATCH_WEIGHTS = {
    hardSkills: 0.40,
    softSkills: 0.20,
    experience: 0.20,
    titleAlignment: 0.10,
    industryAlignment: 0.10,
};
exports.SKILL_MATCH_WEIGHTS = {
    required: 0.70,
    preferred: 0.30,
};
// Embedding model configuration
exports.EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
exports.EMBEDDING_DIMENSIONS = 384;
// Job detection configuration
exports.CLIPBOARD_POLL_INTERVAL = 1000; // 1 second
exports.WINDOW_POLL_INTERVAL = 2000; // 2 seconds
// Platform URL patterns
exports.PLATFORM_PATTERNS = {
    linkedin: /linkedin\.com\/jobs\/view\/(\d+)/,
    indeed: /indeed\.com\/viewjob\?jk=([a-z0-9]+)/i,
    glassdoor: /glassdoor\.com\/job-listing\/.*-JV_IC\d+_KO\d+,\d+\.htm/,
    dice: /dice\.com\/jobs\/detail\/([a-z0-9-]+)/i,
};
// Job platform URL detection patterns
exports.JOB_PLATFORMS = {
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
exports.HOURS_PER_YEAR = 2080; // 40 hours/week * 52 weeks
// File paths
exports.USER_DATA_DIR = process.env.APPDATA ||
    (process.platform === 'darwin'
        ? process.env.HOME + '/Library/Application Support'
        : process.env.HOME + '/.local/share');
exports.APP_DATA_DIR = `${exports.USER_DATA_DIR}/JobSearchAssistant`;
exports.DATABASE_PATH = `${exports.APP_DATA_DIR}/${exports.DATABASE_NAME}`;
exports.BACKUPS_DIR = `${exports.APP_DATA_DIR}/backups`;
exports.EXPORTS_DIR = `${exports.APP_DATA_DIR}/exports`;
exports.LOGS_DIR = `${exports.APP_DATA_DIR}/logs`;
// Logging configuration
exports.LOG_LEVEL = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
exports.LOG_MAX_SIZE = 10 * 1024 * 1024; // 10MB
exports.LOG_MAX_FILES = 5;
// UI Configuration
exports.WIDGET_WIDTH = 400;
exports.WIDGET_HEIGHT = 300;
exports.WIDGET_MARGIN = 20;
// Performance
exports.MAX_CONCURRENT_EMBEDDINGS = 5;
exports.EMBEDDING_CACHE_SIZE = 1000;
exports.DATABASE_VACUUM_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
// Validation
exports.MIN_RESUME_LENGTH = 100;
exports.MAX_RESUME_LENGTH = 50000;
exports.MIN_COVER_LETTER_LENGTH = 200;
exports.MAX_COVER_LETTER_LENGTH = 600;
exports.MIN_MATCH_SCORE_THRESHOLD = 0.0;
exports.MAX_MATCH_SCORE_THRESHOLD = 1.0;
//# sourceMappingURL=constants.js.map