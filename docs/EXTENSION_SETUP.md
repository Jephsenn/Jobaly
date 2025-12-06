# Browser Extension Setup Guide

## ⚠️ Important: Extension is Separate

The JobTracker **browser extension is NOT included** in the app download. It needs to be installed separately in Chrome.

## 📦 What You Need

1. **JobTracker App** - Already installed ✅
2. **Browser Extension** - Needs to be loaded manually from source files

## 🔧 Installation Steps

### Step 1: Get the Extension Files

You need the `extension` folder from the source code. Two options:

#### Option A: Download from GitHub (Easier)
1. Go to: https://github.com/Jephsenn/JobTracker
2. Click the green "Code" button
3. Click "Download ZIP"
4. Extract the ZIP file
5. Find the `extension` folder inside

#### Option B: Get from Developer
Ask the person who gave you JobTracker for the `extension` folder.

### Step 2: Install in Chrome

1. **Open Chrome Extensions Page**
   - Type in address bar: `chrome://extensions`
   - Or: Menu (⋮) → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Look for the toggle in the top-right corner
   - Switch it ON

3. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to the `extension` folder
   - Select the folder
   - Click "Select Folder"

4. **Pin the Extension** (Optional but helpful)
   - Click the puzzle piece icon (🧩) in Chrome toolbar
   - Find "Job Search Assistant"
   - Click the pin icon to keep it visible

### Step 3: Verify It's Working

1. Go to LinkedIn, Indeed, or Glassdoor
2. Open a job posting
3. Look for the extension icon turning colors or showing a badge
4. The job should appear in your JobTracker app!

## 🌐 What the Extension Does

The extension automatically detects when you're viewing job postings on:
- **LinkedIn** (linkedin.com)
- **Indeed** (indeed.com)
- **Glassdoor** (glassdoor.com)

It extracts:
- Job title
- Company name
- Location
- Salary (if available)
- Job description
- Required skills
- Benefits
- And more!

Then sends it to your JobTracker app automatically.

## 🔄 How It Communicates with the App

The extension and app communicate through:
1. **Native Messaging** - Direct connection between Chrome and the app
2. **HTTP Server** - The app runs a local server on port 45782

You don't need to do anything - it just works!

## 🐛 Troubleshooting

### Extension shows "Cannot connect to native messaging host"
This is normal if the JobTracker app isn't running. Just open the app and it should connect.

### Jobs aren't appearing in the app
1. Make sure JobTracker app is running
2. Check that you're on a supported site (LinkedIn, Indeed, Glassdoor)
3. Try refreshing the job posting page
4. Click the extension icon to manually trigger detection

### Extension says "Could not establish connection"
1. Close and reopen Chrome
2. Restart the JobTracker app
3. Try disabling and re-enabling the extension

### Extension disappeared after Chrome restart
1. Go back to `chrome://extensions`
2. Make sure the extension is still there and enabled
3. You may need to reload it if you moved the extension folder

## 📝 Important Notes

- **Don't delete the extension folder** after loading it - Chrome needs to access it
- **Keep the folder in a permanent location** (like `C:\Users\[YourName]\JobTracker\extension`)
- The extension only works when the JobTracker app is running
- No personal data is sent anywhere - everything stays on your computer

## 🎯 Quick Test

To test if everything is working:

1. Open JobTracker app
2. Open Chrome
3. Go to: https://www.linkedin.com/jobs/
4. Click on any job posting
5. Wait 2-3 seconds
6. Check JobTracker app - the job should appear in your dashboard!

## 🚀 You're All Set!

Once installed, the extension will:
- ✅ Automatically detect job postings
- ✅ Extract all relevant information
- ✅ Send it to your JobTracker app
- ✅ Calculate match scores with your resume
- ✅ Help you track applications

No more copy-pasting! Just browse jobs normally and they'll automatically save. 🎉

---

## For Developers: Publishing the Extension (Future)

Currently, users need to load the extension manually. To make it easier:

1. **Publish to Chrome Web Store** (requires $5 one-time fee)
   - Users can install with one click
   - Automatic updates
   - No developer mode needed

2. **Package as CRX file**
   - Shareable file
   - Still requires developer mode
   - Easier than folder

3. **Include in app installer** (complex)
   - App automatically installs extension
   - Requires additional setup

For now, manual installation works fine for personal use!
