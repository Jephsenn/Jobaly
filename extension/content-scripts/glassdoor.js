/**
 * Glassdoor Job Detector
 * Automatically extracts job data when user views a Glassdoor job posting
 */

(function() {
  'use strict';
  
  let lastJobId = null;
  let captureTimeout = null;

  function waitForJobData() {
    if (captureTimeout) {
      clearTimeout(captureTimeout);
    }

    captureTimeout = setTimeout(() => {
      const jobData = extractJobData();
      if (jobData && jobData.id !== lastJobId) {
        lastJobId = jobData.id;
        sendJobToBackground(jobData);
      }
    }, 1000);
  }

  function extractJobData() {
    try {
      // Get job ID from URL
      const jobIdMatch = window.location.href.match(/JV_(\w+)/);
      if (!jobIdMatch) return null;
      
      const jobId = jobIdMatch[1];
      
      // Job title
      const titleSelectors = [
        '[data-test="job-title"]',
        'h1[class*="JobDetails_jobTitle"]',
        '.e1tk4kwz4'
      ];
      let title = null;
      for (const selector of titleSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          title = elem.textContent.trim();
          break;
        }
      }
      
      // Company name
      const companySelectors = [
        '[data-test="employer-name"]',
        '[class*="EmployerProfile_employerName"]',
        '.e1tk4kwz5'
      ];
      let company = null;
      for (const selector of companySelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          company = elem.textContent.trim();
          break;
        }
      }
      
      // Location
      const locationSelectors = [
        '[data-test="location"]',
        '[class*="JobDetails_location"]'
      ];
      let location = null;
      for (const selector of locationSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          location = elem.textContent.trim();
          break;
        }
      }
      
      // Job description
      const descriptionSelectors = [
        '[data-test="jobDescriptionContent"]',
        '[class*="JobDetails_jobDescription"]',
        '#JobDescriptionContainer'
      ];
      let description = null;
      for (const selector of descriptionSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          description = elem.textContent.trim();
          break;
        }
      }
      
      // Salary
      let salary = null;
      const salaryElem = document.querySelector('[data-test="detailSalary"]');
      if (salaryElem) {
        salary = salaryElem.textContent.trim();
      }

      return {
        id: jobId,
        url: window.location.href,
        platform: 'Glassdoor',
        title: title || 'Glassdoor Job',
        company: company || null,
        location: location || null,
        description: description || null,
        salary: salary || null,
        detectedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Glassdoor job extraction error:', error);
      return null;
    }
  }

  function sendJobToBackground(jobData) {
    chrome.runtime.sendMessage(
      { type: 'JOB_DETECTED', job: jobData },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending job:', chrome.runtime.lastError);
        } else {
          console.log('Job sent successfully:', response);
          showCaptureNotification();
        }
      }
    );
  }

  function showCaptureNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0caa41;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = '✓ Job captured';
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // Detect navigation
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (window.location.href.includes('job-listing') || window.location.href.includes('/Job/')) {
        waitForJobData();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check
  if (window.location.href.includes('job-listing') || window.location.href.includes('/Job/')) {
    waitForJobData();
  }

  console.log('Glassdoor job detector active');
})();
