/**
 * Extension Message Listener
 * This script runs in the Jobaly web app and listens for job data from the browser extension
 */

import { jobsAPI } from './database';

let isListening = false;

export function initExtensionListener() {
  if (isListening) return;
  
  console.log('🔌 Jobaly: Listening for jobs from browser extension');
  
  // Listen for messages from the browser extension via window.postMessage
  window.addEventListener('message', async (event) => {
    // Only accept messages from our extension (same origin for now)
    if (event.source !== window) return;
    
    const message = event.data;
    
    if (message.type === 'JOBALY_JOB_DETECTED') {
      console.log('📋 Job received from extension:', message.job);
      
      try {
        await handleJobFromExtension(message.job);
        console.log('✅ Job saved to database');
        
        // Notify the app to refresh
        window.dispatchEvent(new CustomEvent('jobDetected', { detail: message.job }));
      } catch (error) {
        console.error('❌ Failed to save job:', error);
      }
    }
  });
  
  isListening = true;
}

async function handleJobFromExtension(job: any) {
  // Normalize job data to match our database schema
  const normalizedJob = {
    title: job.title || 'Untitled Position',
    company_name: job.company || job.companyName || 'Unknown Company',
    url: job.url || job.jobUrl || '',
    description: job.description || '',
    location: job.location || '',
    location_type: job.locationType || job.location_type || undefined,
    salary_min: job.salaryMin || job.salary_min || undefined,
    salary_max: job.salaryMax || job.salary_max || undefined,
    salary_period: job.salaryPeriod || job.salary_period || undefined,
    employment_type: job.employmentType || job.employment_type || undefined,
    experience_years: job.experienceYears || job.experience_years || undefined,
    education_level: job.educationLevel || job.education_level || undefined,
    required_skills: job.requiredSkills || job.required_skills || undefined,
    preferred_skills: job.preferredSkills || job.preferred_skills || undefined,
    benefits: job.benefits || undefined,
    platform: job.platform || 'unknown',
    is_saved: false,
  };
  
  // Check if job already exists (by URL)
  const existingJobs = await jobsAPI.getAll();
  const duplicate = existingJobs.find(j => j.url === normalizedJob.url);
  
  if (duplicate) {
    console.log('ℹ️ Job already exists, skipping:', normalizedJob.title);
    return;
  }
  
  // Add to database
  await jobsAPI.add(normalizedJob);
}

// Check if we're running in a browser extension context
export function isExtensionAvailable() {
  return typeof window !== 'undefined' && window.postMessage !== undefined;
}
