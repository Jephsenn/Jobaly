# Vercel Deployment Guide

## Environment Variables Setup

After deploying to Vercel, you need to configure the OpenAI API key as an environment variable.

### Steps:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key
   - **Environments**: Select all (Production, Preview, Development)
4. Click **Save**
5. Redeploy your application

### API Key Security

✅ **Secure Implementation:**
- API key is stored as a Vercel environment variable (never in code)
- Frontend calls go through `/api/openai` proxy endpoint
- Serverless function (`api/openai.ts`) handles OpenAI API calls
- Key is never exposed to browser or users

### Testing Locally

To test the AI features locally:

1. Create a `.env` file in the project root (already gitignored)
2. Add: `OPENAI_API_KEY=your_key_here`
3. Run `npm run dev`

The API proxy endpoint will work both locally and on Vercel.

### AI Features Powered by Proxy:

- 📝 Resume enhancement for job applications
- 📄 Cover letter generation
- 🎯 Content optimization

## Deployment Commands

```bash
# Deploy to production
vercel --prod

# Preview deployment
vercel
```

## Troubleshooting

If AI features don't work after deployment:
1. Check that `OPENAI_API_KEY` is set in Vercel environment variables
2. Verify the environment variable is available in all environments
3. Redeploy after adding environment variables
4. Check Vercel function logs for errors
