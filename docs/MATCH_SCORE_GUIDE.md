# Match Score Visual Guide

## What You'll See

### Dashboard Job Cards

Each job card now displays a match score badge:

```
┌─────────────────────────────────────────────────────────┐
│ LinkedIn • 2 hours ago • [85% Match]                    │
│                           ↑                              │
│                    Click here for details!              │
│                                                          │
│ Senior Software Engineer                                │
│ Tech Corp                                               │
│ 📍 San Francisco, CA  🏠 Remote                         │
│ 💰 $120,000 - $160,000                                  │
└─────────────────────────────────────────────────────────┘
```

### Color Coding

- **🟢 Green (80%+):** Excellent match - Apply now!
- **🔵 Blue (60-79%):** Good match - Worth considering
- **🟡 Yellow (40-59%):** Fair match - Review carefully
- **⚫ Gray (<40%):** Poor match - May not be ideal

### Match Score Breakdown (Click the badge!)

```
┌────────────────────────────────────────────────────┐
│ Match Breakdown                               [✕]  │
├────────────────────────────────────────────────────┤
│                                                     │
│                      85%                            │
│                  Overall Match                      │
│                                                     │
├────────────────────────────────────────────────────┤
│                                                     │
│ Skills (40%)                               90%     │
│ ▰▰▰▰▰▰▰▰▰▱                                         │
│ 12 matched, 2 missing                              │
│ ✓ Python, React, TypeScript                        │
│ ✗ Go, Kubernetes                                    │
│                                                     │
│ Experience (25%)                           80%     │
│ ▰▰▰▰▰▰▰▰▱▱                                         │
│ You have 4 years, job requires 3-5 years          │
│                                                     │
│ Title Match (20%)                          100%    │
│ ▰▰▰▰▰▰▰▰▰▰                                         │
│ Exact match with desired title                     │
│                                                     │
│ Keywords (15%)                             75%     │
│ ▰▰▰▰▰▰▰▱▱▱                                         │
│ 15 / 20 keywords found                             │
│                                                     │
└────────────────────────────────────────────────────┘
```

## How to Use Match Scores

### Step 1: Upload Your Resume
1. Go to **Resumes** page
2. Click **Upload Resume**
3. Select your PDF or DOCX file
4. Wait for parsing confirmation
5. Set as primary resume

### Step 2: Set Desired Job Titles (Optional but Recommended!)
1. Go to **Settings** page
2. Scroll to **Job Matching Preferences**
3. Enter your target roles (comma-separated):
   - Example: `Software Engineer, Full Stack Developer, Backend Engineer`
4. Click **Save Settings**

**💡 Pro Tip:** Adding desired job titles gives you a 100% title match boost when jobs match your targets!

### Step 3: View Match Scores
1. Return to **Dashboard**
2. Scores appear automatically on job cards
3. Click any score badge to see detailed breakdown
4. Use scores to prioritize which jobs to apply to

## Understanding Your Scores

### Skills Component (40% of total)
- **What it measures:** How many required and preferred skills you have
- **Weight breakdown:**
  - Required skills: 70% of skills score
  - Preferred skills: 30% of skills score
- **Example:** Job requires Python, React, and Docker
  - You have Python and React → 66% skills match
  - You also have preferred skill Node.js → Higher score!

### Experience Component (25% of total)
- **What it measures:** Years of experience vs. requirement
- **Scoring tiers:**
  - 100%: You meet or exceed the requirement
  - 80%: Within 1 year (e.g., you have 3, they want 4)
  - 60%: Within 2 years
  - 40%: Within 3 years
  - 20%: More than 3 years gap

### Title Match Component (20% of total)
- **What it measures:** How well the job title matches your background
- **Special boost:** 100% match if job title matches your desired titles
- **Otherwise:** Fuzzy matching based on word overlap
- **Example:** 
  - Job: "Senior Software Engineer"
  - Your title: "Software Engineer" → 66% match
  - Your desired title: "Senior Software Engineer" → 100% match!

### Keywords Component (15% of total)
- **What it measures:** Frequency of key terms from job description in your resume
- **Algorithm:** Extracts most common words from job description (excluding common words like "the", "and", etc.)
- **Example:** Job mentions "agile", "scrum", "CI/CD" frequently
  - Your resume has all three → High keyword score
  - Missing some → Lower score

## No Resume Uploaded?

If you see **50% Match** with gray styling, it means:
- No resume has been uploaded yet
- Scores are neutral placeholders
- Upload a resume to see real match scores!

The breakdown will show:
```
💡 Upload a resume to get accurate match scores
```

## Tips for Better Match Scores

1. **Update Your Resume:**
   - Add skills you've developed
   - Include relevant keywords
   - Quantify your achievements

2. **Set Multiple Desired Titles:**
   - Include variations of your target role
   - Example: "Software Engineer, SWE, Software Developer"
   - More titles = better matching

3. **Learn In-Demand Skills:**
   - Check what skills you're missing in high-scoring jobs
   - Focus on frequently requested technologies
   - Update resume after learning new skills

4. **Target Your Search:**
   - Focus on jobs with 70%+ match scores
   - Review 60-70% matches for potential upskilling
   - Use low scores to identify skill gaps

## Match Score Insights

### What a High Score Means (80%+)
- You have most required skills
- Your experience level aligns well
- Job title matches your background
- Resume contains relevant keywords
- **Action:** Apply immediately! Strong candidate

### What a Good Score Means (60-79%)
- You meet most requirements
- May have a few skill or experience gaps
- Still a viable opportunity
- **Action:** Apply and highlight transferable skills

### What a Fair Score Means (40-59%)
- Missing some key requirements
- Experience level may not align
- Some skills need development
- **Action:** Consider upskilling before applying

### What a Low Score Means (<40%)
- Significant gaps in required skills
- Experience level mismatch
- Job may not be the best fit
- **Action:** Focus on better-matching opportunities

## Troubleshooting

### "Why is my score low when I'm qualified?"
- **Resume parsing:** Ensure skills are listed clearly
- **Keywords:** Add industry-standard terms
- **Format:** Use standard section headers (Skills, Experience, etc.)
- **Update:** Re-upload resume after making changes

### "Scores aren't showing"
- Check that you've uploaded a resume
- Verify resume is set as primary
- Refresh the dashboard
- Check browser console for errors

### "Desired titles not working"
- Ensure titles are comma-separated
- Check Settings page to verify they saved
- Refresh dashboard after updating settings
- Exact or partial matches both work

## Example Scenario

**Your Profile:**
- Title: Software Engineer
- Skills: Python, React, JavaScript, SQL, Git
- Experience: 4 years
- Desired Titles: "Senior Software Engineer, Full Stack Developer"

**Job Posting:**
- Title: Senior Full Stack Developer
- Required Skills: Python, React, PostgreSQL, Docker
- Preferred Skills: AWS, Kubernetes
- Experience: 3-5 years

**Match Score Breakdown:**
- **Skills:** 80% (Have 3/4 required, 0/2 preferred)
- **Experience:** 100% (4 years fits 3-5 range)
- **Title:** 100% (Matches desired title "Full Stack Developer")
- **Keywords:** 70% (Most keywords present)
- **Overall:** 86% - Excellent Match! 🟢

**Recommendation:** Apply immediately! You're an excellent fit.

## Privacy Note

All match score calculations happen locally in your browser:
- No data sent to external servers
- Scores calculated in real-time
- Settings stored in browser localStorage
- Resume data stored in IndexedDB
- Your information never leaves your device
