# Database Schema

## SQLite Schema Design

### 1. Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Preferences
  preferred_locations TEXT, -- JSON array
  preferred_salary_min INTEGER,
  preferred_salary_max INTEGER,
  preferred_job_types TEXT, -- JSON array: ['full-time', 'contract', 'remote']
  notification_enabled BOOLEAN DEFAULT 1,
  notification_threshold REAL DEFAULT 0.70, -- Only notify if match > 70%
  
  -- Privacy
  data_encryption_enabled BOOLEAN DEFAULT 1,
  encryption_salt TEXT,
  
  -- Metadata
  total_applications INTEGER DEFAULT 0,
  last_active DATETIME
);
```

### 2. Resumes Table
```sql
CREATE TABLE resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL, -- "Software Engineer Resume v3"
  is_primary BOOLEAN DEFAULT 0, -- Primary resume
  
  -- Content (encrypted)
  full_text TEXT NOT NULL, -- Raw resume text
  full_text_encrypted BLOB, -- Encrypted version
  
  -- Structured Data
  contact_info TEXT, -- JSON: {email, phone, linkedin, github, website}
  summary TEXT,
  
  -- Experience
  work_experience TEXT, -- JSON array of work history
  education TEXT, -- JSON array
  certifications TEXT, -- JSON array
  
  -- Skills
  hard_skills TEXT, -- JSON array
  soft_skills TEXT, -- JSON array
  tools_technologies TEXT, -- JSON array
  
  -- Embeddings (for matching)
  embedding_vector BLOB, -- Serialized float array
  embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',
  
  -- Metadata
  years_of_experience REAL,
  current_title TEXT,
  target_titles TEXT, -- JSON array
  industries TEXT, -- JSON array
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_resumes_user ON resumes(user_id);
CREATE INDEX idx_resumes_primary ON resumes(is_primary);
```

### 3. Jobs Table
```sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Source
  job_url TEXT UNIQUE NOT NULL,
  platform TEXT, -- 'linkedin', 'indeed', 'glassdoor', 'custom'
  platform_job_id TEXT,
  
  -- Basic Info
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  location TEXT,
  location_type TEXT, -- 'remote', 'hybrid', 'onsite'
  
  -- Compensation
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  salary_period TEXT, -- 'hourly', 'annual'
  
  -- Job Details
  description TEXT, -- Full job description
  description_encrypted BLOB,
  
  -- Requirements
  required_skills TEXT, -- JSON array
  preferred_skills TEXT, -- JSON array
  required_experience_years REAL,
  education_level TEXT, -- 'bachelors', 'masters', 'phd', 'none'
  
  -- Extracted Data
  soft_skills TEXT, -- JSON array
  benefits TEXT, -- JSON array
  
  -- Embeddings
  title_embedding BLOB,
  description_embedding BLOB,
  requirements_embedding BLOB,
  
  -- Metadata
  posted_date DATETIME,
  expires_date DATETIME,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_viewed DATETIME,
  is_saved BOOLEAN DEFAULT 0,
  is_archived BOOLEAN DEFAULT 0,
  
  -- Tags & Notes
  tags TEXT, -- JSON array: ['urgent', 'dream-job', 'backup']
  user_notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_url ON jobs(job_url);
CREATE INDEX idx_jobs_company ON jobs(company_name);
CREATE INDEX idx_jobs_saved ON jobs(is_saved);
CREATE INDEX idx_jobs_detected ON jobs(detected_at DESC);
CREATE UNIQUE INDEX idx_jobs_platform_id ON jobs(platform, platform_job_id);
```

### 4. Job Matches Table
```sql
CREATE TABLE job_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  resume_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  -- Overall Score
  overall_score REAL NOT NULL, -- 0.0 to 1.0
  
  -- Component Scores
  hard_skills_score REAL,
  soft_skills_score REAL,
  experience_score REAL,
  title_alignment_score REAL,
  industry_alignment_score REAL,
  
  -- Skill Matching
  matched_required_skills TEXT, -- JSON array
  missing_required_skills TEXT, -- JSON array
  matched_preferred_skills TEXT, -- JSON array
  missing_preferred_skills TEXT, -- JSON array
  
  -- Insights
  top_strengths TEXT, -- JSON array of top 3 matched areas
  top_gaps TEXT, -- JSON array of top 3 gaps
  estimated_interview_probability REAL, -- 0.0 to 1.0
  
  -- Salary Analysis
  salary_delta INTEGER, -- Difference from user's target
  salary_percentile REAL, -- User's position vs market
  
  -- Recommendations
  optimization_suggestions TEXT, -- JSON array
  
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE(job_id, resume_id)
);

CREATE INDEX idx_matches_job ON job_matches(job_id);
CREATE INDEX idx_matches_resume ON job_matches(resume_id);
CREATE INDEX idx_matches_score ON job_matches(overall_score DESC);
```

### 5. Applications Table
```sql
CREATE TABLE applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  resume_id INTEGER NOT NULL,
  
  -- Application Status
  status TEXT DEFAULT 'applied', -- 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'
  
  -- Documents Used
  resume_version_snapshot TEXT, -- JSON snapshot of resume used
  cover_letter_text TEXT,
  cover_letter_encrypted BLOB,
  
  -- Application Method
  application_method TEXT, -- 'platform', 'email', 'company_website', 'referral'
  applied_via_url TEXT,
  
  -- Timeline
  applied_date DATETIME NOT NULL,
  last_contact_date DATETIME,
  expected_response_date DATETIME,
  
  -- Follow-ups
  follow_up_count INTEGER DEFAULT 0,
  next_follow_up_date DATETIME,
  follow_up_notes TEXT,
  
  -- Interview Tracking
  interview_stages TEXT, -- JSON array: [{stage: 'phone', date: '...', notes: '...'}]
  
  -- Documents
  exported_resume_path TEXT, -- Path to generated PDF/DOCX
  exported_cover_letter_path TEXT,
  
  -- Outcome
  offer_amount INTEGER,
  offer_received_date DATETIME,
  offer_deadline DATETIME,
  offer_accepted BOOLEAN,
  rejection_reason TEXT,
  
  -- Notes
  recruiter_name TEXT,
  recruiter_email TEXT,
  recruiter_phone TEXT,
  user_notes TEXT,
  
  -- Metadata
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
```

### 6. Cover Letters Table
```sql
CREATE TABLE cover_letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER,
  job_id INTEGER NOT NULL,
  resume_id INTEGER NOT NULL,
  
  -- Content
  content TEXT NOT NULL,
  content_encrypted BLOB,
  
  -- Generation Params
  tone TEXT, -- 'professional', 'enthusiastic', 'conversational', 'formal'
  template_used TEXT,
  llm_provider TEXT, -- 'openai', 'anthropic', 'local', 'manual'
  llm_model TEXT, -- 'gpt-4', 'claude-3', etc.
  
  -- Company Research
  company_research_notes TEXT,
  custom_intro TEXT,
  
  -- Metadata
  word_count INTEGER,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_edited DATETIME,
  
  -- Export
  exported_to_pdf BOOLEAN DEFAULT 0,
  exported_to_docx BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

CREATE INDEX idx_cover_letters_application ON cover_letters(application_id);
CREATE INDEX idx_cover_letters_job ON cover_letters(job_id);
```

### 7. Skills Table (Master List)
```sql
CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT, -- 'programming_language', 'framework', 'tool', 'soft_skill', 'domain'
  aliases TEXT, -- JSON array of alternative names
  
  -- Popularity (for ranking)
  usage_count INTEGER DEFAULT 0, -- How many jobs mention this
  user_proficiency REAL, -- User's self-rated skill level (0-10)
  
  -- Embeddings
  embedding BLOB,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);
```

### 8. Job Alerts Table
```sql
CREATE TABLE job_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  -- Alert Criteria
  alert_name TEXT NOT NULL,
  keywords TEXT, -- JSON array
  required_skills TEXT, -- JSON array
  locations TEXT, -- JSON array
  remote_only BOOLEAN DEFAULT 0,
  
  salary_min INTEGER,
  job_types TEXT, -- JSON array: ['full-time', 'contract']
  
  -- Matching Threshold
  min_match_score REAL DEFAULT 0.75,
  
  -- Notification
  notification_enabled BOOLEAN DEFAULT 1,
  notification_frequency TEXT DEFAULT 'instant', -- 'instant', 'daily', 'weekly'
  last_notification_sent DATETIME,
  
  -- Status
  is_active BOOLEAN DEFAULT 1,
  matched_jobs_count INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_alerts_user ON job_alerts(user_id);
CREATE INDEX idx_alerts_active ON job_alerts(is_active);
```

### 9. Notifications Table
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  -- Notification Type
  type TEXT NOT NULL, -- 'job_match', 'follow_up_reminder', 'interview_reminder', 'offer_deadline'
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related Entities
  job_id INTEGER,
  application_id INTEGER,
  alert_id INTEGER,
  
  -- Status
  is_read BOOLEAN DEFAULT 0,
  is_dismissed BOOLEAN DEFAULT 0,
  
  -- Action
  action_url TEXT, -- Deep link to relevant screen
  action_label TEXT, -- "View Job", "Update Application"
  
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
```

### 10. Settings Table
```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT, -- JSON value
  
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, key)
);

CREATE INDEX idx_settings_user_key ON settings(user_id, key);
```

### 11. Audit Log Table (Privacy & Security)
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  
  -- Event
  event_type TEXT NOT NULL, -- 'resume_created', 'job_detected', 'application_submitted', 'data_exported'
  entity_type TEXT, -- 'resume', 'job', 'application'
  entity_id INTEGER,
  
  -- Details
  action TEXT NOT NULL, -- 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'
  details TEXT, -- JSON with event-specific data
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
```

---

## Data Relationships

```
users (1) ----< (∞) resumes
users (1) ----< (∞) applications
users (1) ----< (∞) job_alerts
users (1) ----< (∞) notifications

jobs (1) ----< (∞) job_matches
jobs (1) ----< (∞) applications

resumes (1) ----< (∞) job_matches
resumes (1) ----< (∞) applications
resumes (1) ----< (∞) cover_letters

applications (1) ----< (∞) cover_letters

job_alerts (1) ----< (∞) notifications
```

---

## Sample Queries

### 1. Get Top Matching Jobs for User
```sql
SELECT 
  j.*,
  jm.overall_score,
  jm.matched_required_skills,
  jm.missing_required_skills
FROM jobs j
INNER JOIN job_matches jm ON j.id = jm.job_id
WHERE jm.user_id = ?
  AND j.is_archived = 0
  AND jm.overall_score >= 0.70
ORDER BY jm.overall_score DESC
LIMIT 20;
```

### 2. Get Application Pipeline Stats
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(jm.overall_score) as avg_match_score
FROM applications a
INNER JOIN job_matches jm ON a.job_id = jm.job_id
WHERE a.user_id = ?
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'offer' THEN 1
    WHEN 'interview' THEN 2
    WHEN 'screening' THEN 3
    WHEN 'applied' THEN 4
    WHEN 'rejected' THEN 5
    WHEN 'withdrawn' THEN 6
  END;
```

### 3. Find Jobs Matching Alert Criteria
```sql
SELECT DISTINCT j.*
FROM jobs j
INNER JOIN job_matches jm ON j.id = jm.job_id
WHERE jm.user_id = ?
  AND jm.overall_score >= ?
  AND j.salary_min >= ?
  AND (j.location IN (?) OR j.location_type = 'remote')
  AND j.detected_at > datetime('now', '-7 days')
ORDER BY jm.overall_score DESC;
```

### 4. Get Upcoming Follow-ups
```sql
SELECT 
  a.*,
  j.title,
  j.company_name,
  j.job_url
FROM applications a
INNER JOIN jobs j ON a.job_id = j.id
WHERE a.user_id = ?
  AND a.next_follow_up_date IS NOT NULL
  AND a.next_follow_up_date <= datetime('now', '+3 days')
  AND a.status IN ('applied', 'screening', 'interview')
ORDER BY a.next_follow_up_date ASC;
```

---

## Migration Strategy

### Initial Setup
```sql
-- migrations/001_initial_schema.sql
PRAGMA foreign_keys = ON;

-- Create all tables in order
-- (Include all CREATE TABLE statements above)

-- Insert default user
INSERT INTO users (username, email) 
VALUES ('default_user', NULL);
```

### Version Management
```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version) VALUES (1);
```

---

## Backup Strategy

### Auto-Backup
- Daily backup to `~/Documents/JobSearchTool/backups/`
- Keep last 7 daily backups
- Keep last 4 weekly backups
- Keep last 3 monthly backups

### Manual Export
- User can export all data to JSON
- GDPR-compliant data export
- Encrypted backup option

```sql
-- Vacuum and optimize weekly
VACUUM;
ANALYZE;
```
