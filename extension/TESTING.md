# Quick Test Guide

## Step 1: Reload the Extension

1. Go to `chrome://extensions`
2. Find "Job Search Assistant"
3. Click the **reload** button (🔄)

## Step 2: Open LinkedIn

1. Go to: https://www.linkedin.com/jobs/
2. Search for any job (e.g., "software engineer")
3. Click on a job posting

## Step 3: Check Console Logs

### Browser Console (F12)
You should see:
```
✅ LinkedIn job detector active
LinkedIn: Job page detected, waiting for content to load...
LinkedIn: Sending job to background: [Job Title]
LinkedIn: Job sent successfully: {success: true, method: 'http'}
```

### Extension Service Worker Console
1. Right-click extension icon → "Inspect service worker"
2. You should see:
```
📋 Job Search Assistant loaded, auto-capture: ON
📋 Job detected: [Job Title] at [Company]
🔗 URL: https://www.linkedin.com/jobs/view/...
✅ Sent to desktop app successfully
```

### Desktop App Logs
Check the Electron terminal, you should see:
```
info: Received from extension {"type":"JOB_DETECTED"}
info: Job received from browser extension {"platform":"LinkedIn","title":"...","company":"..."}
info: Extension job saved to database {"jobId":1,"platform":"LinkedIn"}
```

## Step 4: Check Dashboard

Open your desktop app and you should see the job appear in the dashboard!

## Troubleshooting

### No console logs at all
- Extension not loaded properly
- Try reloading the extension

### "Extension disabled" message
- Click extension icon
- Make sure auto-capture is ON

### "Desktop app not reachable"
- Desktop app not running
- Run: `npm run dev`
- Check that you see "Extension API server started" in logs

### Job captured but not in dashboard
- Check for database errors in Electron logs
- Make sure dashboard is refreshing (may need to click "Saved" then back to "Recent")

## Test the HTTP Endpoint Directly

Run this in PowerShell:
```powershell
$testJob = @{
    type = "JOB_DETECTED"
    job = @{
        id = "test123"
        url = "https://www.linkedin.com/jobs/view/test"
        platform = "LinkedIn"
        title = "Test Engineer"
        company = "Test Corp"
        location = "Remote"
        description = "Test job description"
        salary = "$100k"
        detectedAt = (Get-Date).ToString("o")
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://127.0.0.1:45782" -Method POST -Body $testJob -ContentType "application/json"
```

Should return: `{success: true}`

And you should see it in your desktop app dashboard!
