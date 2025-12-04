# 🎯 Job Search Assistant - Browser Extension

## What It Does

**Zero-effort job tracking** - just browse jobs normally and everything gets automatically captured!

When you view a job on LinkedIn, Indeed, or Glassdoor, the extension:
- ✅ Automatically extracts all job details (title, company, description, salary, etc.)
- ✅ Saves it to your desktop app in real-time
- ✅ Shows a subtle "✓ Job captured" notification
- ✅ **No copying, no clicking, no manual work required!**

## Quick Start

### 1. Install the Extension

1. Open **Chrome** or **Edge**
2. Go to `chrome://extensions` or `edge://extensions`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select folder:
   ```
   C:\Users\JohnJosephsen\OneDrive - Spiniello Companies\Documents\Personal\Job Search Tool\extension
   ```

### 2. Make Sure Desktop App is Running

```powershell
cd "C:\Users\JohnJosephsen\OneDrive - Spiniello Companies\Documents\Personal\Job Search Tool"
npm run dev
```

### 3. Browse Jobs!

That's it! Just:
1. Go to LinkedIn/Indeed/Glassdoor
2. View any job posting
3. Watch the magic happen ✨

## How to Use

### Browser Extension Popup

Click the extension icon (🎯) to:
- **View status** - see if auto-capture is active
- **Pause/Resume** - toggle the start/stop button
- **See statistics** - jobs captured this session

### Supported Platforms

| Platform | Auto-Capture | Data Extracted |
|----------|--------------|----------------|
| LinkedIn | ✅ | Title, Company, Location, Description, Salary, Employment Type, Seniority |
| Indeed | ✅ | Title, Company, Location, Description, Salary, Employment Type |
| Glassdoor | ✅ | Title, Company, Location, Description, Salary |

More platforms coming soon!

## What Data Is Captured

Every time you view a job, we automatically extract:

- **Job Title** - "Senior Software Engineer"
- **Company** - "Microsoft"
- **Location** - "Seattle, WA (Remote)"
- **Full Description** - All requirements, responsibilities, etc.
- **Salary** - "$120,000 - $150,000/year" (if listed)
- **Employment Type** - Full-time, Contract, etc.
- **Seniority Level** - Entry, Mid-Senior, Director (LinkedIn only)
- **Job URL** - Direct link to posting
- **Platform** - Where it was found

## Desktop App Integration

Jobs are automatically sent to your desktop app where you can:
- 📊 See match scores (coming soon)
- 💾 Save jobs you're interested in
- 🗑️ Dismiss jobs you don't want
- 📝 Track applications
- 📄 Generate custom resumes/cover letters

## Privacy & Security

✅ **100% Local** - All data stays on your computer  
✅ **No Tracking** - We don't collect anything  
✅ **No Account Required** - No sign-up, no login  
✅ **TOS Compliant** - Only captures what YOU view  
✅ **No Scraping** - Uses your own browser context  

## Troubleshooting

### "Desktop app: Not connected"
- Make sure your Electron desktop app is running (`npm run dev`)
- Jobs will be stored locally in the extension until connection is restored

### No notification when viewing jobs
- Check that auto-capture is enabled (click extension icon)
- Try refreshing the job page
- Open DevTools Console (F12) to see detection logs

### Jobs not showing in desktop app
- Verify native messaging server started (check Electron logs for "Native messaging server started")
- Jobs are sent via TCP on port 45782

### Page-specific issues

**LinkedIn:**
- Wait 1 second after page loads for detection
- Works on `/jobs/view/` URLs
- Multiple selectors handle different LinkedIn layouts

**Indeed:**
- Works on `viewjob` and `rc/clk` URLs
- Automatically extracts salary from metadata

**Glassdoor:**
- Works on `/job-listing/` and `/Job/` URLs
- Extracts from data-test attributes

## Development

### Testing Individual Content Scripts

Open DevTools Console on a job page and check for:
```
LinkedIn job detector active
Indeed job detector active
Glassdoor job detector active
```

### Background Script Logs

Right-click extension icon → "Inspect service worker" to see:
- Job detection events
- Native messaging connection status
- Errors

### File Structure

```
extension/
├── manifest.json          # Extension config
├── background.js          # Service worker (handles messaging)
├── popup.html/popup.js    # Extension popup UI
├── content-scripts/
│   ├── linkedin.js        # LinkedIn job detector
│   ├── indeed.js          # Indeed job detector
│   └── glassdoor.js       # Glassdoor job detector
└── icons/                 # Extension icons
```

## Advanced Setup: Native Messaging (Optional)

For direct browser-to-desktop communication:

1. Copy your Extension ID from `chrome://extensions`

2. Edit `native-host/com.jobsearch.assistant.json`:
   ```json
   {
     "allowed_origins": [
       "chrome-extension://YOUR_EXTENSION_ID_HERE/"
     ]
   }
   ```

3. Run as Administrator:
   ```powershell
   $manifestPath = "C:\Users\JohnJosephsen\...\native-host\com.jobsearch.assistant.json"
   
   New-Item -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.jobsearch.assistant" -Force
   Set-ItemProperty -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.jobsearch.assistant" -Name "(Default)" -Value $manifestPath
   ```

> **Note:** Native messaging is optional. The extension works without it by sending jobs via TCP to the desktop app.

## What's Next

Planned features:
- 🎯 Match score badges on job listings
- 🔔 Desktop notifications for high-match jobs
- 📋 One-click apply with auto-filled info
- 📊 Market research (salary trends, company reviews)
- 🤖 AI-powered resume optimization

## Support

Having issues? Check:
1. Desktop app is running (`npm run dev`)
2. Extension permissions are granted
3. Browser console for errors (F12)
4. Extension service worker logs (right-click icon → Inspect)

---

**Happy job hunting!** 🚀

Just browse normally - we'll handle the rest.
