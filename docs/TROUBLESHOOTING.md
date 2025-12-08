# Troubleshooting Guide

## Common Issues and Solutions

### Issue: Jobs Show as "LinkedIn Job 12345" with Minimal Details

**Symptoms:**
- Job titles appear as "LinkedIn Job [random number]"
- Match scores are always around 59%
- Job descriptions are missing or very short
- Company name shows as "Unknown Company"

**Causes:**
1. LinkedIn's dynamic content hasn't fully loaded when the extension captures the job
2. LinkedIn has updated their HTML structure (selectors no longer match)
3. Browser extensions are being blocked by LinkedIn's security
4. The job page loaded but critical elements are in a different location

**Solutions:**

#### 1. Wait Longer Before Navigating
The extension now waits 2 seconds for content to load. If you're on a slow connection:
- Open the job posting
- Wait 3-5 seconds before clicking away
- Scroll down to ensure all content loads
- The extension will capture once content is visible

#### 2. Check Browser Console for Errors
1. Right-click on the LinkedIn page → "Inspect" → "Console" tab
2. Look for messages starting with "LinkedIn:"
3. Errors will show what couldn't be found:
   - `⚠️ LinkedIn: No title found` - Title selectors failed
   - `⚠️ LinkedIn: No description found` - Description not loaded
   - `⚠️ LinkedIn: Extracted data quality is poor` - Overall data incomplete

#### 3. Manually Refresh the Extension
If jobs aren't being captured:
1. Go to `chrome://extensions`
2. Find "Jobaly Job Tracker Extension"
3. Click the refresh icon
4. Reload the LinkedIn page

#### 4. Check Extension Permissions
1. Go to `chrome://extensions`
2. Click "Details" on Jobaly extension
3. Ensure "Site access" is set to "On all sites" or specifically allows LinkedIn

#### 5. Verify the Web App is Open
The extension needs the Jobaly web app to be open:
1. Open `https://jobaly.vercel.app` (or your local version)
2. Keep this tab open while browsing jobs
3. Jobs will automatically sync when detected

### Issue: Match Score Always Shows 59%

**Symptoms:**
- All jobs have identical or very similar match scores (around 59%)
- Match breakdown shows neutral scores across all categories

**Causes:**
1. Resume wasn't uploaded or parsed correctly
2. Job description is missing/too short (< 100 characters)
3. No skills were extracted from either resume or job posting

**Solutions:**

#### 1. Verify Resume Upload
1. Go to "Resumes" page in Jobaly
2. Check if your resume is listed and marked as "Primary"
3. Click "Edit" and verify:
   - Skills are listed in the "Hard Skills", "Soft Skills", or "Tools/Technologies" fields
   - Work experience has detailed bullet points
   - Full text was extracted correctly

#### 2. Re-upload Your Resume
If skills aren't being extracted:
1. Go to "Resumes" page
2. Delete existing resume
3. Upload again and wait for parsing to complete
4. Click "Edit" after upload and manually add missing skills if needed

#### 3. Check Job Data Quality
Look for the "⚠️ Limited Info" badge on job cards:
- This means the job scraping didn't capture enough data
- Match scores will be less accurate
- Try opening the job again or copying the description manually

#### 4. Expected Match Score Behavior
When data is incomplete:
- **With no resume**: All jobs default to ~50% match
- **With resume but no job description**: ~60-70% neutral match
- **Generic job title**: ~59% (weighted average of neutral scores)

**Normal match scores should vary between 20-95% depending on the actual match quality.**

### Issue: Extension Not Capturing Jobs

**Symptoms:**
- No notification appears when viewing a job
- Jobs don't appear in the Jobaly dashboard

**Solutions:**

#### 1. Check Extension Is Enabled
1. Go to `chrome://extensions`
2. Ensure the Jobaly extension toggle is ON (blue)
3. Verify no errors are shown

#### 2. Verify You're on a Supported Site
Currently supported job platforms:
- LinkedIn (`linkedin.com/jobs/view/*`)
- Indeed (coming soon)
- Glassdoor (coming soon)

#### 3. Check Browser Console
1. Open the job page
2. Press F12 to open DevTools
3. Go to "Console" tab
4. Look for messages:
   - `🚀 Initializing LinkedIn job detector...` - Extension loaded
   - `✅ Job data extracted successfully` - Job was captured
   - `❌ Failed to extract job data` - Extraction failed

#### 4. Reload Both Extension and Page
1. Go to `chrome://extensions`
2. Reload the Jobaly extension
3. Reload the LinkedIn job page
4. Try viewing a different job

### Issue: Skills Not Extracted from Resume

**Symptoms:**
- Resume shows 0 skills in the breakdown
- Match scores for skills component are very low (0-30%)

**Solutions:**

#### 1. Use Standard Resume Format
The parser works best with:
- Clear section headers: "Skills", "Technical Skills", "Core Competencies"
- Comma-separated skill lists
- Bullet points in work experience
- Standard file formats (PDF or DOCX)

#### 2. Manual Skill Entry
After upload, click "Edit" on your resume and:
1. Go to "Hard Skills" field
2. Enter skills separated by commas: `JavaScript, Python, React, Node.js, AWS`
3. Fill in "Soft Skills": `Leadership, Communication, Problem Solving`
4. Add "Tools & Technologies": `Git, Docker, JIRA, Figma`
5. Save changes

#### 3. Skills the System Recognizes
The system automatically detects:
- **Programming Languages**: JavaScript, Python, Java, C++, C#, Ruby, Go, Rust, etc.
- **Frameworks**: React, Angular, Vue, Django, Spring, .NET, etc.
- **Databases**: SQL, PostgreSQL, MongoDB, Redis, etc.
- **Cloud/DevOps**: AWS, Azure, GCP, Docker, Kubernetes, Jenkins, etc.
- **Tools**: Git, JIRA, Figma, Tableau, etc.
- **Soft Skills**: Leadership, Communication, Teamwork, etc.

If your skills aren't being recognized, add them manually in the Edit Resume form.

## Debug Mode

### Enable Detailed Logging

The extension and app now include extensive console logging to help diagnose issues:

1. **LinkedIn Content Script Logs:**
   - Open LinkedIn job page
   - Press F12 → Console tab
   - Look for messages prefixed with "LinkedIn:"
   - Shows what selectors were tried and what was found

2. **Match Score Calculator Logs:**
   - Open browser console on Jobaly app
   - Look for messages like:
     - `📊 Resume skills extracted: ...`
     - `📊 Job skills required: ...`
     - `✅ Skills matched: X / Y`
     - `⚠️ No skills extracted from job`

3. **Data Quality Warnings:**
   - Console will show `⚠️ LinkedIn: Extracted data quality is poor` when:
     - No job title found
     - No company name found
     - Description is missing or < 100 characters

## Getting Help

If you're still experiencing issues:

1. **Check the Console Logs:**
   - Open DevTools (F12)
   - Copy all messages related to Jobaly/LinkedIn
   - Note what you were trying to do when it failed

2. **Collect Example Data:**
   - URL of the job that failed to capture
   - Screenshot of the job card showing "LinkedIn Job 12345"
   - Your resume type (PDF/DOCX) and approximate format

3. **Create an Issue:**
   - Include console logs
   - Describe the expected vs actual behavior
   - Mention your browser version and OS

## Best Practices

### For Best Match Score Accuracy:

1. **Resume Quality:**
   - Use clear section headers
   - List skills explicitly in a "Skills" section
   - Include 3-5 bullet points per work experience
   - Keep formatting simple (avoid complex tables/columns)

2. **Job Browsing:**
   - Wait 2-3 seconds after opening a job before moving to the next
   - Scroll down to load all content
   - Keep the Jobaly web app open in a tab

3. **Data Management:**
   - Mark one resume as "Primary" for scoring
   - Regularly review and edit captured jobs to fill missing data
   - Delete duplicate or test jobs to keep your dashboard clean

### Expected System Behavior:

- **Job Capture Time:** 2-3 seconds after opening a job
- **Match Score Range:** 20-95% (should vary significantly between jobs)
- **Skill Detection:** Should find 5-20 skills from a typical tech resume
- **Data Quality:** Most jobs should have title, company, and 500+ character description

If your experience differs significantly from these expectations, refer to the troubleshooting steps above.
