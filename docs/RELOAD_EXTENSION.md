# 🔄 Extension Update Required

## What Changed?

I just updated the extension to properly communicate with the web app. The issue was:
- ❌ Missing `tabs` permission
- ❌ Missing `localhost` host permission

## 🔧 How to Fix

### Step 1: Reload the Extension

1. Open **chrome://extensions/**
2. Find "Job Search Assistant"
3. Click the **🔄 Reload button** (circular arrow icon)
4. You might see a permission request popup - **click Accept/Allow**

### Step 2: Refresh Your Web App

1. Go to your **http://localhost:3000** tab
2. Press **F5** or **Ctrl+R** to refresh
3. Check console - you should see:
   ```
   🔌 Jobaly content script loaded
   👂 Listening for job detection messages from extension
   ```

### Step 3: Test Again

1. Go back to LinkedIn job posting
2. Click a different job (or refresh and click same one)
3. **Check extension console logs:**
   - Go to chrome://extensions/
   - Click "Inspect views: service worker" on the extension
   - You should see:
     ```
     📋 Job detected: [Job Title]
     🔍 Looking for Jobaly tabs at: http://localhost:3000
     📊 Found 1 Jobaly tab(s)
     📤 Sending to tab 12345
     ✅ Sent to Jobaly tab 12345
     ```

4. **Check web app console (F12):**
   ```
   📋 Job received from extension: {...}
   ✅ Job saved to database
   ```

5. **Check your Dashboard** - job should appear!

## 🐛 Debugging

### If you see "Found 0 Jobaly tabs":

**Problem:** Extension can't find your web app tab

**Solutions:**
- Make sure http://localhost:3000 is actually open
- Make sure you reloaded the extension after updating manifest.json
- Try closing and reopening the localhost tab
- Check if you accidentally opened a different port

### If you see "Failed to send to tab":

**Problem:** Content script not injected

**Solutions:**
- Refresh the localhost:3000 tab (F5)
- Check manifest.json has the localhost content script
- Try reloading extension again

### If job still goes to "local" storage:

**Problem:** Extension is catching error and falling back

**Solutions:**
- Check extension service worker console for error messages
- Make sure you accepted the new permissions when reloading
- Try removing and re-adding the extension

## 📊 What the Logs Should Show

### Extension Console (Inspect service worker):
```
📋 Job detected: Software Engineer at TechCorp
🔗 URL: https://...
🔍 Looking for Jobaly tabs at: http://localhost:3000
📊 Found 1 Jobaly tab(s)
📤 Sending to tab 123
✅ Sent to Jobaly tab 123
✅ Sent to desktop app successfully
```

### Web App Console (localhost:3000):
```
🔌 Jobaly content script loaded
📨 Message received from extension background: JOB_DETECTED
✅ Job forwarded to web app
📋 Job received from extension: {title: "Software Engineer", ...}
✅ Job saved to database
Dashboard: Job detected from extension, reloading...
```

## ✅ Once Working

You should see:
- Job appears in Dashboard instantly
- No more "method: 'local'" in extension console
- "method: 'web-app'" instead

---

**Ready?** Reload the extension and try again! 🚀
