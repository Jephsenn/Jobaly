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

    // Look for location patterns
    const locationPattern = /(?:^|\n)(?:Location|Based in|Office):?\s*(.+?)(?:\n|$)/i;
    const locationMatch = text.match(locationPattern);
    if (locationMatch) {
      info.location = locationMatch[1].trim();
    }

    // Look for salary patterns
    const salaryPattern = /\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per year|\/year|annually|\/yr))?/i;
    const salaryMatch = text.match(salaryPattern);
    if (salaryMatch) {
      info.salary = salaryMatch[0];
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
