# Quick Start Guide - Phase 1

## Installation Steps

### 1. Clean up and reinstall
```powershell
# Remove node_modules if exists
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Clear npm cache
npm cache clean --force

# Install dependencies (simplified - no native modules!)
npm install
```

### 2. What Changed
- **Removed**: `better-sqlite3` (requires Visual Studio C++ build tools)
- **Added**: `sql.js` (pure JavaScript SQLite, no compilation needed)
- **Removed**: Heavy optional dependencies for Phase 1:
  - `@xenova/transformers` (will add back later for embeddings)
  - `active-win`, `screenshot-desktop`, `tesseract.js` (add when needed)
  - `docx`, `pdfkit` (add in Phase 3)
  - `node-machine-id` (not critical for MVP)

### 3. Run the app
```powershell
# This will start both React dev server and Electron
npm run dev
```

## Phase 1 Simplified Roadmap

### Week 1 (This Week - Fast Track!)

#### ✅ Already Complete
- [x] Project structure
- [x] Database schema design
- [x] TypeScript configs
- [x] Basic UI components

#### 🎯 Day 1-2: Get it Running
- [ ] Fix any remaining install issues
- [ ] Verify Electron launches
- [ ] Verify React app loads
- [ ] Database initializes and migrations run

#### 🎯 Day 3-4: Basic Job Detection
Create `src/main/services/JobDetector.ts`:
```typescript
import clipboardy from 'clipboardy';

export class JobDetector {
  private lastClipboard = '';
  
  start() {
    setInterval(async () => {
      const text = await clipboardy.read();
      if (text !== this.lastClipboard) {
        this.lastClipboard = text;
        if (this.isJobURL(text)) {
          console.log('Job detected:', text);
          // TODO: Parse and save to database
        }
      }
    }, 1000);
  }
  
  isJobURL(text: string): boolean {
    return text.includes('linkedin.com/jobs') || 
           text.includes('indeed.com/viewjob') ||
           text.includes('glassdoor.com/job-listing');
  }
}
```

#### 🎯 Day 5-7: Database Integration
- [ ] Create JobsRepository to insert/query jobs
- [ ] Wire up job detection to database
- [ ] Display detected jobs in React UI
- [ ] Add "Save Job" button

### Week 2: Resume Upload & Basic Matching

#### Goals
- [ ] Upload resume as plain text
- [ ] Parse resume into structured data (manual for now, no AI)
- [ ] Simple keyword matching (no embeddings yet)
- [ ] Show match percentage based on keyword overlap

#### Simple Matching (No ML Yet)
```typescript
function simpleMatch(resume: string, job: Job): number {
  const resumeWords = new Set(resume.toLowerCase().split(/\s+/));
  const jobSkills = new Set(job.requiredSkills.map(s => s.toLowerCase()));
  
  let matches = 0;
  jobSkills.forEach(skill => {
    if (resumeWords.has(skill)) matches++;
  });
  
  return matches / jobSkills.size;
}
```

## Troubleshooting

### If npm install still fails:
1. Delete `node_modules` and `package-lock.json`
2. Run: `npm install --legacy-peer-deps`

### If Electron won't start:
1. Check logs in `AppData/Local/JobSearchAssistant/logs/app.log`
2. Verify database file created at `AppData/Local/JobSearchAssistant/job_search.db`

### If React won't load:
1. Verify Vite is running on port 3000
2. Check browser console for errors

## Next Commands to Run

```powershell
# 1. Clean install
Remove-Item -Recurse -Force node_modules
npm install

# 2. Start development (opens Electron + React)
npm run dev

# 3. If that works, you're ready to code!
```

## Testing Database

Once app runs, you can test the database:

```powershell
# Install sqlite3 CLI (optional)
# Download from: https://sqlite.org/download.html

# Then query your database
sqlite3 "C:\Users\JohnJosephsen\AppData\Local\JobSearchAssistant\job_search.db"
> SELECT * FROM users;
> SELECT * FROM schema_migrations;
> .quit
```

## MVP Feature Priority (Speed Run!)

1. **Job Detection** (clipboard monitoring) ✅ Week 1
2. **Save Jobs** (to database) ✅ Week 1
3. **Resume Upload** (plain text for now) ✅ Week 2
4. **Basic Matching** (keyword overlap) ✅ Week 2
5. **Application Tracker** (manual entry) ✅ Week 3
6. **Export Resume as PDF** (later, use browser print for now) 
7. **AI Cover Letters** (add OpenAI after core works)

## Success Criteria

**By end of Week 1:**
- ✅ App launches without errors
- ✅ Copy a LinkedIn job URL → App detects it
- ✅ Job saves to database
- ✅ Job shows in Dashboard

**By end of Week 2:**
- ✅ Upload resume text
- ✅ See match % for each job
- ✅ Dashboard shows "Top Matches"

**By end of Week 3:**
- ✅ Mark job as "Applied"
- ✅ Track application status
- ✅ Get basic analytics

---

🚀 **Let's ship this!** Start with `npm install` and let me know what happens.
