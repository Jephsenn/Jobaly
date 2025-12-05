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
      
      // Job description - preserve formatting
      const descriptionSelectors = [
        '#jobDescriptionText',
        '.jobsearch-jobDescriptionText',
        '[data-testid="jobDescriptionText"]'
      ];
      let description = null;
      for (const selector of descriptionSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          // Use innerText to preserve line breaks
          description = elem.innerText.trim();
          
          // Parse structure if needed
          if (!description.includes('\n\n')) {
            const children = elem.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div[class*="section"]');
            if (children.length > 1) {
              description = Array.from(children)
                .map(child => child.textContent.trim())
                .filter(text => text.length > 0)
                .join('\n\n');
            }
          }
          break;
        }
      }
      
      // Salary - Enhanced
      let salary = null;
      let salaryMin = null;
      let salaryMax = null;
      let salaryPeriod = null;
      
      const salaryElem = document.querySelector('[data-testid="attribute_snippet_testid"]');
      if (salaryElem && salaryElem.textContent.includes('$')) {
        salary = salaryElem.textContent.trim();
        
        // Parse salary range
        const numbers = salary.match(/\d+[,\d]*/g);
        if (numbers && numbers.length > 0) {
          salaryMin = parseInt(numbers[0].replace(/,/g, ''));
          if (numbers.length > 1) {
            salaryMax = parseInt(numbers[1].replace(/,/g, ''));
          }
        }
        
        // Detect period
        if (/hour|hr/i.test(salary)) {
          salaryPeriod = 'hourly';
        } else {
          salaryPeriod = 'annual';
        }
      }
      
      // Work location type
      let locationType = null;
      if (description) {
        const desc = description.toLowerCase();
        if (desc.match(/\b(fully remote|100% remote|work from home|wfh|remote position)\b/)) {
          locationType = 'remote';
        } else if (desc.match(/\bhybrid\b/)) {
          locationType = 'hybrid';
        } else if (desc.match(/\b(on-site|onsite|in-office)\b/)) {
          locationType = 'onsite';
        }
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
      
      // Experience level
      let experienceYears = null;
      let educationLevel = null;
      let skills = [];
      let benefits = [];
      
      if (description) {
        // Extract years of experience
        const expMatch = description.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i);
        if (expMatch) {
          experienceYears = parseInt(expMatch[1]);
        }
        
        // Education level
        if (/\b(bachelor'?s?|BS|BA)\b/i.test(description)) {
          educationLevel = 'bachelors';
        } else if (/\b(master'?s?|MS|MA|MBA)\b/i.test(description)) {
          educationLevel = 'masters';
        } else if (/\b(phd|doctorate)\b/i.test(description)) {
          educationLevel = 'phd';
        }
        
        // Extract skills
        const commonSkills = [
          'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Ruby', 'Go',
          'React', 'Angular', 'Vue', 'Node\\.js', 'Django', 'Flask',
          'SQL', 'MySQL', 'PostgreSQL', 'MongoDB',
          'AWS', 'Azure', 'Docker', 'Kubernetes'
        ];
        
        for (const skill of commonSkills) {
          if (new RegExp(`\\b${skill}\\b`, 'i').test(description)) {
            // Remove escape characters when adding to array
            skills.push(skill.replace(/\\\\/g, ''));
          }
        }
        
        // Extract benefits
        const benefitKeywords = [
          '401k', 'Health insurance', 'Dental', 'Vision', 'PTO',
          'Stock options', 'Bonus', 'Parental leave'
        ];
        
        for (const benefit of benefitKeywords) {
          if (new RegExp(`\\b${benefit}\\b`, 'i').test(description)) {
            benefits.push(benefit);
          }
        }
      }

      return {
        id: jobId,
        url: window.location.href,
        platform: 'Indeed',
        title: title || urlParams.get('q') || 'Indeed Job',
        company: company || null,
        location: location || null,
        locationType: locationType || null,
        description: description || null,
        salary: salary || null,
        salaryMin: salaryMin || null,
        salaryMax: salaryMax || null,
        salaryPeriod: salaryPeriod || null,
        employmentType: employmentType || null,
        experienceYears: experienceYears || null,
        educationLevel: educationLevel || null,
        skills: skills.length > 0 ? skills : null,
        benefits: benefits.length > 0 ? benefits : null,
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
