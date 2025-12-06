# Converting JobTracker to Local-First Web App

## 🎯 Goal
Transform the Electron desktop app into a web app that:
- Stores all data locally in the browser (IndexedDB)
- Works without a backend/database
- Can be deployed to Vercel/Netlify for free
- Still works with the Chrome extension

## 📦 What to Install

```bash
npm install dexie  # IndexedDB wrapper (replaces SQL.js)
npm install localforage  # Alternative: simpler but less powerful
npm uninstall electron electron-builder sql.js  # Remove desktop deps
```

## 🔄 Migration Steps

### Step 1: Replace Database Layer

**Before** (`src/main/database/index.ts`):
```typescript
import initSqlJs from 'sql.js';
const db = await initSqlJs();
db.exec('SELECT * FROM jobs');
```

**After** (`src/services/database.ts`):
```typescript
import Dexie from 'dexie';

class JobTrackerDB extends Dexie {
  jobs!: Dexie.Table<Job, number>;
  resumes!: Dexie.Table<Resume, number>;
  applications!: Dexie.Table<Application, number>;

  constructor() {
    super('JobTrackerDB');
    this.version(1).stores({
      jobs: '++id, title, company_name, url, platform, is_saved, created_at',
      resumes: '++id, name, is_primary, created_at',
      applications: '++id, job_id, resume_id, status, applied_date'
    });
  }
}

export const db = new JobTrackerDB();
```

### Step 2: Update API Calls

**Before** (Electron IPC):
```typescript
// In React components
const jobs = await window.electronAPI.jobs.getAll();
```

**After** (Direct database access):
```typescript
// In React components
import { db } from '../services/database';
const jobs = await db.jobs.toArray();
```

### Step 3: Extension Communication

**Before** (Native messaging to localhost:45782):
```javascript
// extension/content-scripts/linkedin.js
fetch('http://localhost:45782/job', {
  method: 'POST',
  body: JSON.stringify(jobData)
});
```

**After** (Message passing to web app):
```javascript
// Extension sends to background script
chrome.runtime.sendMessage({
  type: 'job-detected',
  job: jobData
});

// Background script forwards to web app
chrome.tabs.query({url: 'https://jobtracker.vercel.app/*'}, (tabs) => {
  if (tabs[0]) {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'job-detected',
      job: jobData
    });
  }
});
```

**In Web App** (Listen for extension messages):
```typescript
// src/App.tsx or hooks/useExtensionListener.ts
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'job-detected') {
      // Add job to IndexedDB
      await db.jobs.add(event.data.job);
    }
  };
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### Step 4: Remove Electron Code

Delete these files:
```
src/main/  (entire folder)
src/main/preload.js
electron-dev.js
tsconfig.main.json
```

Update `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Step 5: Deploy

#### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel login
vercel  # Follow prompts
```

#### Option B: GitHub Pages
```bash
npm run build
# Push dist/ folder to gh-pages branch
```

#### Option C: Netlify
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## 🗂️ New Project Structure

```
JobTracker/
├── extension/          # Chrome extension (unchanged)
├── src/
│   ├── services/
│   │   ├── database.ts      # Dexie setup (NEW)
│   │   ├── JobParser.ts     # Keep as-is
│   │   └── ...
│   ├── hooks/
│   │   └── useExtensionListener.ts  # Listen for extension (NEW)
│   ├── components/         # Keep all your React components
│   ├── pages/              # Keep all your pages
│   └── App.tsx             # Main app (slight changes)
├── public/                 # Static assets
├── package.json
├── vite.config.ts
└── index.html
```

## 📝 Code Examples

### Database Service (NEW)
```typescript
// src/services/database.ts
import Dexie, { Table } from 'dexie';

export interface Job {
  id?: number;
  title: string;
  company_name: string;
  url: string;
  description: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  platform: string;
  is_saved: boolean;
  created_at: string;
}

export interface Resume {
  id?: number;
  name: string;
  full_text: string;
  is_primary: boolean;
  hard_skills: string[];
  created_at: string;
}

export interface Application {
  id?: number;
  job_id: number;
  resume_id: number;
  status: string;
  applied_date: string;
  notes?: string;
}

export class JobTrackerDB extends Dexie {
  jobs!: Table<Job>;
  resumes!: Table<Resume>;
  applications!: Table<Application>;

  constructor() {
    super('JobTrackerDB');
    this.version(1).stores({
      jobs: '++id, title, company_name, platform, is_saved, created_at',
      resumes: '++id, name, is_primary, created_at',
      applications: '++id, job_id, resume_id, status, applied_date'
    });
  }
}

export const db = new JobTrackerDB();
```

### Hook for Extension Communication (NEW)
```typescript
// src/hooks/useExtensionListener.ts
import { useEffect } from 'react';
import { db } from '../services/database';

export const useExtensionListener = () => {
  useEffect(() => {
    const handleExtensionMessage = async (event: MessageEvent) => {
      // Only accept messages from extension
      if (event.source !== window) return;
      
      const { type, data } = event.data;
      
      switch (type) {
        case 'JOB_DETECTED':
          await db.jobs.add({
            ...data,
            is_saved: false,
            created_at: new Date().toISOString()
          });
          // Optionally: show notification
          break;
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);
};
```

### Updated Dashboard Page
```typescript
// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { db } from '../services/database';
import { useExtensionListener } from '../hooks/useExtensionListener';

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  useExtensionListener(); // Listen for extension messages

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    const allJobs = await db.jobs
      .orderBy('created_at')
      .reverse()
      .toArray();
    setJobs(allJobs);
  };

  const handleSaveJob = async (jobId: number) => {
    await db.jobs.update(jobId, { is_saved: true });
    await loadJobs();
  };

  // ... rest of your component
}
```

## 🌐 Extension Updates

Update extension to post to web app:

```javascript
// extension/content-scripts/linkedin.js
function sendJobToApp(jobData) {
  // Send to background script
  chrome.runtime.sendMessage({
    type: 'JOB_DETECTED',
    job: jobData
  });
}
```

```javascript
// extension/background.js (NEW)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JOB_DETECTED') {
    // Find the JobTracker web app tab
    chrome.tabs.query({}, (tabs) => {
      const appTab = tabs.find(tab => 
        tab.url?.includes('jobtracker.vercel.app') || 
        tab.url?.includes('localhost:3000')
      );
      
      if (appTab) {
        // Forward to web app
        chrome.tabs.sendMessage(appTab.id, {
          type: 'JOB_DETECTED',
          data: message.job
        });
      }
    });
  }
});
```

## ✅ Benefits

- ✅ No backend needed
- ✅ No database setup
- ✅ Deploy in 2 minutes
- ✅ Works everywhere
- ✅ Data stays local
- ✅ Free hosting
- ✅ Auto-updates (just refresh)
- ✅ Can export/import data (JSON)

## 🚧 Limitations

- ⚠️ Data is per-browser (not synced across devices)
- ⚠️ Clearing browser data = losing jobs
- ⚠️ ~50MB storage limit (plenty for text data)

## 💾 Add Export/Import (Optional)

```typescript
// Export data
const exportData = async () => {
  const data = {
    jobs: await db.jobs.toArray(),
    resumes: await db.resumes.toArray(),
    applications: await db.applications.toArray()
  };
  
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jobtracker-backup-${Date.now()}.json`;
  a.click();
};

// Import data
const importData = async (file: File) => {
  const text = await file.text();
  const data = JSON.parse(text);
  
  await db.jobs.bulkAdd(data.jobs);
  await db.resumes.bulkAdd(data.resumes);
  await db.applications.bulkAdd(data.applications);
};
```

## 🎯 Next Steps

1. Install Dexie: `npm install dexie`
2. Create `src/services/database.ts`
3. Update Dashboard to use Dexie
4. Test locally with `npm run dev`
5. Deploy to Vercel: `vercel`
6. Update extension to point to deployed URL
7. Done! 🎉
