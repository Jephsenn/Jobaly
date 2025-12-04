/**
 * LinkedIn Job Detector
 * Automatically extracts job data when user views a LinkedIn job posting
 */

(function() {
  'use strict';
  
  let lastJobId = null;
  let captureTimeout = null;

  // Wait for page to fully load
  function waitForJobData() {
    // Clear any pending timeout
    if (captureTimeout) {
      clearTimeout(captureTimeout);
    }

    console.log('LinkedIn: Waiting for job data to load...');

    // Wait 1 second for dynamic content to load
    captureTimeout = setTimeout(() => {
      console.log('LinkedIn: Attempting to extract job data...');
      const jobData = extractJobData();
      if (jobData && jobData.id !== lastJobId) {
        lastJobId = jobData.id;
        console.log('LinkedIn: Job data extracted successfully:', jobData);
        sendJobToBackground(jobData);
      } else if (!jobData) {
        console.log('LinkedIn: Failed to extract job data');
      } else {
        console.log('LinkedIn: Job already captured:', jobData.id);
      }
    }, 1000);
  }

  // Extract job data from LinkedIn page
  function extractJobData() {
    try {
      // Get job ID from URL - check both formats
      let jobId = null;
      
      // Format 1: /jobs/view/1234567890
      const viewMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
      if (viewMatch) {
        jobId = viewMatch[1];
      }
      
      // Format 2: ?currentJobId=1234567890
      if (!jobId) {
        const urlParams = new URLSearchParams(window.location.search);
        jobId = urlParams.get('currentJobId');
      }
      
      // Format 3: Check for data-job-id attribute
      if (!jobId) {
        const jobElement = document.querySelector('[data-job-id]');
        if (jobElement) {
          jobId = jobElement.getAttribute('data-job-id');
        }
      }
      
      if (!jobId) {
        console.log('LinkedIn: No job ID found in URL:', window.location.href);
        return null;
      }
      
      console.log('LinkedIn: Found job ID:', jobId);
      
      // Job title - multiple possible selectors
      const titleSelectors = [
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title',
        'h1.t-24',
        '.jobs-details-top-card__job-title',
        'h1[class*="job-title"]',
        'h2[class*="job-title"]'
      ];
      let title = null;
      for (const selector of titleSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          title = elem.textContent.trim();
          console.log('LinkedIn: Found title with selector', selector, ':', title);
          break;
        }
      }
      
      if (!title) {
        console.log('LinkedIn: No title found, tried selectors:', titleSelectors);
      }
      
      // Company name
      const companySelectors = [
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__company-name',
        '.jobs-details-top-card__company-name a',
        'a[class*="company-name"]'
      ];
      let company = null;
      for (const selector of companySelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          company = elem.textContent.trim();
          console.log('LinkedIn: Found company:', company);
          break;
        }
      }
      
      // Location
      const locationSelectors = [
        '.job-details-jobs-unified-top-card__bullet',
        '.jobs-unified-top-card__bullet',
        '.jobs-details-top-card__location'
      ];
      let location = null;
      for (const selector of locationSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.textContent.includes(',')) {
          location = elem.textContent.trim();
          break;
        }
      }
      
      // Job description
      const descriptionSelectors = [
        '.jobs-description-content__text',
        '.jobs-description__content',
        '#job-details'
      ];
      let description = null;
      for (const selector of descriptionSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          description = elem.textContent.trim();
          break;
        }
      }
      
      // Salary (if available)
      let salary = null;
      const salaryElem = document.querySelector('.job-details-jobs-unified-top-card__job-insight-view-model-secondary');
      if (salaryElem) {
        const salaryText = salaryElem.textContent;
        if (salaryText.includes('$')) {
          salary = salaryText.trim();
        }
      }
      
      // Employment type (Full-time, Contract, etc.)
      let employmentType = null;
      const insightElements = document.querySelectorAll('.job-details-jobs-unified-top-card__job-insight');
      for (const elem of insightElements) {
        const text = elem.textContent.trim();
        if (text.match(/full-time|part-time|contract|temporary|internship/i)) {
          employmentType = text;
          break;
        }
      }
      
      // Seniority level
      let seniorityLevel = null;
      for (const elem of insightElements) {
        const text = elem.textContent.trim();
        if (text.match(/entry level|associate|mid-senior|director|executive/i)) {
          seniorityLevel = text;
          break;
        }
      }

      return {
        id: jobId,
        url: window.location.href,
        platform: 'LinkedIn',
        title: title || `LinkedIn Job ${jobId}`,
        company: company || null,
        location: location || null,
        description: description || null,
        salary: salary || null,
        employmentType: employmentType || null,
        seniorityLevel: seniorityLevel || null,
        detectedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('LinkedIn job extraction error:', error);
      return null;
    }
  }

  // Send job data to background script
  function sendJobToBackground(jobData) {
    console.log('LinkedIn: Sending job to background:', jobData.title);
    
    chrome.runtime.sendMessage(
      { type: 'JOB_DETECTED', job: jobData },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('LinkedIn: Error sending job:', chrome.runtime.lastError);
        } else {
          console.log('LinkedIn: Job sent successfully:', response);
          showCaptureNotification();
        }
      }
    );
  }

  // Show brief notification that job was captured
  function showCaptureNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0a66c2;
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
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 2 seconds
    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // Detect when user navigates to a new job
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('LinkedIn: URL changed to:', lastUrl);
      
      // Check if it's a job page by URL or by presence of job elements
      const isJobPage = window.location.href.includes('/jobs/view/') || 
                        window.location.href.includes('currentJobId=') ||
                        document.querySelector('.jobs-details') !== null ||
                        document.querySelector('[data-job-id]') !== null;
      
      if (isJobPage) {
        console.log('LinkedIn: Detected as job page');
        waitForJobData();
      }
    }
  });

  // Start observing
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check - check URL and DOM
  const isJobPage = window.location.href.includes('/jobs/view/') || 
                    window.location.href.includes('currentJobId=') ||
                    document.querySelector('.jobs-details') !== null ||
                    document.querySelector('[data-job-id]') !== null;
                    
  if (isJobPage) {
    console.log('LinkedIn: Initial page load detected as job page');
    waitForJobData();
  } else {
    console.log('LinkedIn: Not a job page. Current URL:', window.location.href);
  }

  console.log('✅ LinkedIn job detector active');
})();
