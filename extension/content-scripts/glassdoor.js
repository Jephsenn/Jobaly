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
      
      // Job description - preserve formatting
      const descriptionSelectors = [
        '[data-test="jobDescriptionContent"]',
        '[class*="JobDetails_jobDescription"]',
        '#JobDescriptionContainer'
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
      
      // Salary
      let salary = null;
      let salaryMin = null;
      let salaryMax = null;
      let salaryPeriod = null;
      const salaryElem = document.querySelector('[data-test="detailSalary"]');
      if (salaryElem) {
        salary = salaryElem.textContent.trim();
        // Extract salary min/max
        const numbers = salary.match(/\d+[,\d]*/g);
        if (numbers && numbers.length >= 2) {
          salaryMin = parseInt(numbers[0].replace(/,/g, ''));
          salaryMax = parseInt(numbers[1].replace(/,/g, ''));
        } else if (numbers && numbers.length === 1) {
          salaryMin = parseInt(numbers[0].replace(/,/g, ''));
        }
        // Detect period (hourly vs annual)
        if (salary.match(/hour|hr|\/hr/i)) {
          salaryPeriod = 'hourly';
        } else if (salary.match(/year|annual|\/yr/i) || numbers) {
          salaryPeriod = 'annual';
        }
      }

      // Location Type (Remote/Hybrid/Onsite)
      let locationType = null;
      const fullText = (description || '') + ' ' + (location || '');
      if (fullText.match(/\b(remote|work from home|wfh)\b/i)) {
        locationType = 'Remote';
      } else if (fullText.match(/\b(hybrid|flexible)\b/i)) {
        locationType = 'Hybrid';
      } else if (location && !fullText.match(/remote|hybrid/i)) {
        locationType = 'On-site';
      }

      // Employment Type
      let employmentType = null;
      if (fullText.match(/\b(full-time|full time|fulltime)\b/i)) {
        employmentType = 'Full-time';
      } else if (fullText.match(/\b(part-time|part time|parttime)\b/i)) {
        employmentType = 'Part-time';
      } else if (fullText.match(/\b(contract|contractor)\b/i)) {
        employmentType = 'Contract';
      }

      // Experience Years
      let experienceYears = null;
      const expMatch = fullText.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i);
      if (expMatch) {
        experienceYears = parseInt(expMatch[1]);
      }

      // Education Level
      let educationLevel = null;
      if (fullText.match(/\b(phd|ph\.d|doctorate)\b/i)) {
        educationLevel = "PhD";
      } else if (fullText.match(/\b(master'?s?|ms|m\.s|mba)\b/i)) {
        educationLevel = "Master's";
      } else if (fullText.match(/\b(bachelor'?s?|bs|b\.s|ba|b\.a)\b/i)) {
        educationLevel = "Bachelor's";
      } else if (fullText.match(/\b(associate'?s?|as|a\.s)\b/i)) {
        educationLevel = "Associate's";
      }

      // Skills extraction
      const commonSkills = [
        'JavaScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go',
        'React', 'Angular', 'Vue', 'Node\\.js', 'Django', 'Flask', 'Spring', '\\.NET',
        'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'DynamoDB',
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'Jenkins',
        'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch'
      ];
      const skills = [];
      for (const skill of commonSkills) {
        const regex = new RegExp(`\\b${skill}\\b`, 'i');
        if (regex.test(fullText)) {
          // Remove escape characters when adding to array
          skills.push(skill.replace(/\\\\/g, ''));
        }
      }

      // Benefits extraction
      const commonBenefits = [
        '401k', 'health insurance', 'dental', 'vision', 'pto', 'paid time off',
        'stock options', 'equity', 'bonus', 'flexible hours', 'wellness', 'tuition'
      ];
      const benefits = [];
      for (const benefit of commonBenefits) {
        const regex = new RegExp(`\\b${benefit}\\b`, 'i');
        if (regex.test(fullText)) {
          benefits.push(benefit);
        }
      }

      return {
        id: jobId,
        url: window.location.href,
        platform: 'Glassdoor',
        title: title || 'Glassdoor Job',
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
