-- Initial schema migration
-- Version: 001
-- Description: Create core tables for job search assistant

PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  preferred_locations TEXT,
  preferred_salary_min INTEGER,
  preferred_salary_max INTEGER,
  preferred_job_types TEXT,
  notification_enabled BOOLEAN DEFAULT 1,
  notification_threshold REAL DEFAULT 0.70,
  
  data_encryption_enabled BOOLEAN DEFAULT 1,
  encryption_salt TEXT,
  
  total_applications INTEGER DEFAULT 0,
  last_active DATETIME
);

-- Resumes Table
CREATE TABLE resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT 0,
  
  full_text TEXT NOT NULL,
  full_text_encrypted BLOB,
  
  contact_info TEXT,
  summary TEXT,
  work_experience TEXT,
  education TEXT,
  certifications TEXT,
  
  hard_skills TEXT,
  soft_skills TEXT,
  tools_technologies TEXT,
  
  embedding_vector BLOB,
  embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',
  
  years_of_experience REAL,
  current_title TEXT,
  target_titles TEXT,
  industries TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_resumes_user ON resumes(user_id);
CREATE INDEX idx_resumes_primary ON resumes(is_primary);

-- Jobs Table
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  job_url TEXT UNIQUE NOT NULL,
  platform TEXT,
  platform_job_id TEXT,
  
  title TEXT,  -- Changed to allow NULL
  company_name TEXT,  -- Changed to allow NULL
  company_logo_url TEXT,
  location TEXT,
  location_type TEXT,
  
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  salary_period TEXT,
  
  description TEXT,
  description_encrypted BLOB,
  
  required_skills TEXT,
  preferred_skills TEXT,
  required_experience_years REAL,
  education_level TEXT,
  
  soft_skills TEXT,
  benefits TEXT,
  
  title_embedding BLOB,
  description_embedding BLOB,
  requirements_embedding BLOB,
  
  posted_date DATETIME,
  expires_date DATETIME,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_viewed DATETIME,
  is_saved BOOLEAN DEFAULT 0,
  is_archived BOOLEAN DEFAULT 0,
  
  tags TEXT,
  user_notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_url ON jobs(job_url);
CREATE INDEX idx_jobs_company ON jobs(company_name);
CREATE INDEX idx_jobs_saved ON jobs(is_saved);
CREATE INDEX idx_jobs_detected ON jobs(detected_at DESC);
CREATE UNIQUE INDEX idx_jobs_platform_id ON jobs(platform, platform_job_id);

-- Job Matches Table
CREATE TABLE job_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  resume_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  overall_score REAL NOT NULL,
  hard_skills_score REAL,
  soft_skills_score REAL,
  experience_score REAL,
  title_alignment_score REAL,
  industry_alignment_score REAL,
  
  matched_required_skills TEXT,
  missing_required_skills TEXT,
  matched_preferred_skills TEXT,
  missing_preferred_skills TEXT,
  
  top_strengths TEXT,
  top_gaps TEXT,
  estimated_interview_probability REAL,
  
  salary_delta INTEGER,
  salary_percentile REAL,
  
  optimization_suggestions TEXT,
  
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE(job_id, resume_id)
);

CREATE INDEX idx_matches_job ON job_matches(job_id);
CREATE INDEX idx_matches_resume ON job_matches(resume_id);
CREATE INDEX idx_matches_score ON job_matches(overall_score DESC);

-- Applications Table
CREATE TABLE applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  resume_id INTEGER NOT NULL,
  
  status TEXT DEFAULT 'applied',
  
  resume_version_snapshot TEXT,
  cover_letter_text TEXT,
  cover_letter_encrypted BLOB,
  
  application_method TEXT,
  applied_via_url TEXT,
  
  applied_date DATETIME NOT NULL,
  last_contact_date DATETIME,
  expected_response_date DATETIME,
  
  follow_up_count INTEGER DEFAULT 0,
  next_follow_up_date DATETIME,
  follow_up_notes TEXT,
  
  interview_stages TEXT,
  
  exported_resume_path TEXT,
  exported_cover_letter_path TEXT,
  
  offer_amount INTEGER,
  offer_received_date DATETIME,
  offer_deadline DATETIME,
  offer_accepted BOOLEAN,
  rejection_reason TEXT,
  
  recruiter_name TEXT,
  recruiter_email TEXT,
  recruiter_phone TEXT,
  user_notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_date ON applications(applied_date DESC);

-- Cover Letters Table
CREATE TABLE cover_letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER,
  job_id INTEGER NOT NULL,
  resume_id INTEGER NOT NULL,
  
  content TEXT NOT NULL,
  content_encrypted BLOB,
  
  tone TEXT,
  template_used TEXT,
  llm_provider TEXT,
  llm_model TEXT,
  
  company_research_notes TEXT,
  custom_intro TEXT,
  
  word_count INTEGER,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_edited DATETIME,
  
  exported_to_pdf BOOLEAN DEFAULT 0,
  exported_to_docx BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

CREATE INDEX idx_cover_letters_application ON cover_letters(application_id);
CREATE INDEX idx_cover_letters_job ON cover_letters(job_id);

-- Skills Table
CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  aliases TEXT,
  
  usage_count INTEGER DEFAULT 0,
  user_proficiency REAL,
  
  embedding BLOB,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);

-- Job Alerts Table
CREATE TABLE job_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  alert_name TEXT NOT NULL,
  keywords TEXT,
  required_skills TEXT,
  locations TEXT,
  remote_only BOOLEAN DEFAULT 0,
  
  salary_min INTEGER,
  job_types TEXT,
  
  min_match_score REAL DEFAULT 0.75,
  
  notification_enabled BOOLEAN DEFAULT 1,
  notification_frequency TEXT DEFAULT 'instant',
  last_notification_sent DATETIME,
  
  is_active BOOLEAN DEFAULT 1,
  matched_jobs_count INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_alerts_user ON job_alerts(user_id);
CREATE INDEX idx_alerts_active ON job_alerts(is_active);

-- Notifications Table
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  job_id INTEGER,
  application_id INTEGER,
  alert_id INTEGER,
  
  is_read BOOLEAN DEFAULT 0,
  is_dismissed BOOLEAN DEFAULT 0,
  
  action_url TEXT,
  action_label TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (alert_id) REFERENCES job_alerts(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Settings Table
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, key)
);

CREATE INDEX idx_settings_user_key ON settings(user_id, key);

-- Audit Log Table
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  
  action TEXT NOT NULL,
  details TEXT,
  
  ip_address TEXT,
  user_agent TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- Insert default user
INSERT INTO users (username, email) VALUES ('default_user', NULL);
