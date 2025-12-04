# Browser Extension Setup Guide

## 🎯 What This Does

The browser extension automatically captures job details as you browse LinkedIn, Indeed, and Glassdoor. **No copying required** - just view a job and it's automatically saved to your desktop app with full details (title, company, description, salary, etc.).

## 📦 Installation Steps

### Step 1: Load the Extension

1. **Open Chrome/Edge** and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`

2. **Enable Developer Mode** (toggle in top-right corner)

3. **Click "Load unpacked"**

4. **Select the extension folder**:
   ```
   C:\Users\JohnJosephsen\OneDrive - Spiniello Companies\Documents\Personal\Job Search Tool\extension
   ```

5. **Note the Extension ID** - you'll see something like:
   ```
   Extension ID: abcdefghijklmnopqrstuvwxyz123456
   ```

### Step 2: Create Extension Icons

The extension needs icon files. Run this in PowerShell:

```powershell
cd "C:\Users\JohnJosephsen\OneDrive - Spiniello Companies\Documents\Personal\Job Search Tool\extension\icons"

# Create simple colored square icons as placeholders
Add-Type -AssemblyName System.Drawing

# 16x16 icon
$bmp16 = New-Object System.Drawing.Bitmap(16,16)
$g16 = [System.Drawing.Graphics]::FromImage($bmp16)
$g16.Clear([System.Drawing.Color]::FromArgb(102, 126, 234))
$bmp16.Save("$PWD\icon16.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g16.Dispose()

# 48x48 icon
$bmp48 = New-Object System.Drawing.Bitmap(48,48)
$g48 = [System.Drawing.Graphics]::FromImage($bmp48)
$g48.Clear([System.Drawing.Color]::FromArgb(102, 126, 234))
$bmp48.Save("$PWD\icon48.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g48.Dispose()

# 128x128 icon
$bmp128 = New-Object System.Drawing.Bitmap(128,128)
$g128 = [System.Drawing.Graphics]::FromImage($bmp128)
$g128.Clear([System.Drawing.Color]::FromArgb(102, 126, 234))
$bmp128.Save("$PWD\icon128.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g128.Dispose()

Write-Host "✓ Icons created successfully!"
```

### Step 3: Set Up Native Messaging (Optional - for full integration)

This connects the extension to your desktop app. **The extension works without this** (stores jobs locally), but native messaging sends jobs directly to your desktop app in real-time.

1. **Update the native host manifest** with your extension ID:

   Edit `native-host\com.jobsearch.assistant.json`:
   ```json
   {
     "name": "com.jobsearch.assistant",
     "description": "Job Search Assistant Native Messaging Host",
     "path": "C:\\Users\\JohnJosephsen\\OneDrive - Spiniello Companies\\Documents\\Personal\\Job Search Tool\\native-host\\index.js",
     "type": "stdio",
     "allowed_origins": [
       "chrome-extension://YOUR_EXTENSION_ID_HERE/"
     ]
   }
   ```

2. **Register the native host** in Windows Registry:

   Run this PowerShell script (as Administrator):
   
   ```powershell
   $manifestPath = "C:\Users\JohnJosephsen\OneDrive - Spiniello Companies\Documents\Personal\Job Search Tool\native-host\com.jobsearch.assistant.json"
   
   # For Chrome
   New-Item -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.jobsearch.assistant" -Force
   Set-ItemProperty -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.jobsearch.assistant" -Name "(Default)" -Value $manifestPath
   
   # For Edge
   New-Item -Path "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.jobsearch.assistant" -Force
   Set-ItemProperty -Path "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.jobsearch.assistant" -Name "(Default)" -Value $manifestPath
   
   Write-Host "✓ Native messaging host registered!"
   ```

## ✅ Test It Out

1. **Start your desktop app**:
   ```powershell
   npm run dev
   ```

2. **Open LinkedIn** in your browser:
   ```
   https://www.linkedin.com/jobs/
   ```

3. **Click on any job posting**

4. **Watch for the notification** - you should see "✓ Job captured" in the top-right corner

5. **Check your desktop app** - the job should appear in your dashboard with full details!

## 🎛️ Extension Controls

Click the extension icon in your browser toolbar to:
- **Pause/Resume auto-capture** - toggle the start/stop button
- **View statistics** - see how many jobs captured
- **Check connection status** - see if desktop app is connected

## 🔧 Troubleshooting

### Extension shows "Desktop app: Not connected"
- Make sure your Electron desktop app is running
- Native messaging is optional - jobs will be stored in extension and can be synced later

### No notification appears when viewing jobs
- Check that auto-capture is enabled (click extension icon)
- Open browser console (F12) and look for "Job detector active" message
- Try refreshing the job page

### Jobs not appearing in desktop app
- If native messaging isn't set up, jobs are stored in the extension
- You can export them later or set up native messaging to sync automatically

## 📊 What Data Is Captured

The extension automatically extracts:
- ✅ Job Title
- ✅ Company Name
- ✅ Location
- ✅ Full Job Description
- ✅ Salary (if listed)
- ✅ Employment Type (Full-time, Contract, etc.)
- ✅ Seniority Level (for LinkedIn)
- ✅ Job URL
- ✅ Platform (LinkedIn, Indeed, Glassdoor)

All without you doing ANYTHING except browsing! 🎉
