# Legal Compliance & Terms of Service Checklist

## 1. Platform Terms of Service Compliance

### ✅ What This Tool DOES (Compliant)
- [x] **Monitors User Clipboard**: Detects when user manually copies job URLs
- [x] **Reads Active Window Metadata**: Detects browser tab titles/URLs
- [x] **Processes User-Provided Data**: Analyzes text user explicitly provides
- [x] **Local Analysis Only**: All AI processing happens on user's device
- [x] **Manual User Actions**: User initiates all data collection
- [x] **Productivity Enhancement**: Tool assists user, doesn't replace their actions

### ❌ What This Tool DOES NOT Do (TOS Violations)
- [ ] **Web Scraping**: No automated crawling of job platforms
- [ ] **Bot Behavior**: No automated form submission or auto-apply
- [ ] **Credential Collection**: No storage of LinkedIn/Indeed passwords
- [ ] **API Abuse**: No unauthorized API calls to job platforms
- [ ] **Data Mining**: No bulk data extraction from platforms
- [ ] **Proxy/VPN Rotation**: No evasion of rate limits
- [ ] **Reverse Engineering**: No circumvention of platform protections

---

## 2. Privacy Compliance (GDPR, CCPA, SOC 2)

### Data Collection
✅ **Minimal Collection**: Only job data user actively views  
✅ **User Consent**: Explicit opt-in for all features  
✅ **Transparency**: Clear privacy policy explaining data use  
✅ **No Third-Party Sharing**: Zero data leaves user's device  

### Data Storage
✅ **Local-First**: SQLite database on user's machine  
✅ **Encryption**: AES-256 for sensitive fields  
✅ **Access Control**: User-only access, no cloud sync  
✅ **Data Retention**: User controls retention policy  

### User Rights (GDPR Article 15-20)
- [x] **Right to Access**: Export all data to JSON
- [x] **Right to Rectification**: Edit any stored data
- [x] **Right to Erasure**: Delete all data with one click
- [x] **Right to Portability**: Export in standard formats (JSON, CSV)
- [x] **Right to Object**: Disable any feature
- [x] **Right to Restriction**: Pause data collection

### Implementation
```typescript
// Example: GDPR Export Function
export async function exportAllUserData(userId: number): Promise<string> {
  const data = {
    user: await getUserData(userId),
    resumes: await getResumes(userId),
    jobs: await getJobs(userId),
    applications: await getApplications(userId),
    exportDate: new Date().toISOString(),
    format: 'GDPR-compliant data export',
  };
  
  return JSON.stringify(data, null, 2);
}

// Example: Data Deletion
export async function deleteAllUserData(userId: number): Promise<void> {
  // Cascade deletes handled by foreign keys
  await db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  logger.info('User data deleted per GDPR request', { userId });
}
```

---

## 3. Terms of Service Template

```markdown
# Job Search Assistant - Terms of Service

Last Updated: December 4, 2025

## 1. Acceptance of Terms
By using Job Search Assistant ("the App"), you agree to these Terms of Service.

## 2. Description of Service
The App is a local-first desktop application that:
- Monitors clipboard and active windows with user consent
- Analyzes job postings user manually views
- Provides AI-powered resume matching and optimization
- Generates cover letters using AI (with user approval)
- Tracks job applications locally

## 3. User Responsibilities
You agree to:
- Use the App only for personal, non-commercial purposes
- Not use the App to violate any third-party platform's Terms of Service
- Not attempt to scrape, crawl, or bulk-extract data from job platforms
- Manually apply to jobs (no automated submissions)
- Comply with all applicable laws and regulations

## 4. Data Privacy
- **Local Storage**: All data stored locally on your device
- **No Cloud Sync**: Data never transmitted to our servers
- **Encryption**: Sensitive data encrypted with AES-256
- **No Telemetry**: No usage analytics or tracking
- **No Advertising**: No data sold to third parties

## 5. AI Services (Optional)
If you enable AI features:
- OpenAI/Anthropic API calls are made directly from your device
- You must provide your own API keys
- You are responsible for API usage costs
- We do not store or access your API keys

## 6. Prohibited Activities
You may NOT:
- Automate job applications using this tool
- Use this tool to scrape job platforms
- Share access to this tool for commercial purposes
- Circumvent any security features of job platforms
- Use this tool to spam recruiters or employers

## 7. Disclaimers
- **No Guarantees**: We do not guarantee job placement or interviews
- **User Responsibility**: You are responsible for all content you create
- **Third-Party Platforms**: We are not affiliated with LinkedIn, Indeed, etc.
- **AI Accuracy**: AI-generated content may contain errors - review before use

## 8. Limitation of Liability
We are not liable for:
- Job application outcomes
- Data loss (backup your data!)
- Third-party platform account suspensions
- AI-generated content accuracy

## 9. Open Source License
This software is licensed under MIT License.

## 10. Changes to Terms
We reserve the right to modify these terms. Continued use constitutes acceptance.

## Contact
For questions: [Your Contact Info]
```

---

## 4. Privacy Policy Template

```markdown
# Privacy Policy

Effective Date: December 4, 2025

## Information We Collect

### Data You Provide
- Resumes and cover letters
- Job preferences (salary, location, role)
- Application tracking data
- Personal notes

### Automatically Collected Data (Local Only)
- Clipboard content (when containing job URLs)
- Active window titles (when job platforms detected)
- Application usage logs (stored locally)

## How We Use Your Data

All data is used exclusively on your local device to:
- Match jobs to your resume
- Generate optimized resumes and cover letters
- Track application progress
- Send reminders for follow-ups

## Data Sharing

**WE DO NOT SHARE YOUR DATA. PERIOD.**

- No cloud storage
- No third-party analytics
- No advertising networks
- No data brokers

### Exception: Optional AI Services
If you opt to use OpenAI or Anthropic:
- Job descriptions and resume text are sent to their APIs
- Governed by their respective privacy policies
- You control when this happens
- Disable this feature anytime

## Data Security

- **Encryption**: AES-256-GCM for sensitive fields
- **Access Control**: Only you can access your data
- **No Network Transmission**: Data stays on your device
- **Secure Deletion**: Permanently delete data anytime

## Your Rights

You can:
- Export all data (JSON, CSV)
- Delete all data
- Disable any feature
- Revoke clipboard/window access

## Data Retention

Data is stored indefinitely unless you delete it. Recommended:
- Archive old applications after 6 months
- Export data quarterly for backup

## Children's Privacy

This app is not intended for users under 16.

## Changes to Policy

We'll notify you of material changes via in-app notification.

## Contact

Email: privacy@jobsearchassistant.local
```

---

## 5. Consent Flow Implementation

### First Launch
```typescript
interface OnboardingConsent {
  clipboardMonitoring: boolean;
  windowMonitoring: boolean;
  ocrCapture: boolean;
  aiFeatures: boolean;
  dataTelemetry: boolean; // Always false, for transparency
}

export function showConsentDialog(): Promise<OnboardingConsent> {
  return new Promise((resolve) => {
    // Display modal with checkboxes
    const consent = {
      clipboardMonitoring: false,
      windowMonitoring: false,
      ocrCapture: false,
      aiFeatures: false,
      dataTelemetry: false,
    };
    
    // User must explicitly opt-in to each feature
    // "Accept All" button disabled until user reads policy
    
    resolve(consent);
  });
}
```

### UI Example
```
┌─────────────────────────────────────────────┐
│   Welcome to Job Search Assistant          │
├─────────────────────────────────────────────┤
│                                             │
│  We respect your privacy. Please review    │
│  and enable features you're comfortable     │
│  with:                                      │
│                                             │
│  ☐ Monitor clipboard for job URLs          │
│     (Detects when you copy job links)      │
│                                             │
│  ☐ Monitor active window                   │
│     (Detects job platform tabs)            │
│                                             │
│  ☐ Manual screen capture (OCR)             │
│     (Only when you click "Capture")        │
│                                             │
│  ☐ AI-powered features (optional)          │
│     (Requires OpenAI/Anthropic API key)    │
│                                             │
│  All data stays on your device.            │
│  No cloud sync. No tracking. Ever.         │
│                                             │
│  [Read Privacy Policy]  [Continue]         │
└─────────────────────────────────────────────┘
```

---

## 6. Compliance Checklist

### Pre-Launch Review
- [ ] Legal review of Terms of Service
- [ ] Privacy policy reviewed by counsel
- [ ] GDPR compliance verification
- [ ] CCPA compliance verification
- [ ] Security audit of encryption implementation
- [ ] Code review for any network calls
- [ ] Verify no telemetry/analytics code
- [ ] Test data export/deletion features
- [ ] Verify clipboard access permissions (OS-level)
- [ ] Test all consent flows

### Ongoing Compliance
- [ ] Quarterly security audits
- [ ] Annual privacy policy review
- [ ] Log all data access in audit table
- [ ] Monitor for any TOS violations reported
- [ ] Update dependencies for security patches

---

## 7. Ethical Guidelines

### Fair Use
✅ **Ethical**: Helping users organize their job search  
✅ **Ethical**: Providing writing assistance for cover letters  
✅ **Ethical**: Analyzing public job postings user has access to  
❌ **Unethical**: Bulk scraping job data  
❌ **Unethical**: Automated mass applications  
❌ **Unethical**: Misrepresenting qualifications  

### Best Practices
1. **Transparency**: Always disclose this is AI-assisted content
2. **Accuracy**: Encourage users to verify all AI-generated text
3. **Honesty**: Never suggest fabricating experience
4. **Respect**: Don't spam recruiters with mass emails

---

## 8. Liability Disclaimers

### In App (Splash Screen)
```
IMPORTANT: This tool assists with job searching but does not:
- Guarantee job offers or interviews
- Apply to jobs on your behalf
- Represent your actual qualifications (review all content!)
- Violate any platform's Terms of Service when used as intended

You are responsible for all content you submit using this tool.
```

### Cover Letter Footer (Optional)
```
[Small disclaimer at bottom of generated cover letters]
"This letter was drafted with assistance from Job Search Assistant."
```

---

## 9. Platform-Specific Considerations

### LinkedIn
- ✅ User manually copies job URL from LinkedIn
- ✅ User pastes resume text into our app
- ❌ No scraping of LinkedIn profiles
- ❌ No automated InMail sending

### Indeed
- ✅ User views job on Indeed, we detect URL
- ✅ User downloads their Indeed resume to import
- ❌ No automated form filling
- ❌ No bypassing Indeed's apply flow

### Glassdoor
- ✅ User copies job details manually
- ❌ No scraping salary data
- ❌ No automated review posting

---

## 10. License Recommendation

### MIT License (Recommended)
**Pros**:
- Maximum flexibility for users
- Commercial use allowed
- Easy to understand
- Wide adoption

**Cons**:
- No copyleft protection
- Others can create closed-source forks

### GPLv3 License (Alternative)
**Pros**:
- Ensures derivatives remain open source
- Strong copyleft protections

**Cons**:
- More restrictive
- May limit adoption

### Recommended: MIT License
```
MIT License

Copyright (c) 2025 Job Search Assistant

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

[Standard MIT License text]
```

---

## Summary

This application is designed to be **compliant, ethical, and privacy-respecting**:

1. ✅ No web scraping or automation
2. ✅ Local-first with optional AI features
3. ✅ Full GDPR/CCPA compliance
4. ✅ Transparent data practices
5. ✅ User consent for all features
6. ✅ Open source (MIT)

**Legal Status**: This tool is a productivity assistant, similar to spell checkers, grammar tools, or resume builders. It does not violate platform TOS when used as intended.
