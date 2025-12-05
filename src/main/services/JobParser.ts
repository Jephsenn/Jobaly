import logger from '../utils/logger';
import type { Job } from '@shared/types';

/**
 * Job Parser Service
 * 
 * Extracts structured job data from detected jobs.
 * NOTE: This does NOT scrape websites - it only processes data the user
 * has already accessed through their browser.
 */
export class JobParser {
  
  /**
   * Parse a job URL to extract basic information
   * This uses URL structure and any clipboard text, NOT web scraping
   */
  async parseJobFromUrl(url: string, platform: string, clipboardText?: string): Promise<Partial<Job>> {
    const job: Partial<Job> = {
      url,
      platform,
      detectedAt: new Date(),
      status: 'detected' as const,
    };

    // Extract from URL structure
    const urlInfo = this.parseUrlStructure(url, platform);
    Object.assign(job, urlInfo);

    // If user copied job description text along with URL, parse it
    if (clipboardText && clipboardText !== url) {
      const textInfo = this.parseClipboardText(clipboardText);
      Object.assign(job, textInfo);
    }

    logger.info('Job parsed', { 
      platform, 
      hasTitle: !!job.title, 
      hasCompany: !!job.company,
      hasDescription: !!job.description 
    });

    return job;
  }

  /**
   * Parse URL structure for job info
   * Uses patterns in URL paths and query params
   */
  private parseUrlStructure(url: string, platform: string): Partial<Job> {
    const info: Partial<Job> = {};

    try {
      const urlObj = new URL(url);

      switch (platform) {
        case 'LinkedIn':
          info.externalId = this.extractLinkedInJobId(urlObj);
          break;
        
        case 'Indeed':
          info.externalId = urlObj.searchParams.get('jk') || undefined;
          const query = urlObj.searchParams.get('q');
          if (query) {
            info.title = decodeURIComponent(query);
          }
          break;

        case 'Glassdoor':
          const pathMatch = urlObj.pathname.match(/JV_(\w+)/);
          if (pathMatch) {
            info.externalId = pathMatch[1];
          }
          break;

        case 'ZipRecruiter':
          const zpMatch = urlObj.pathname.match(/\/job\/([^\/]+)/);
          if (zpMatch) {
            info.externalId = zpMatch[1];
          }
          break;
      }
    } catch (error) {
      logger.warn('Failed to parse URL structure', { url, error });
    }

    return info;
  }

  /**
   * Extract LinkedIn job ID from URL
   */
  private extractLinkedInJobId(urlObj: URL): string | undefined {
    // Path format: /jobs/view/1234567890/
    const pathMatch = urlObj.pathname.match(/\/jobs\/view\/(\d+)/);
    if (pathMatch) return pathMatch[1];

    // Query format: ?currentJobId=1234567890
    return urlObj.searchParams.get('currentJobId') || undefined;
  }

  /**
   * Parse job information from clipboard text
   * This handles when user copies job description text
   */
  private parseClipboardText(text: string): Partial<Job> {
    const info: Partial<Job> = {};

    // Common patterns in copied job postings
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length === 0) return info;

    // First non-empty line is usually the job title
    if (lines.length > 0 && lines[0].length < 100) {
      info.title = lines[0];
    }

    // Look for company name (often second line or "at Company")
    if (lines.length > 1) {
      const companyLine = lines[1];
      // Remove common prefixes
      const company = companyLine
        .replace(/^at\s+/i, '')
        .replace(/^by\s+/i, '')
        .trim();
      
      if (company.length < 100) {
        info.company = company;
      }
    }

    // Look for location patterns - Enhanced
    const locationPatterns = [
      /(?:^|\n)(?:Location|Based in|Office|City|Where):?\s*(.+?)(?:\n|$)/i,
      /(?:^|\n)(.+?),\s*[A-Z]{2}(?:\s+\d{5})?(?:\n|$)/,  // City, STATE format
      /(?:^|\n)(?:in|@)\s+([A-Za-z\s]+,\s*[A-Z]{2,})/,  // "in City, State"
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && !info.location) {
        info.location = match[1].trim();
        break;
      }
    }

    // Look for work location type (Remote, Hybrid, On-site)
    const locationTypePattern = /\b(Remote|Hybrid|On-site|In-office|Work from home|WFH)\b/i;
    const locationTypeMatch = text.match(locationTypePattern);
    if (locationTypeMatch) {
      const type = locationTypeMatch[1].toLowerCase();
      if (type.includes('remote') || type.includes('wfh') || type.includes('home')) {
        info.locationType = 'remote';
      } else if (type.includes('hybrid')) {
        info.locationType = 'hybrid';
      } else {
        info.locationType = 'onsite';
      }
    }

    // Look for salary patterns - Enhanced
    const salaryPatterns = [
      // $100,000 - $150,000 per year
      /\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per year|\/year|annually|\/yr|per annum|p\.a\.))?/i,
      // $50/hour or $50/hr
      /\$\d+(?:\.\d{2})?\s*(?:per hour|\/hour|\/hr|hourly)/i,
      // 100k-150k format
      /\$?\d+k\s*-\s*\$?\d+k/i,
      // Salary: 100000 format
      /(?:Salary|Compensation|Pay):?\s*\$?[\d,]+/i,
    ];
    
    for (const pattern of salaryPatterns) {
      const match = text.match(pattern);
      if (match && !info.salary) {
        info.salary = match[0];
        
        // Try to parse min/max and period
        const salaryText = match[0];
        
        // Determine if hourly or annual
        if (/hour|hr/i.test(salaryText)) {
          info.salaryPeriod = 'hourly';
        } else {
          info.salaryPeriod = 'annual';
        }
        
        // Extract numbers
        const numbers = salaryText.match(/\d+[,\d]*/g);
        if (numbers && numbers.length > 0) {
          // Parse first number (min)
          const firstNum = parseInt(numbers[0].replace(/,/g, ''));
          if (!isNaN(firstNum)) {
            // Handle 'k' notation (e.g., 100k = 100000)
            if (/k/i.test(salaryText)) {
              info.salaryMin = firstNum * 1000;
            } else {
              info.salaryMin = firstNum;
            }
          }
          
          // Parse second number (max) if range
          if (numbers.length > 1) {
            const secondNum = parseInt(numbers[1].replace(/,/g, ''));
            if (!isNaN(secondNum)) {
              if (/k/i.test(salaryText)) {
                info.salaryMax = secondNum * 1000;
              } else {
                info.salaryMax = secondNum;
              }
            }
          }
        }
        
        info.salaryCurrency = 'USD'; // Default to USD
        break;
      }
    }

    // Look for employment type (Full-time, Part-time, Contract, etc.)
    const employmentTypePattern = /\b(Full[- ]time|Part[- ]time|Contract|Temporary|Freelance|Internship|Per Diem)\b/i;
    const employmentTypeMatch = text.match(employmentTypePattern);
    if (employmentTypeMatch) {
      const empType = employmentTypeMatch[1].replace(/[- ]/g, '-');
      // Store in description or a custom field
      if (!info.description) {
        info.description = text;
      }
    }

    // Look for experience level
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i,
      /\b(Entry[- ]level|Junior|Mid[- ]level|Senior|Lead|Principal|Staff)\b/i,
    ];
    
    for (const pattern of experiencePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern === experiencePatterns[0]) {
          // Years of experience
          const years = parseInt(match[1]);
          if (!isNaN(years)) {
            info.requiredExperienceYears = years;
          }
        }
        // Seniority level could be stored in description or tags
        break;
      }
    }

    // Look for benefits
    const benefitsPatterns = [
      /(?:Benefits|Perks|We offer):(.+?)(?:\n\n|Requirements|Qualifications|$)/is,
      /\b(401k|Health insurance|Dental|Vision|PTO|Paid time off|Stock options|Equity|Bonus|Gym|Free lunch|Remote work|Flexible hours|Parental leave)\b/gi,
    ];
    
    const benefitsMatches: string[] = [];
    for (const pattern of benefitsPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          benefitsMatches.push(match[1].trim());
        } else if (match[0]) {
          benefitsMatches.push(match[0]);
        }
      }
    }
    
    if (benefitsMatches.length > 0) {
      info.benefits = Array.from(new Set(benefitsMatches));
    }

    // Look for education requirements
    const educationPattern = /\b(Bachelor'?s?|Master'?s?|PhD|Doctorate|Associate)(?:\s+degree)?(?:\s+in\s+[\w\s]+)?/i;
    const educationMatch = text.match(educationPattern);
    if (educationMatch) {
      const eduText = educationMatch[0].toLowerCase();
      if (eduText.includes('bachelor')) {
        info.educationLevel = 'bachelors';
      } else if (eduText.includes('master')) {
        info.educationLevel = 'masters';
      } else if (eduText.includes('phd') || eduText.includes('doctorate')) {
        info.educationLevel = 'phd';
      }
    }

    // Extract skills using existing method
    if (text.length > 50) {
      const skills = this.extractSkills(text);
      if (skills.length > 0) {
        info.requiredSkills = skills;
      }
    }

    // Store full description if it's substantial
    if (text.length > 100 && text.length < 50000) {
      info.description = text;
    }

    return info;
  }

  /**
   * Extract skills from job description text
   */
  extractSkills(description: string): string[] {
    const skills: Set<string> = new Set();

    // Common technical skills to look for
    const skillPatterns = [
      // Languages
      /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Ruby|Go|Rust|Swift|Kotlin|PHP)\b/gi,
      // Frameworks
      /\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|Laravel|Rails)\b/gi,
      // Databases
      /\b(SQL|MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|DynamoDB)\b/gi,
      // Cloud
      /\b(AWS|Azure|GCP|Google Cloud|Docker|Kubernetes|Terraform)\b/gi,
      // Tools
      /\b(Git|GitHub|GitLab|Jira|Jenkins|CI\/CD|Agile|Scrum)\b/gi,
    ];

    for (const pattern of skillPatterns) {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        skills.add(match[0]);
      }
    }

    return Array.from(skills);
  }

  /**
   * Extract requirements from job description
   */
  extractRequirements(description: string): string[] {
    const requirements: string[] = [];

    // Look for common requirement section headers
    const sections = description.split(/(?:Requirements?|Qualifications?|What (?:we're looking for|you'll need)|You have):/i);
    
    if (sections.length < 2) return requirements;

    // Get the section after the header
    const reqSection = sections[1].split(/(?:Responsibilities|About|Benefits|We offer):/i)[0];

    // Extract bullet points or numbered items
    const bulletPattern = /(?:^|\n)\s*(?:[•\-\*]|\d+\.)\s*(.+?)(?=\n|$)/g;
    const bullets = reqSection.matchAll(bulletPattern);

    for (const bullet of bullets) {
      const req = bullet[1].trim();
      if (req.length > 10 && req.length < 200) {
        requirements.push(req);
      }
    }

    return requirements;
  }
}

// Singleton instance
let parser: JobParser | null = null;

export function getJobParser(): JobParser {
  if (!parser) {
    parser = new JobParser();
  }
  return parser;
}
