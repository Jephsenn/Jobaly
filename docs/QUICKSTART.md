# Quick Start: Publishing Your First Release# Quick Start Guide - Phase 1



## ✅ Your Build is Ready!## Installation Steps



The app has been successfully built at:### 1. Clean up and reinstall

- **Portable Version**: `dist-electron\JobTracker-0.1.0-Portable.zip````powershell

- **Executable**: `dist-electron\win-unpacked\JobTracker.exe`# Remove node_modules if exists

- **Update Manifest**: `dist-electron\latest.yml`Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue



## 📦 Publishing to GitHub Releases# Clear npm cache

npm cache clean --force

### Step 1: Create a GitHub Release

# Install dependencies (simplified - no native modules!)

1. Go to: https://github.com/Jephsenn/JobTracker/releasesnpm install

2. Click **"Create a new release"**```

3. Fill in the details:

   - **Tag**: `v0.1.0` (MUST start with `v`)### 2. What Changed

   - **Release title**: `JobTracker v0.1.0`- **Removed**: `better-sqlite3` (requires Visual Studio C++ build tools)

   - **Description**:- **Added**: `sql.js` (pure JavaScript SQLite, no compilation needed)

     ```- **Removed**: Heavy optional dependencies for Phase 1:

     First release of JobTracker!  - `@xenova/transformers` (will add back later for embeddings)

       - `active-win`, `screenshot-desktop`, `tesseract.js` (add when needed)

     Features:  - `docx`, `pdfkit` (add in Phase 3)

     - Job tracking with auto-detection from clipboard  - `node-machine-id` (not critical for MVP)

     - Browser extension for LinkedIn, Indeed, Glassdoor

     - Match scoring with your resume### 3. Run the app

     - Application status tracking```powershell

     - Auto-updates (will work for future releases!)# This will start both React dev server and Electron

     npm run dev

     Installation:```

     1. Download JobTracker-0.1.0-Portable.zip

     2. Extract anywhere## Phase 1 Simplified Roadmap

     3. Run JobTracker.exe

     ```### Week 1 (This Week - Fast Track!)



### Step 2: Upload Files#### ✅ Already Complete

- [x] Project structure

Drag and drop these files into the release:- [x] Database schema design

- ✅ `JobTracker-0.1.0-Portable.zip` (from `dist-electron/`)- [x] TypeScript configs

- ✅ `latest.yml` (from `dist-electron/`)- [x] Basic UI components



**IMPORTANT**: The `latest.yml` file is critical for auto-updates!#### 🎯 Day 1-2: Get it Running

- [ ] Fix any remaining install issues

### Step 3: Publish- [ ] Verify Electron launches

- [ ] Verify React app loads

Click **"Publish release"**- [ ] Database initializes and migrations run



## 🎉 Share with Your Girlfriend#### 🎯 Day 3-4: Basic Job Detection

Create `src/main/services/JobDetector.ts`:

Send her this link after publishing:```typescript

```import clipboardy from 'clipboardy';

https://github.com/Jephsenn/JobTracker/releases/latest

```export class JobDetector {

  private lastClipboard = '';

**Installation Instructions for Her**:  

1. Download `JobTracker-0.1.0-Portable.zip`  start() {

2. Extract to any folder (like `C:\Users\[Username]\JobTracker`)    setInterval(async () => {

3. Run `JobTracker.exe`      const text = await clipboardy.read();

4. That's it! Future updates will happen automatically      if (text !== this.lastClipboard) {

        this.lastClipboard = text;

## 🚀 Future Updates        if (this.isJobURL(text)) {

          console.log('Job detected:', text);

When you want to release an update:          // TODO: Parse and save to database

        }

### 1. Update Version      }

Edit `package.json`:    }, 1000);

```json  }

{  

  "version": "0.2.0"  isJobURL(text: string): boolean {

}    return text.includes('linkedin.com/jobs') || 

```           text.includes('indeed.com/viewjob') ||

           text.includes('glassdoor.com/job-listing');

### 2. Build Again  }

```powershell}

$env:CSC_IDENTITY_AUTO_DISCOVERY="false"```

npm run package:win

```#### 🎯 Day 5-7: Database Integration

- [ ] Create JobsRepository to insert/query jobs

### 3. Create ZIP- [ ] Wire up job detection to database

```powershell- [ ] Display detected jobs in React UI

Compress-Archive -Path "dist-electron\win-unpacked\*" -DestinationPath "dist-electron\JobTracker-0.2.0-Portable.zip" -Force- [ ] Add "Save Job" button

```

### Week 2: Resume Upload & Basic Matching

### 4. Update latest.yml

Edit `dist-electron\latest.yml`:#### Goals

```yaml- [ ] Upload resume as plain text

version: 0.2.0- [ ] Parse resume into structured data (manual for now, no AI)

files:- [ ] Simple keyword matching (no embeddings yet)

  - url: JobTracker-0.2.0-Portable.zip- [ ] Show match percentage based on keyword overlap

path: JobTracker-0.2.0-Portable.zip

releaseDate: '2025-12-05T00:00:00.000Z'#### Simple Matching (No ML Yet)

``````typescript

function simpleMatch(resume: string, job: Job): number {

### 5. Publish to GitHub  const resumeWords = new Set(resume.toLowerCase().split(/\s+/));

- Create new release with tag `v0.2.0`  const jobSkills = new Set(job.requiredSkills.map(s => s.toLowerCase()));

- Upload new ZIP and latest.yml  

- Users running v0.1.0 will automatically get notified!  let matches = 0;

  jobSkills.forEach(skill => {

## 🎯 How Auto-Updates Work    if (resumeWords.has(skill)) matches++;

  });

1. User opens JobTracker v0.1.0  

2. After 3 seconds, app checks GitHub Releases  return matches / jobSkills.size;

3. Sees v0.2.0 is available}

4. Shows dialog: "Update available!"```

5. User clicks "Download"

6. Progress bar shows download## Troubleshooting

7. When complete: "Restart to install?"

8. User restarts → v0.2.0 installed! ✨### If npm install still fails:

1. Delete `node_modules` and `package-lock.json`

## 🐛 Troubleshooting2. Run: `npm install --legacy-peer-deps`



### "Windows protected your PC" message### If Electron won't start:

This is normal for unsigned apps. Click:1. Check logs in `AppData/Local/JobSearchAssistant/logs/app.log`

1. "More info"2. Verify database file created at `AppData/Local/JobSearchAssistant/job_search.db`

2. "Run anyway"

### If React won't load:

To avoid this in production, you'd need a code signing certificate ($100-400/year).1. Verify Vite is running on port 3000

2. Check browser console for errors

### Auto-update not working

- Check that `latest.yml` was uploaded to GitHub Release## Next Commands to Run

- Verify the release is marked as "Latest release" (not pre-release)

- Check version format: must be `v0.1.0` format with `v` prefix```powershell

# 1. Clean install

### App won't startRemove-Item -Recurse -Force node_modules

- Make sure all files from the ZIP are extracted togethernpm install

- Check Windows Defender didn't quarantine any files

- Try running as Administrator# 2. Start development (opens Electron + React)

npm run dev

## 📝 Notes

# 3. If that works, you're ready to code!

- The portable version doesn't require installation```

- All data is stored in `%APPDATA%\JobTracker`

- Browser extension needs to be loaded separately (see `extension/SETUP.md`)## Testing Database

- No internet required except for auto-updates

Once app runs, you can test the database:

## 🎊 You Did It!

```powershell

Your app is:# Install sqlite3 CLI (optional)

- ✅ Built and working# Download from: https://sqlite.org/download.html

- ✅ Ready to distribute

- ✅ Auto-updater configured# Then query your database

- ✅ Girlfriend-ready!sqlite3 "C:\Users\JohnJosephsen\AppData\Local\JobSearchAssistant\job_search.db"

> SELECT * FROM users;

Just publish to GitHub Releases and share the link. Future updates will happen automatically for all users!> SELECT * FROM schema_migrations;

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
