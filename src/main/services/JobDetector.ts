import { EventEmitter } from 'events';
import { clipboard } from 'electron';
import logger from '../utils/logger';
import { JOB_PLATFORMS } from '../../shared/constants';

export interface DetectedJob {
  url: string;
  platform: string;
  title?: string;
  company?: string;
  detectedAt: Date;
  source: 'clipboard' | 'window';
  clipboardText?: string;  // Full clipboard content for text parsing
}

/**
 * Job Detection Service
 * 
 * Monitors clipboard and active window to detect when user is viewing job postings.
 * This is TOS-compliant because:
 * - No web scraping or automated crawling
 * - Only processes data user explicitly interacts with
 * - Relies on user's manual browsing behavior
 */
export class JobDetector extends EventEmitter {
  private isRunning = false;
  private clipboardInterval?: NodeJS.Timeout;
  private lastClipboardContent = '';
  private readonly POLL_INTERVAL_MS = 1000; // Check clipboard every second

  constructor() {
    super();
  }

  /**
   * Start monitoring for job postings
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('JobDetector already running');
      return;
    }

    this.isRunning = true;
    logger.info('JobDetector started');

    // Monitor clipboard for job URLs
    this.startClipboardMonitoring();
  }

  /**
   * Stop all monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.clipboardInterval) {
      clearInterval(this.clipboardInterval);
      this.clipboardInterval = undefined;
    }

    logger.info('JobDetector stopped');
  }

  /**
   * Monitor clipboard for job URLs
   */
  private startClipboardMonitoring(): void {
    this.clipboardInterval = setInterval(async () => {
      try {
        const content = clipboard.readText();

        // Skip if clipboard hasn't changed
        if (content === this.lastClipboardContent) return;
        this.lastClipboardContent = content;

        // Extract URL from content (might be mixed with other text)
        const urlMatch = content.match(/https?:\/\/[^\s]+/);
        if (!urlMatch) return;
        
        const url = urlMatch[0];

        // Check if URL is from a job platform
        const platform = this.detectPlatform(url);
        if (!platform) return;

        // We found a job URL!
        const job: DetectedJob = {
          url: url.trim(),
          platform,
          detectedAt: new Date(),
          source: 'clipboard',
          clipboardText: content,  // Store full clipboard for title extraction
        };

        // Try to extract job info from URL structure
        const jobInfo = this.parseJobUrl(url, platform);
        if (jobInfo) {
          job.title = jobInfo.title;
          job.company = jobInfo.company;
        }

        logger.info('Job detected from clipboard', { platform, url: this.redactUrl(url) });
        this.emit('job-detected', job);

      } catch (error) {
        // Clipboard errors are common and non-critical
        logger.debug('Clipboard read error', { error: (error as Error).message });
      }
    }, this.POLL_INTERVAL_MS);
  }

  /**
   * Check if string is a valid URL
   */
  private isValidUrl(str: string): boolean {
    try {
      const url = new URL(str.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Detect which job platform a URL is from
   */
  private detectPlatform(url: string): string | null {
    const lowerUrl = url.toLowerCase();

    for (const [platform, patterns] of Object.entries(JOB_PLATFORMS)) {
      for (const pattern of patterns) {
        if (lowerUrl.includes(pattern.toLowerCase())) {
          return platform;
        }
      }
    }

    return null;
  }

  /**
   * Extract job information from URL
   * This uses URL patterns and structure, NOT scraping
   */
  private parseJobUrl(url: string, platform: string): { title?: string; company?: string } | null {
    try {
      const urlObj = new URL(url);

      switch (platform) {
        case 'LinkedIn': {
          // LinkedIn URLs often have job ID in path
          // Example: linkedin.com/jobs/view/3234234234
          const match = urlObj.pathname.match(/\/jobs\/view\/(\d+)/);
          return match ? {} : null; // Job ID exists but we don't parse title from URL
        }

        case 'Indeed': {
          // Indeed URLs sometimes have job title in query params
          // Example: indeed.com/viewjob?jk=abc123&q=Software+Engineer
          const title = urlObj.searchParams.get('q');
          return title ? { title: decodeURIComponent(title) } : null;
        }

        case 'Glassdoor': {
          // Glassdoor embeds job info in URL path
          // Example: glassdoor.com/job-listing/senior-developer-company-JV_123.htm
          const pathMatch = urlObj.pathname.match(/\/job-listing\/([^\/]+)/);
          if (pathMatch) {
            const slug = pathMatch[1].replace(/-JV_.*$/, '');
            const title = slug.split('-').map(w => 
              w.charAt(0).toUpperCase() + w.slice(1)
            ).join(' ');
            return { title };
          }
          return null;
        }

        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Redact URL for logging (privacy)
   */
  private redactUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname.substring(0, 20)}...`;
    } catch {
      return 'invalid-url';
    }
  }

  /**
   * Get current running status
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let detector: JobDetector | null = null;

export function getJobDetector(): JobDetector {
  if (!detector) {
    detector = new JobDetector();
  }
  return detector;
}
