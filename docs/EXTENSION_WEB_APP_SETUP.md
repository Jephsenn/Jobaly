# 🔌 Extension + Web App Integration Guide

## ✅ Current Status

The extension has been **updated to work with the Jobaly web app!**

### What Changed?

**Before (Desktop App):**
- Extension → HTTP localhost:45782 → Electron desktop app

**Now (Web App):**
- Extension → Content Script → window.postMessage → Web app IndexedDB

## 🚀 Quick Setup

### 1. Load Extension in Chrome

1. Open **chrome://extensions/**
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `/extension` folder from your project
5. Extension "Job Search Assistant" should appear!

### 2. Open Web App

Navigate to: **http://localhost:3000**

### 3. Verify Connection

Open browser console (F12) and look for:
```
🔌 Jobaly content script loaded
👂 Listening for job detection messages from extension
✅ Jobaly app ready - extension listener active
```

## 🧪 Test It!

### Quick Test with LinkedIn:

1. Go to https://www.linkedin.com/jobs/
2. Click any job posting
3. Extension detects it (see extension console logs)
4. Job appears in your Jobaly Dashboard immediately!

### Quick Test with Indeed:

1. Go to https://www.indeed.com/
2. Search for jobs
3. Click a posting
4. Check Jobaly - job should appear!

## 🔍 Debugging

### Check Extension Logs

1. Go to chrome://extensions/
2. Find "Job Search Assistant"
3. Click "Inspect views: service worker"
4. Look for: `📋 Job detected` and `✅ Sent to Jobaly web app`

### Check Web App Logs

Open console at http://localhost:3000:
```
📋 Job received from extension: {...}
✅ Job saved to database
Dashboard: Job detected from extension, reloading...
```

## 🎯 Files Updated

1. **extension/background.js** - Now sends to web app tabs
2. **extension/manifest.json** - Added content script for localhost
3. **extension/content-scripts/jobaly-app.js** - NEW! Relays messages
4. **src/services/extensionListener.ts** - NEW! Receives extension messages
5. **src/renderer/App.tsx** - Initializes listener
6. **src/renderer/pages/Dashboard.tsx** - Reloads when jobs detected

## 🚀 When You Deploy to Production

### Update these URLs:

**In extension/background.js:**
```javascript
const WEB_APP_URL = 'https://jobaly.vercel.app'; // Your deployed URL
```

**In extension/manifest.json:**
```json
"content_scripts": [
  {
    "matches": [
      "https://jobaly.vercel.app/*"  // Your deployed URL
    ],
    "js": ["content-scripts/jobaly-app.js"],
    "run_at": "document_start"
  },
  ...
]
```

## ✨ How It Works

```
┌─────────────────┐
│  LinkedIn/Indeed │ → Content Script detects job
└────────┬────────┘
         ↓
┌─────────────────┐
│Extension Background│ → Receives job data
└────────┬────────┘
         ↓
┌─────────────────┐
│  chrome.tabs    │ → Finds Jobaly tabs
│  .sendMessage   │
└────────┬────────┘
         ↓
┌─────────────────┐
│jobaly-app.js    │ → Content script in web app
│(content script) │
└────────┬────────┘
         ↓
┌─────────────────┐
│window.postMessage│ → Cross-script communication
└────────┬────────┘
         ↓
┌─────────────────┐
│extensionListener│ → Receives in React app
└────────┬────────┘
         ↓
┌─────────────────┐
│   IndexedDB     │ → Saves to database
│   (Dexie)       │
└────────┬────────┘
         ↓
┌─────────────────┐
│   Dashboard     │ → Reloads and displays
└─────────────────┘
```

## 🎉 That's It!

Now when you browse LinkedIn or Indeed, jobs automatically appear in your Jobaly dashboard! 

The extension and web app are now fully integrated. 🚀
