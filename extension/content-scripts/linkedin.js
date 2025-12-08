/**
 * LinkedIn Job Detector
 * Automatically extracts job data when user views a LinkedIn job posting
 */

// Prevent multiple instances of this script
if (window.jobalyLinkedInDetectorLoaded) {
  console.log('⚠️ LinkedIn detector already loaded, skipping duplicate instance');
} else {
  window.jobalyLinkedInDetectorLoaded = true;

(function() {
  'use strict';
  
  console.log('🚀 Initializing LinkedIn job detector...');
  
  let lastJobId = null;
  let captureTimeout = null;
  let lastCapturedUrl = null; // Track last URL we captured from
  let isProcessing = false; // Prevent concurrent processing
  let captureCount = 0; // Track how many jobs we've captured

  // Wait for page to fully load
  function waitForJobData() {
    const currentUrl = window.location.href;
    const caller = new Error().stack.split('\n')[2].trim(); // Get caller info
    
    console.log('🔔 waitForJobData() called');
    console.log('   URL:', currentUrl);
    console.log('   Called from:', caller);
    console.log('   lastCapturedUrl:', lastCapturedUrl);
    console.log('   isProcessing:', isProcessing);
    
    // Check if we've already captured from this exact URL
    if (lastCapturedUrl === currentUrl) {
      console.log('⏭️ SKIP: Already captured job from this URL');
      return;
    }

    // Check if we're already processing this URL
    if (isProcessing) {
      console.log('⏭️ SKIP: Already processing, skipping duplicate trigger');
      return;
    }

    // Clear any pending timeout
    if (captureTimeout) {
      console.log('⚠️ Clearing existing timeout');
      clearTimeout(captureTimeout);
    }

    console.log('⏳ Setting 2-second timer for job data extraction...');
    isProcessing = true; // Mark as processing

    // Wait 2 seconds for dynamic content to load (increased from 1 second)
    captureTimeout = setTimeout(() => {
      console.log('⏰ Timer fired! Attempting to extract job data...');
      const jobData = extractJobData();
      if (jobData && jobData.id !== lastJobId) {
        lastJobId = jobData.id;
        lastCapturedUrl = currentUrl; // Remember this URL
        console.log('✅ Job data extracted successfully');
        console.log('   Title:', jobData.title);
        console.log('   Company:', jobData.company);
        console.log('   Description length:', jobData.description?.length || 0);
        sendJobToBackground(jobData);
      } else if (!jobData) {
        console.log('❌ Failed to extract job data');
      } else {
        console.log('⏭️ Job already captured (ID match):', jobData.id);
      }
      
      // Reset processing flag after completion
      isProcessing = false;
      console.log('🏁 Processing complete, isProcessing reset to false');
    }, 2000);
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
      
      // Check if main content containers exist - if not, content hasn't loaded yet
      const mainContainers = [
        '.jobs-details',
        '.job-details',
        '[class*="jobs-unified-top-card"]',
        '[class*="job-details-jobs-unified-top-card"]'
      ];
      
      let hasMainContent = false;
      for (const selector of mainContainers) {
        if (document.querySelector(selector)) {
          hasMainContent = true;
          console.log('LinkedIn: Found main content container:', selector);
          break;
        }
      }
      
      if (!hasMainContent) {
        console.log('⚠️ LinkedIn: Main content not loaded yet, will retry');
        return null;
      }
      
      // Debug: Log all job insight elements to see what LinkedIn provides
      // Try multiple possible selectors for the pill badges
      const insightSelectors = [
        '.jobs-unified-top-card__job-insight',
        'li.jobs-unified-top-card__job-insight-view-model-secondary',
        '.job-details-jobs-unified-top-card__job-insight',
        // Sometimes they're in spans with specific classes
        'span.ui-label',
        '.artdeco-pill',
        // Or in the top card criteria area
        '[class*="job-details-jobs-unified-top-card"]',
      ];
      
      let allInsights = [];
      for (const selector of insightSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          allInsights = [...allInsights, ...Array.from(elements)];
        }
      }
      
      // Remove duplicates
      allInsights = [...new Set(allInsights)];
      
      console.log('LinkedIn: Found', allInsights.length, 'job insight elements:');
      allInsights.forEach((insight, index) => {
        console.log(`  [${index}]:`, insight.textContent.trim());
      });
      
      // Job title - multiple possible selectors with more comprehensive patterns
      const titleSelectors = [
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title',
        'h1.t-24',
        '.jobs-details-top-card__job-title',
        'h1[class*="job-title"]',
        'h2[class*="job-title"]',
        '[class*="jobs-unified-top-card"] h1',
        '[class*="job-details"] h1',
        '.job-details h1',
        'h1.jobs-details-top-card__job-title a',
        // Generic fallbacks
        'h1[class*="t-"]', // LinkedIn uses utility classes like t-24, t-20
        'main h1',
        '[role="main"] h1'
      ];
      let title = null;
      for (const selector of titleSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.textContent.trim().length > 0 && elem.textContent.trim().length < 200) {
          title = elem.textContent.trim();
          console.log('LinkedIn: Found title with selector', selector, ':', title);
          break;
        }
      }
      
      if (!title) {
        console.log('LinkedIn: No title found, tried selectors:', titleSelectors);
        console.log('LinkedIn: Available h1 elements:');
        document.querySelectorAll('h1').forEach(h1 => {
          console.log('  -', h1.textContent.trim().substring(0, 100), '(classes:', h1.className, ')');
        });
      }
      
      // Company name
      const companySelectors = [
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__company-name',
        '.jobs-details-top-card__company-name a',
        'a[class*="company-name"]',
        '[class*="jobs-unified-top-card"] a[href*="/company/"]',
        '[class*="job-details"] a[href*="/company/"]',
        '.jobs-company a',
        // Generic fallbacks
        '[class*="top-card"] a.ember-view',
        '.job-details a.ember-view[href*="/company/"]'
      ];
      let company = null;
      for (const selector of companySelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.textContent.trim().length > 0) {
          company = elem.textContent.trim();
          console.log('LinkedIn: Found company with selector', selector, ':', company);
          break;
        }
      }
      
      if (!company) {
        console.log('LinkedIn: No company found, tried selectors:', companySelectors);
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
      
      // Job description - preserve formatting with line breaks
      const descriptionSelectors = [
        '.jobs-description-content__text',
        '.jobs-description__content',
        '#job-details',
        '[class*="jobs-description"]',
        '.jobs-box__html-content',
        '[class*="job-details"] article',
        'article.jobs-description',
        // Look for content in iframes (LinkedIn sometimes uses these)
        'iframe[title*="description"]',
        // Generic fallback
        '[class*="description-content"]'
      ];
      let description = null;
      for (const selector of descriptionSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.textContent.trim().length > 50) {
          // Use innerText instead of textContent to preserve line breaks
          description = elem.innerText.trim();
          
          // Also try to add breaks between major sections
          // If innerText didn't preserve breaks well, parse the HTML structure
          if (!description.includes('\n\n')) {
            const children = elem.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div.section, strong');
            if (children.length > 1) {
              description = Array.from(children)
                .map(child => child.textContent.trim())
                .filter(text => text.length > 0)
                .join('\n\n');
            }
          }
          console.log('LinkedIn: Found description with selector', selector, '(length:', description.length, ')');
          break;
        }
      }
      
      if (!description) {
        console.log('LinkedIn: No description found, tried selectors:', descriptionSelectors);
      }
      
      // Salary (if available) - Check all insight elements we found
      let salary = null;
      let salaryMin = null;
      let salaryMax = null;
      let salaryPeriod = null;
      
      // Check the insight elements we already collected
      for (const elem of allInsights) {
        const text = elem.textContent.trim();
        // Only match if it starts with $ or contains salary-like pattern
        if (text.match(/^\$/) || text.match(/\$\d+[kK]?/)) {
          console.log('LinkedIn: Found salary in insight:', text);
          salary = text;
          
          // Detect period FIRST before parsing numbers
          // This prevents confusion when description mentions both hourly and annual
          if (/\$.*?\/hr|per hour|hourly/i.test(text)) {
            salaryPeriod = 'hourly';
          } else if (/\$.*?\/yr|per year|annual|yearly/i.test(text)) {
            salaryPeriod = 'annual';
          }
          
          // Parse salary range - handle formats like:
          // $55K/yr - $60K/yr
          // $97.6k - 100k (decimals with K)
          // $100,000 - $150,000
          // $65/hr - $75/hr
          // $60.00/hr-$65.00/hr
          
          // Improved regex to capture K notation separately and handle decimals
          const rangeMatch = text.match(/\$(\d+(?:[.,]\d+)?(?:,\d{3})*)([kK])?(?:\/(?:hr|yr))?\s*[-–]\s*\$?(\d+(?:[.,]\d+)?(?:,\d{3})*)([kK])?(?:\/(?:hr|yr))?/i);
          
          if (rangeMatch) {
            // Range found
            let min = rangeMatch[1].replace(/,/g, '');
            let max = rangeMatch[3].replace(/,/g, '');
            const minHasK = rangeMatch[2]; // K notation for first number
            const maxHasK = rangeMatch[4]; // K notation for second number
            
            // Parse as floats to handle decimals like $60.00 or $97.6k
            min = parseFloat(min);
            max = parseFloat(max);
            
            // Apply K multiplier if present (separately for each number)
            if (minHasK) {
              min = min * 1000;
            }
            if (maxHasK) {
              max = max * 1000;
            }
            
            // Ensure min is actually the minimum (sometimes they're backwards)
            salaryMin = Math.min(min, max);
            salaryMax = Math.max(min, max);
            
            console.log('LinkedIn: Parsed salary range:', salaryMin, '-', salaryMax);
          } else {
            // Try single value - handle decimals and /hr or /yr suffixes
            const singleMatch = text.match(/\$(\d+(?:[.,]\d+)?(?:,\d{3})*)([kK])?/i);
            if (singleMatch) {
              const val = singleMatch[1].replace(/,/g, '');
              const hasK = singleMatch[2];
              const numVal = parseFloat(val);
              salaryMin = hasK ? numVal * 1000 : numVal;
              console.log('LinkedIn: Parsed single salary:', salaryMin);
            }
          }
          break;
        }
      }
      
      if (!salary) {
        console.log('LinkedIn: No salary found with any selector');
        
        // Try to extract from description as fallback
        if (description) {
          const salaryPatterns = [
            /\$(\d+[,\d]*)[kK]?\s*-\s*\$?(\d+[,\d]*)[kK]?/,  // $100k - $150k or $100,000 - $150,000
            /\$(\d+[,\d]*)\s*-\s*\$?(\d+[,\d]*)\s*(?:per\s*year|annually|\/year|\/yr)/i,  // $100,000 - 150,000 per year
            /\$(\d+[,\d]*)\s*(?:per\s*hour|hourly|\/hour|\/hr)/i  // $50 per hour
          ];
          
          for (const pattern of salaryPatterns) {
            const match = description.match(pattern);
            if (match) {
              if (match.length === 3) {
                // Range found
                let min = match[1].replace(/,/g, '');
                let max = match[2].replace(/,/g, '');
                
                // Handle 'k' notation (100k = 100000)
                if (match[0].includes('k') || match[0].includes('K')) {
                  min = min + '000';
                  max = max + '000';
                }
                
                salaryMin = parseInt(min);
                salaryMax = parseInt(max);
                salary = `$${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}`;
              } else if (match.length === 2) {
                // Single value found
                let val = match[1].replace(/,/g, '');
                if (match[0].includes('k') || match[0].includes('K')) {
                  val = val + '000';
                }
                salaryMin = parseInt(val);
                salary = `$${salaryMin.toLocaleString()}`;
              }
              
              // Detect period
              if (/hour|hr/i.test(match[0])) {
                salaryPeriod = 'hourly';
              } else {
                salaryPeriod = 'annual';
              }
              
              console.log('LinkedIn: Extracted salary from description:', salary);
              break;
            }
          }
        }
      }
      
      // Work location type (Remote, Hybrid, On-site) - check insight elements
      let locationType = null;
      for (const elem of allInsights) {
        const text = elem.textContent.trim().toLowerCase();
        if (text === 'remote' || text.includes('remote') && !text.includes('site')) {
          locationType = 'remote';
          console.log('LinkedIn: Found location type:', locationType);
          break;
        } else if (text === 'hybrid') {
          locationType = 'hybrid';
          console.log('LinkedIn: Found location type:', locationType);
          break;
        } else if (text === 'on-site' || text === 'onsite') {
          locationType = 'onsite';
          console.log('LinkedIn: Found location type:', locationType);
          break;
        }
      }
      
      // If not found in insights, check description
      if (!locationType && description) {
        const desc = description.toLowerCase();
        if (desc.match(/\b(fully remote|100% remote|work from home|wfh)\b/)) {
          locationType = 'remote';
        } else if (desc.match(/\bhybrid\b/)) {
          locationType = 'hybrid';
        }
      }
      
      // Employment type (Full-time, Contract, etc.) - check insight elements
      let employmentType = null;
      for (const elem of allInsights) {
        const text = elem.textContent.trim().toLowerCase();
        if (text === 'full-time' || text === 'fulltime') {
          employmentType = 'Full-time';
          console.log('LinkedIn: Found employment type:', employmentType);
          break;
        } else if (text === 'part-time' || text === 'parttime') {
          employmentType = 'Part-time';
          console.log('LinkedIn: Found employment type:', employmentType);
          break;
        } else if (text === 'contract') {
          employmentType = 'Contract';
          console.log('LinkedIn: Found employment type:', employmentType);
          break;
        } else if (text === 'internship') {
          employmentType = 'Internship';
          console.log('LinkedIn: Found employment type:', employmentType);
          break;
        }
      }
      
      // Seniority level / Experience
      let seniorityLevel = null;
      let experienceYears = null;
      
      // Check job insights for seniority level
      const seniorityElements = document.querySelectorAll('.job-details-jobs-unified-top-card__job-insight, .jobs-unified-top-card__job-insight');
      for (const elem of seniorityElements) {
        const text = elem.textContent.trim();
        if (text.match(/entry level|associate|mid-senior|director|executive/i)) {
          seniorityLevel = text;
          console.log('LinkedIn: Found seniority level:', seniorityLevel);
          break;
        }
      }
      
      // Extract years of experience from description
      if (description) {
        const expMatch = description.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i);
        if (expMatch) {
          experienceYears = parseInt(expMatch[1]);
          console.log('LinkedIn: Found experience years:', experienceYears);
        }
      }
      
      // Extract skills from description
      let skills = [];
      if (description) {
        const commonSkills = [
          'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Ruby', 'Go', 'Rust', 'Swift',
          'React', 'Angular', 'Vue', 'Node\\.js', 'Django', 'Flask', 'Spring',
          'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
          'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
          'Git', 'Agile', 'Scrum'
        ];
        
        for (const skill of commonSkills) {
          const regex = new RegExp(`\\b${skill}\\b`, 'i');
          if (regex.test(description)) {
            // Remove escape characters when adding to array
            skills.push(skill.replace(/\\\\/g, ''));
          }
        }
      }
      
      // Extract benefits from description
      let benefits = [];
      if (description) {
        const benefitKeywords = [
          '401k', 'Health insurance', 'Dental', 'Vision', 'PTO', 
          'Paid time off', 'Stock options', 'Equity', 'Bonus',
          'Parental leave', 'Flexible hours', 'Remote work'
        ];
        
        for (const benefit of benefitKeywords) {
          const regex = new RegExp(`\\b${benefit}\\b`, 'i');
          if (regex.test(description)) {
            benefits.push(benefit);
          }
        }
      }
      
      // Education level
      let educationLevel = null;
      if (description) {
        if (/\b(bachelor'?s?|BS|BA)\b/i.test(description)) {
          educationLevel = 'bachelors';
        } else if (/\b(master'?s?|MS|MA|MBA)\b/i.test(description)) {
          educationLevel = 'masters';
        } else if (/\b(phd|doctorate)\b/i.test(description)) {
          educationLevel = 'phd';
        }
      }

      // Validate extracted data quality
      const hasGoodData = title && title !== `LinkedIn Job ${jobId}` && company && description && description.length > 100;
      
      if (!hasGoodData) {
        console.warn('⚠️ LinkedIn: Extracted data quality is poor:');
        console.warn('  - Title:', title ? '✓' : '✗');
        console.warn('  - Company:', company ? '✓' : '✗');
        console.warn('  - Description:', description ? (description.length > 100 ? '✓' : `Too short (${description.length} chars)`) : '✗');
        console.warn('  This may result in inaccurate match scores.');
      }
      
      return {
        id: jobId,
        url: window.location.href,
        platform: 'LinkedIn',
        title: title || `LinkedIn Job ${jobId}`,
        company: company || null,
        location: location || null,
        locationType: locationType || null,
        description: description || null,
        salary: salary || null,
        salaryMin: salaryMin || null,
        salaryMax: salaryMax || null,
        salaryPeriod: salaryPeriod || null,
        employmentType: employmentType || null,
        seniorityLevel: seniorityLevel || null,
        experienceYears: experienceYears || null,
        educationLevel: educationLevel || null,
        skills: skills.length > 0 ? skills : null,
        benefits: benefits.length > 0 ? benefits : null,
        detectedAt: new Date().toISOString(),
        // Add data quality flag
        dataQuality: hasGoodData ? 'good' : 'poor'
      };
      
    } catch (error) {
      console.error('LinkedIn job extraction error:', error);
      return null;
    }
  }

  // Send job data to background script
  function sendJobToBackground(jobData) {
    captureCount++;
    const timestamp = new Date().toISOString();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📤 SENDING JOB #${captureCount} at ${timestamp}`);
    console.log('   Job ID:', jobData.id);
    console.log('   Title:', jobData.title);
    console.log('   URL:', window.location.href);
    console.log('   lastJobId:', lastJobId);
    console.log('   lastCapturedUrl:', lastCapturedUrl);
    console.log('   isProcessing:', isProcessing);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    chrome.runtime.sendMessage(
      { type: 'JOB_DETECTED', job: jobData },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('LinkedIn: Error sending job:', chrome.runtime.lastError);
        } else {
          console.log('✅ Job sent successfully:', response);
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
  let urlChangeTimeout = null;
  
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('LinkedIn: URL changed to:', lastUrl);
      
      // Reset processing flag when URL changes
      isProcessing = false;
      
      // Debounce URL changes to prevent duplicate captures
      if (urlChangeTimeout) {
        clearTimeout(urlChangeTimeout);
      }
      
      urlChangeTimeout = setTimeout(() => {
        // Check if it's a job page by URL or by presence of job elements
        const isJobPage = window.location.href.includes('/jobs/view/') || 
                          window.location.href.includes('currentJobId=') ||
                          document.querySelector('.jobs-details') !== null ||
                          document.querySelector('[data-job-id]') !== null;
        
        if (isJobPage) {
          console.log('LinkedIn: Detected as job page');
          waitForJobData();
        }
      }, 300); // Wait 300ms for URL to stabilize
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

} // End if (!window.jobalyLinkedInDetectorLoaded)
