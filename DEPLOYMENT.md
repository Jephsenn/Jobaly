# Deployment Guide

## Production Setup

### 1. Environment Variables

Create a `.env` file in the project root (for local development) or configure in Vercel dashboard (for production):

```bash
# Required: OpenAI API Key for AI features
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Important Security Notes:**
- ❌ **NEVER** commit `.env` files to git
- ✅ `.env` is already in `.gitignore`
- ✅ For production, set environment variables in Vercel dashboard
- ✅ The API key is only accessible server-side via `/api/openai` endpoint

### 2. Vercel Deployment

#### Initial Setup

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```

4. **Set environment variables**:
   ```bash
   vercel env add OPENAI_API_KEY
   ```
   Then paste your OpenAI API key when prompted.

#### Deploy to Production

```bash
# Deploy to production
vercel --prod

# Or use the alias
npm run deploy
```

### 3. GitHub Setup

#### Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Jobaly AI-Powered Job Search Assistant"

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/JobTracker.git

# Push to main branch
git push -u origin main
```

#### Enable Vercel GitHub Integration

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables in Vercel:
   - Add `OPENAI_API_KEY` with your API key
5. Deploy!

**Vercel will automatically:**
- ✅ Deploy on every push to `main`
- ✅ Create preview deployments for pull requests
- ✅ Use the serverless function `/api/openai.ts` to proxy AI requests

### 4. Local Development

#### First Time Setup

```bash
# Install dependencies
npm install

# Create local .env file (optional, for development with local API key)
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start development server
npm run dev
```

#### Development Options

**Option A: Use Vercel Proxy (Recommended)**
- No local API key needed
- Set `jobaly_dev_openai_key` in browser localStorage to use local key
- Or let it use the `/api/openai` endpoint (requires Vercel deployment)

**Option B: Direct OpenAI API (Development Only)**
- Open browser console at `localhost:3000`
- Set local API key:
  ```javascript
  localStorage.setItem('jobaly_dev_openai_key', 'sk-your-key-here');
  ```
- Refresh the page
- **WARNING**: Never commit this key or use in production!

### 5. Browser Extension Setup

The browser extension captures job postings from LinkedIn, Indeed, Glassdoor, etc.

#### Installation

1. Open Chrome/Edge and go to `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/` folder from this project
5. Pin the extension to your toolbar

#### Configuration

The extension automatically detects when the web app is running at `localhost:3000` or your production URL. No additional configuration needed!

### 6. Testing the Deployment

#### Test Checklist

- [ ] Web app loads at your Vercel URL
- [ ] Browser extension can detect and send jobs
- [ ] Can upload and parse resume (PDF/DOCX)
- [ ] Match scores calculate correctly
- [ ] Can generate AI-enhanced resume
- [ ] Can generate AI cover letter
- [ ] Documents download successfully
- [ ] Settings persist in localStorage

#### Common Issues

**Issue: "API key not configured"**
- Solution: Add `OPENAI_API_KEY` to Vercel environment variables
- Redeploy after adding: `vercel --prod`

**Issue: CORS errors from /api/openai**
- Solution: The API endpoint has CORS enabled. Check that you're calling from the same domain
- Verify in `api/openai.ts` that CORS headers are set correctly

**Issue: Extension not detecting web app**
- Solution: Make sure the web app is running (localhost:3000 or production URL)
- Check console for "✅ Jobaly app ready" message
- Verify extension permissions in Chrome

### 7. Production Best Practices

#### Security

- ✅ API keys stored server-side only (Vercel environment variables)
- ✅ All AI requests go through `/api/openai` proxy
- ✅ No API keys in client-side code
- ✅ User data stored locally in IndexedDB (browser-side only)
- ✅ No cloud storage or external databases

#### Performance

- ✅ Serverless functions scale automatically
- ✅ Static assets served via Vercel CDN
- ✅ Database is client-side (IndexedDB) for instant access
- ✅ AI requests cached when possible

#### Monitoring

1. **Vercel Analytics**: Enabled by default
2. **Error Tracking**: Check Vercel function logs
3. **API Usage**: Monitor OpenAI dashboard for API costs

### 8. Cost Estimates

#### OpenAI API Costs (GPT-4o-mini)

- **Resume Enhancement**: ~$0.001-0.003 per job (16 bullets)
- **Cover Letter**: ~$0.002-0.005 per letter
- **Monthly Estimate**: $5-15 for active job seeker (100-200 applications)

#### Vercel Hosting

- **Hobby Plan**: FREE (includes 100GB bandwidth, serverless functions)
- **Pro Plan**: $20/month (unlimited bandwidth, better performance)

### 9. Updates and Maintenance

#### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install package-name@latest
```

#### Database Migrations

If you add new resume fields or features:

1. Update `src/services/database.ts` schema
2. Create migration script in `migrations/` folder
3. Users run migration from browser console

Example migration for resume titles:
```javascript
// Run in browser console at localhost:3000
// Copy/paste from fix-resume-titles.js
```

### 10. Backup and Recovery

#### Export User Data

Built-in export/import functionality:
1. Go to Settings page
2. Click "Export Data"
3. Save JSON file locally

#### Restore Data

1. Go to Settings page
2. Click "Import Data"
3. Select previously exported JSON file

## Support

For issues or questions:
- Check [docs/](./docs/) folder for detailed documentation
- Review [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- Open an issue on GitHub

## Next Steps

After deployment:
1. Test all features thoroughly
2. Run the resume migration script (fix-resume-titles.js)
3. Configure Settings with your contact information
4. Upload your primary resume
5. Install browser extension
6. Start applying to jobs!

---

**Made with ❤️ for job seekers**
