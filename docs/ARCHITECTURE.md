# Job Search Assistant - System Architecture

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Floating   │  │   Dashboard  │  │   System Tray        │  │
│  │   Widget     │  │   (Main UI)  │  │   Controller         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Resume     │  │   Cover      │  │   Application        │  │
│  │   Editor     │  │   Letter Gen │  │   Tracker            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ELECTRON MAIN PROCESS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              IPC Communication Bridge                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Job        │  │   Matching   │  │   Resume             │  │
│  │   Detector   │  │   Engine     │  │   Optimizer          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Cover      │  │   Embedding  │  │   Notification       │  │
│  │   Letter Gen │  │   Service    │  │   Manager            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA ACCESS LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Database   │  │   File       │  │   Encryption         │  │
│  │   Service    │  │   Manager    │  │   Service            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PERSISTENCE LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   SQLite     │  │   Local      │  │   Vector             │  │
│  │   Database   │  │   File Store │  │   Embeddings         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Technology Stack

### Desktop Framework
- **Electron 28+** - Cross-platform desktop app
  - Main Process: Node.js backend
  - Renderer Process: React frontend
  - IPC: Secure bidirectional communication

### Backend
- **Node.js 20+** with TypeScript 5+
- **SQLite3** with better-sqlite3 driver
- **Node-Machine-Id** for device fingerprinting
- **Crypto** (built-in) for AES-256 encryption

### Frontend
- **React 18+** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Hook Form** for forms
- **Zustand** for state management
- **React Query** for data fetching

### AI/ML Components
- **@xenova/transformers** - Local embeddings (all-MiniLM-L6-v2)
- **OpenAI SDK** (optional) - For premium features
- **Anthropic SDK** (optional) - Alternative provider
- **Local LLM** (optional) - Ollama integration

### Job Detection
- **Clipboardy** - Cross-platform clipboard monitoring
- **Active-Win** - Active window detection
- **Tesseract.js** - Optional OCR fallback
- **Screenshot-Desktop** - Screen capture

### Document Generation
- **Docx** - DOCX generation
- **PDFKit** - PDF generation
- **Html-Docx-Js** - HTML to DOCX conversion

### Utilities
- **Zod** - Runtime type validation
- **Date-fns** - Date manipulation
- **Lodash** - Utility functions
- **Winston** - Logging

## 3. Component Architecture

### 3.1 Job Detector Service
```typescript
interface JobDetector {
  startMonitoring(): void;
  stopMonitoring(): void;
  onJobDetected(callback: (job: DetectedJob) => void): void;
  
  // Detection methods
  monitorClipboard(): void;
  monitorActiveWindow(): void;
  captureScreen(): Promise<void>;
}
```

**Detection Strategy:**
1. **Clipboard Monitoring** (Primary)
   - Listen for text copied containing job indicators
   - Parse job URLs (LinkedIn, Indeed, Glassdoor, etc.)
   - Extract job IDs from URLs

2. **Active Window Monitoring** (Secondary)
   - Poll active window title/URL every 2 seconds
   - Detect job platform URLs
   - Extract job details from window metadata

3. **OCR Fallback** (Tertiary - User Initiated)
   - User triggers manual capture
   - OCR extracts visible job details
   - Requires explicit user consent

### 3.2 Job Parser Service
```typescript
interface JobParser {
  parseFromClipboard(text: string): ParsedJob | null;
  parseFromURL(url: string): Promise<ParsedJob | null>;
  extractJobDetails(html: string): ParsedJob;
  normalizeSkills(skills: string[]): string[];
}
```

**Parsing Rules:**
- Pattern matching for common job platforms
- NLP extraction for skills, requirements
- Salary normalization (hourly → annual, ranges)
- Location parsing (remote, hybrid, onsite)

### 3.3 Matching Engine
```typescript
interface MatchingEngine {
  computeMatchScore(resume: Resume, job: Job): MatchResult;
  generateEmbedding(text: string): Promise<number[]>;
  computeCosineSimilarity(vec1: number[], vec2: number[]): number;
  extractSkillsFromText(text: string): Skill[];
}
```

**Matching Algorithm:**
```
TOTAL_SCORE = (
  HARD_SKILLS_SCORE * 0.40 +
  SOFT_SKILLS_SCORE * 0.20 +
  EXPERIENCE_SCORE * 0.20 +
  TITLE_ALIGNMENT * 0.10 +
  INDUSTRY_ALIGNMENT * 0.10
)

HARD_SKILLS_SCORE = (
  matched_required_skills / total_required_skills * 0.70 +
  matched_preferred_skills / total_preferred_skills * 0.30
)

SOFT_SKILLS_SCORE = cosine_similarity(resume_embedding, job_soft_skills_embedding)

EXPERIENCE_SCORE = min(1.0, user_years_experience / required_years_experience)

TITLE_ALIGNMENT = cosine_similarity(current_title_embedding, job_title_embedding)

INDUSTRY_ALIGNMENT = cosine_similarity(resume_industry_keywords, job_industry_keywords)
```

### 3.4 Resume Optimizer
```typescript
interface ResumeOptimizer {
  optimizeForJob(resume: Resume, job: Job): OptimizedResume;
  insertATSKeywords(resume: Resume, keywords: string[]): Resume;
  rewriteAchievements(achievements: string[], job: Job): string[];
  generateSummary(resume: Resume, job: Job): string;
}
```

**Optimization Strategy:**
1. Extract ATS keywords from job description
2. Inject into resume summary (natural language)
3. Reorder experience bullets by relevance
4. Highlight matching skills
5. Adjust job titles for alignment (if truthful)
6. Generate custom summary statement

### 3.5 Cover Letter Generator
```typescript
interface CoverLetterGenerator {
  generate(params: CoverLetterParams): Promise<string>;
  getToneOptions(): ToneOption[];
  getTemplates(): Template[];
}

interface CoverLetterParams {
  resume: Resume;
  job: Job;
  tone: 'professional' | 'enthusiastic' | 'conversational' | 'formal';
  companyResearch?: string;
  customIntro?: string;
}
```

**Generation Prompt Template:**
```
You are writing a cover letter for a job application.

CANDIDATE:
{resume_summary}

JOB:
Title: {job_title}
Company: {company_name}
Requirements: {key_requirements}

TONE: {selected_tone}

INSTRUCTIONS:
- Write a compelling 3-paragraph cover letter
- Paragraph 1: Hook and interest in company
- Paragraph 2: Match specific skills to job requirements
- Paragraph 3: Call to action
- Keep under 300 words
- Use active voice
- Avoid clichés
- Be specific and quantitative where possible

{custom_instructions}
```

## 4. Data Flow

### Job Detection Flow
```
User copies job URL → Clipboard Monitor detects
    ↓
Parse URL for platform/job ID
    ↓
Extract job details (cached or fetch metadata)
    ↓
Store in temporary_jobs table
    ↓
Trigger Matching Engine
    ↓
Display floating widget with match score
    ↓
User can: Ignore | Save Job | Apply Now
```

### Application Flow
```
User clicks "Apply Now"
    ↓
Load job + user's active resume
    ↓
Compute detailed match analysis
    ↓
Show optimization suggestions
    ↓
User approves optimizations
    ↓
Generate optimized resume
    ↓
Generate cover letter (with user preview)
    ↓
Export documents (PDF/DOCX)
    ↓
Save application record
    ↓
Set follow-up reminder
```

## 5. Security Architecture

### Data Encryption
```typescript
interface EncryptionService {
  encrypt(data: string, key: Buffer): string;
  decrypt(data: string, key: Buffer): string;
  generateKey(passphrase?: string): Buffer;
}
```

**Encryption Strategy:**
- AES-256-GCM for all PII
- Device-specific key derivation (machine-id + optional user passphrase)
- Encrypted fields: resume text, cover letters, personal notes
- Database-level encryption for entire DB file (optional)

### Privacy Guarantees
1. **No Network Calls** (except opt-in LLM features)
2. **No Telemetry** or analytics
3. **No Cloud Sync** (local-first)
4. **No Credential Storage** (no LinkedIn/Indeed logins)
5. **Explicit Consent** for all screen captures
6. **Audit Log** of all data access

## 6. Performance Considerations

### Embedding Strategy
- **Local Model**: all-MiniLM-L6-v2 (384 dimensions)
- **Cache Embeddings**: Store in database
- **Lazy Loading**: Compute on-demand
- **Batch Processing**: Vectorize multiple jobs together

### Database Optimization
- **Indexed Fields**: job_url, company_name, application_date
- **Prepared Statements**: All queries
- **Connection Pooling**: Single connection reused
- **Vacuum Schedule**: Weekly database optimization

### UI Performance
- **Virtual Scrolling**: For large job lists
- **Debounced Search**: 300ms delay
- **Lazy Loading**: Load resume versions on-demand
- **Optimistic Updates**: Instant UI feedback

## 7. Error Handling & Logging

```typescript
interface Logger {
  error(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  info(message: string, meta?: object): void;
  debug(message: string, meta?: object): void;
}
```

**Logging Strategy:**
- Winston logger with file rotation
- Separate logs: app.log, error.log
- PII redaction in logs
- Log levels: ERROR, WARN, INFO, DEBUG
- Max 10MB per file, 5 files retention

## 8. Compliance & Legal

### Terms of Service Compliance
✅ **No Scraping**: Only process user-provided data
✅ **No Automation**: No form filling or auto-apply
✅ **No Bot Behavior**: Manual user actions only
✅ **Fair Use**: Clipboard monitoring for productivity
✅ **Data Ownership**: User owns all data

### Privacy Compliance
- GDPR-ready (data export/delete)
- CCPA-ready (local-only storage)
- No cookies or tracking
- Explicit consent for all features
- Privacy policy template included

### License
- MIT or GPLv3 (user choice)
- Open source recommended
- No proprietary job platform APIs used
