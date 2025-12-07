# Quick Start Guide 🚀

**After deploying to production, follow these steps to get started.**

---

## 1. Configure Environment (2 minutes)

### Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Name: `OPENAI_API_KEY`
6. Value: Your OpenAI API key (starts with `sk-`)
7. Click **Save**
8. Click **Redeploy** to apply changes

---

## 2. Configure Settings (1 minute)

### In the Web App
1. Go to **Settings** page (sidebar)
2. Fill in your information:
   - Name: John Josephsen
   - Address: 17 Hammond Ave #2
   - City: Clifton
   - State: NJ
   - ZIP: 07011
   - Email: your-email@example.com
   - Phone: 9736192981
3. Click **Save Settings**

---

## 3. Upload Resume (2 minutes)

### From Resumes Page
1. Go to **Resumes** page (sidebar)
2. Click **Upload Resume**
3. Select your PDF or DOCX file
4. Wait for parsing (shows work experiences and skills)
5. Click **⭐ Set as Primary** to use for match scores

---

## 4. Install Browser Extension (3 minutes)

### Chrome/Edge
1. Go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension/` folder from your project
5. Pin the extension to toolbar
6. **Done!** The extension will automatically detect your web app

---

## 5. Run Migration Script (Optional, 1 minute)

### For Better Match Scores
This adds `current_title` field to existing resumes for improved title matching.

1. Open your web app
2. Press **F12** to open console
3. Copy and paste the script from `fix-resume-titles.js`
4. Press **Enter**
5. Refresh the page
6. **Done!** Match scores will now include title similarity

---

## 6. Start Using! (30 seconds)

### Capture Jobs
1. Visit LinkedIn, Indeed, or Glassdoor
2. Find a job posting you like
3. Click the **Jobaly extension** button
4. Job is automatically saved to your dashboard!

### Generate Materials
1. Go to **Dashboard** in the web app
2. Find the job you just saved
3. Click **✨ Generate Application Materials**
4. Wait 30-60 seconds for AI enhancement
5. Review enhanced bullets and cover letter in modal
6. Click **📄 Download Resume** to get tailored DOCX
7. Click **📝 Download Cover Letter** to get formatted letter
8. **Apply to the job!**

---

## Common Commands

### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build
```

### Deployment
```bash
# Deploy to Vercel
vercel --prod

# Check deployment status
vercel ls
```

### Git
```bash
# Commit changes
git add .
git commit -m "Your message"
git push origin main
```

---

## Keyboard Shortcuts

### In Web App
- `Ctrl + K` - Search jobs (if implemented)
- `Esc` - Close modal
- `F5` - Refresh page (reload jobs)

### In Browser
- `F12` - Open developer console
- `Ctrl + Shift + I` - Open developer tools

---

## Tips for Best Results

### Resume Tips
- Upload a well-formatted resume (PDF or DOCX)
- Include clear work experience sections
- Use bullet points for achievements
- List relevant technical skills

### Job Matching Tips
- Set a primary resume for accurate match scores
- Run the migration script for better title matching
- Review match score breakdown to understand your fit

### AI Enhancement Tips
- Let AI run for full 30-60 seconds
- Review enhanced bullets before downloading
- Copy yellow ⚠️ bullets manually to your resume
- Regenerate if you want different phrasing

### Cover Letter Tips
- Configure your contact info in Settings first
- AI generates 3-4 paragraph letters automatically
- Edit downloaded DOCX if needed
- Regenerate for different tone or content

---

## Troubleshooting

### "API key not configured"
→ Add `OPENAI_API_KEY` in Vercel dashboard, then redeploy

### Extension not working
→ Make sure web app is open at localhost:3000 or production URL

### Match scores not showing
→ Set a primary resume in Resumes page

### AI generation fails
→ Check Vercel function logs, verify API key is valid

### Download buttons not working
→ Check browser console for errors, verify file-saver loaded

---

## Support

### Documentation
- [PRODUCTION_READY.md](./PRODUCTION_READY.md) - Full deployment guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed setup instructions
- [docs/](./docs/) - Feature documentation

### Resources
- OpenAI Dashboard: https://platform.openai.com/usage
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repo: https://github.com/YOUR_USERNAME/JobTracker

---

**Have questions? Check the docs or open an issue on GitHub!**

**Happy job hunting! 🎯**
