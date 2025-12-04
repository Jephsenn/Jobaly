/**
 * Indeed Job Detector
 * Automatically extracts job data when user views an Indeed job posting
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
      const urlParams = new URLSearchParams(window.location.search);
      const jobId = urlParams.get('jk') || urlParams.get('vjk');
      if (!jobId) return null;
      
      // Job title
      const titleSelectors = [
        'h1.jobsearch-JobInfoHeader-title',
        'h2.jobsearch-JobInfoHeader-title',
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        '.jobsearch-JobComponent-title'
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
        '[data-testid="inlineHeader-companyName"]',
        '[data-company-name="true"]',
        '.jobsearch-InlineCompanyRating-companyHeader a',
        '.jobsearch-CompanyInfoContainer a'
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
        '[data-testid="inlineHeader-companyLocation"]',
        '.jobsearch-JobInfoHeader-subtitle div',
        '[data-testid="job-location"]'
      ];
      let location = null;
      for (const selector of locationSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.textContent.trim()) {
          location = elem.textContent.trim();
          break;
        }
      }
      
      // Job description
      const descriptionSelectors = [
        '#jobDescriptionText',
        '.jobsearch-jobDescriptionText',
        '[data-testid="jobDescriptionText"]'
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
      const salaryElem = document.querySelector('[data-testid="attribute_snippet_testid"]');
      if (salaryElem && salaryElem.textContent.includes('$')) {
        salary = salaryElem.textContent.trim();
      }
      
      // Employment type
      let employmentType = null;
      const metadataElements = document.querySelectorAll('.jobsearch-JobMetadataHeader-item');
      for (const elem of metadataElements) {
        const text = elem.textContent.trim();
        if (text.match(/full-time|part-time|contract|temporary|internship/i)) {
          employmentType = text;
          break;
        }
      }

      return {
        id: jobId,
        url: window.location.href,
        platform: 'Indeed',
        title: title || urlParams.get('q') || 'Indeed Job',
        company: company || null,
        location: location || null,
        description: description || null,
        salary: salary || null,
        employmentType: employmentType || null,
        detectedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Indeed job extraction error:', error);
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
      background: #2164f3;
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
      if (window.location.href.includes('viewjob') || window.location.href.includes('rc/clk')) {
        waitForJobData();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check
  if (window.location.href.includes('viewjob') || window.location.href.includes('rc/clk')) {
    waitForJobData();
  }

  console.log('Indeed job detector active');
})();
