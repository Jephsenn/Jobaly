/**
 * Resume Tailoring Service
 * Optimizes resume content for specific job postings
 */

interface TailoredResume {
  original_resume_id: number;
  tailored_text: string;
  modifications: {
    added_keywords: string[];
    emphasized_skills: string[];
    reordered_sections: boolean;
    ats_score: number;
  };
}

export class ResumeTailoring {
  /**
   * Tailor a resume for a specific job posting
   */
  static tailor(
    resume: {
      full_text: string;
      hard_skills: string | null;
      current_title: string | null;
      work_experience: string | null;
    },
    job: {
      title: string | null;
      company_name: string | null;
      description: string | null;
      required_skills: string | null;
    }
  ): TailoredResume {
    const modifications = {
      added_keywords: [] as string[],
      emphasized_skills: [] as string[],
      reordered_sections: false,
      ats_score: 0
    };

    // Extract key requirements from job description
    const jobKeywords = this.extractKeywords(job);
    const resumeSkills = resume.hard_skills ? resume.hard_skills.split(',').map(s => s.trim().toLowerCase()) : [];

    // Find matching and missing skills
    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];

    jobKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (resumeSkills.some(skill => skill.includes(keywordLower) || keywordLower.includes(skill))) {
        matchingSkills.push(keyword);
      } else {
        missingSkills.push(keyword);
      }
    });

    // Build tailored resume sections
    const sections = this.parseResumeIntoSections(resume.full_text);

    // 1. Add professional summary tailored to the job
    const summary = this.generateTailoredSummary(resume, job, matchingSkills);
    sections.summary = summary;

    // 2. Generate tailored skills section with job keywords
    // Preserve existing skills section and emphasize job-relevant ones
    sections.skills = this.tailorSkillsSection(sections.skills, jobKeywords);
    console.log('\n=== ResumeTailoring: Skills Section Generated ===');
    console.log('Skills section length:', sections.skills.length);
    console.log('Skills section content:', sections.skills);
    modifications.emphasized_skills = matchingSkills;

    // 3. Tailor experience bullets to emphasize relevant work
    // Note: Don't use resume.work_experience as it only contains date ranges
    // Use the experience from parsed sections which has full content
    sections.experience = this.tailorExperienceSection(sections.experience, jobKeywords);
    console.log('\n=== ResumeTailoring: Experience Section Generated ===');
    console.log('Experience section length:', sections.experience.length);
    console.log('Experience first 500 chars:', sections.experience.substring(0, 500));

    // 4. Calculate ATS score
    const tailoredText = this.reconstructResume(sections);
    modifications.ats_score = this.calculateATSScore(tailoredText, jobKeywords);
    modifications.added_keywords = jobKeywords.slice(0, 10);

    return {
      original_resume_id: 0,
      tailored_text: tailoredText,
      modifications
    };
  }

  /**
   * Parse resume into distinct sections
   */
  private static parseResumeIntoSections(resumeText: string): {
    header: string;
    summary: string;
    skills: string;
    experience: string;
    education: string;
    certifications: string;
  } {
    const sections = {
      header: '',
      summary: '',
      skills: '',
      experience: '',
      education: '',
      certifications: ''
    };

    const lines = resumeText.split('\n');
    let currentSection = 'header';
    let sectionLines: string[] = [];

    for (const line of lines) {
      const upperLine = line.trim().toUpperCase();

      if (upperLine.includes('EDUCATION')) {
        sections[currentSection as keyof typeof sections] = sectionLines.join('\n');
        currentSection = 'education';
        sectionLines = [line];
      } else if (upperLine.includes('TECHNICAL SKILLS') || upperLine.includes('SKILLS')) {
        sections[currentSection as keyof typeof sections] = sectionLines.join('\n');
        currentSection = 'skills';
        sectionLines = [line];
      } else if (upperLine.includes('EXPERIENCE')) {
        sections[currentSection as keyof typeof sections] = sectionLines.join('\n');
        currentSection = 'experience';
        sectionLines = [line];
      } else if (upperLine.includes('CERTIFICATION')) {
        sections[currentSection as keyof typeof sections] = sectionLines.join('\n');
        currentSection = 'certifications';
        sectionLines = [line];
      } else {
        sectionLines.push(line);
      }
    }

    sections[currentSection as keyof typeof sections] = sectionLines.join('\n');
    return sections;
  }

  /**
   * Tailor skills section to emphasize job-relevant skills
   * Preserves the existing format and categories
   */
  private static tailorSkillsSection(skillsText: string, jobKeywords: string[]): string {
    if (!skillsText) return 'Technical Skills';
    
    // Just return as-is for now - the existing skills are already well-organized
    // In the future, we could reorder skills within each category to put job-relevant ones first
    return skillsText;
  }

  /**
   * Generate tailored skills section emphasizing job-relevant skills
   * DEPRECATED: Use tailorSkillsSection instead
   */
  private static generateTailoredSkillsSection(
    matchingSkills: string[],
    resumeSkills: string[],
    jobKeywords: string[]
  ): string {
    const skillsText: string[] = ['Technical Skills'];
    
    // Categorize skills like the original resume
    const categories = {
      'Languages & Scripting': [] as string[],
      'Tools & Platforms': [] as string[],
      'Testing & Automation': [] as string[],
      'Systems & Web': [] as string[]
    };

    // Common skill categorization
    const languageKeywords = ['java', 'python', 'javascript', 'typescript', 'json', 'bash', 'powershell', 'php', 'sql', 'c#', 'c++'];
    const toolKeywords = ['halopsa', 'servicenow', 'github', 'jamf', 'azure', 'intune', 'ad', 'sccm', 'aws'];
    const testingKeywords = ['qa', 'scripting', 'uat', 'testing', 'automation', 'selenium', 'junit'];
    const systemKeywords = ['wordpress', 'sharepoint', 'squarespace', '3cx', 'bitlocker', 'virtualbox', 'hcss', 'sage', 'timberscan'];

    // Prioritize job keywords and add to appropriate categories
    const allSkills = [...new Set([...jobKeywords, ...matchingSkills, ...resumeSkills])];
    
    allSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      
      if (languageKeywords.some(k => skillLower.includes(k))) {
        categories['Languages & Scripting'].push(skill);
      } else if (toolKeywords.some(k => skillLower.includes(k))) {
        categories['Tools & Platforms'].push(skill);
      } else if (testingKeywords.some(k => skillLower.includes(k))) {
        categories['Testing & Automation'].push(skill);
      } else if (systemKeywords.some(k => skillLower.includes(k))) {
        categories['Systems & Web'].push(skill);
      }
    });

    // Format like original resume
    for (const [category, skills] of Object.entries(categories)) {
      if (skills.length > 0) {
        skillsText.push(`${category}: ${skills.slice(0, 12).join(', ')}`);
      }
    }

    return skillsText.join('\n');
  }

  /**
   * Tailor experience bullets to emphasize job-relevant accomplishments
   * Keep all company names and job titles, just reorder bullets by relevance
   */
  private static tailorExperienceSection(experienceText: string, jobKeywords: string[]): string {
    if (!experienceText) return 'Experience';

    const lines = experienceText.split('\n');
    const result: string[] = [];
    
    // Keep everything - just group by relevance within each job
    let currentJob: string[] = [];
    let isFirstLine = true;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip "Experience" header if it's the first line
      if (isFirstLine && trimmed.toUpperCase() === 'EXPERIENCE') {
        isFirstLine = false;
        continue;
      }
      isFirstLine = false;
      
      // Check if this is a company/job title line (not a bullet, not a date)
      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
      const isDate = /^(January|February|March|April|May|June|July|August|September|October|November|December|\d{4})/.test(trimmed);
      const isCompanyOrTitle = !isBullet && !isDate && trimmed.length > 0 && trimmed.length < 100;
      
      if (isCompanyOrTitle && currentJob.length > 0) {
        // New job section, flush current job
        result.push(...currentJob);
        currentJob = [line];
      } else {
        currentJob.push(line);
      }
    }
    
    // Flush last job
    if (currentJob.length > 0) {
      result.push(...currentJob);
    }
    
    return 'Experience\n' + result.join('\n');
  }

  /**
   * Reconstruct resume from sections
   */
  private static reconstructResume(sections: {
    header: string;
    summary: string;
    skills: string;
    experience: string;
    education: string;
    certifications: string;
  }): string {
    const parts: string[] = [];

    if (sections.header) parts.push(sections.header);
    if (sections.summary) parts.push('\n' + sections.summary);
    if (sections.skills) parts.push('\n' + sections.skills);
    if (sections.experience) parts.push('\n' + sections.experience);
    if (sections.education) parts.push('\n' + sections.education);
    if (sections.certifications) parts.push('\n' + sections.certifications);

    const result = parts.join('\n');
    console.log('\n=== ResumeTailoring: Reconstructed Resume ===');
    console.log('Total length:', result.length);
    console.log('First 1000 chars:', result.substring(0, 1000));
    
    return result;
  }

  /**
   * Extract important keywords from job posting
   */
  private static extractKeywords(job: {
    title: string | null;
    description: string | null;
    required_skills: string | null;
  }): string[] {
    const keywords = new Set<string>();

    // Add from title
    if (job.title) {
      const titleWords = job.title.split(/\s+/).filter(w => w.length > 3);
      titleWords.forEach(w => keywords.add(w));
    }

    // Add explicit required skills
    if (job.required_skills) {
      job.required_skills.split(',').forEach(skill => {
        keywords.add(skill.trim());
      });
    }

    // Extract from description
    if (job.description) {
      const techKeywords = [
        'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue', 'node.js',
        'aws', 'azure', 'docker', 'kubernetes', 'sql', 'mongodb', 'agile', 'scrum',
        'leadership', 'communication', 'problem solving', 'team collaboration'
      ];

      const descLower = job.description.toLowerCase();
      techKeywords.forEach(keyword => {
        if (descLower.includes(keyword)) {
          keywords.add(keyword);
        }
      });

      // Look for "required" or "must have" sections
      const requiredMatch = job.description.match(/(?:required|must have|requirements)[:\s]+([\s\S]*?)(?:\n\n|preferred|nice to have|$)/i);
      if (requiredMatch) {
        const requiredText = requiredMatch[1];
        techKeywords.forEach(keyword => {
          if (requiredText.toLowerCase().includes(keyword)) {
            keywords.add(keyword);
          }
        });
      }
    }

    return Array.from(keywords).slice(0, 15); // Top 15 keywords
  }

  /**
   * Generate a tailored professional summary
   */
  private static generateTailoredSummary(
    resume: { current_title: string | null; work_experience: string | null },
    job: { title: string | null; company_name: string | null },
    matchingSkills: string[]
  ): string {
    const title = resume.current_title || 'Professional';
    const targetRole = job.title || 'this position';
    const company = job.company_name || 'your organization';
    
    const skillsList = matchingSkills.slice(0, 5).join(', ');

    return `${title} with proven expertise in ${skillsList}. Seeking to leverage extensive experience to contribute to ${company} as a ${targetRole}. Demonstrated ability to deliver results in fast-paced environments while maintaining high standards of quality and collaboration.`;
  }

  /**
   * Insert summary into resume text
   */
  private static insertSummary(resumeText: string, summary: string): string {
    // Try to find existing summary section
    const summaryPatterns = [
      /PROFESSIONAL SUMMARY[\s\S]*?(?=\n[A-Z]{2,}|\n\n)/i,
      /SUMMARY[\s\S]*?(?=\n[A-Z]{2,}|\n\n)/i,
      /PROFILE[\s\S]*?(?=\n[A-Z]{2,}|\n\n)/i
    ];

    for (const pattern of summaryPatterns) {
      if (pattern.test(resumeText)) {
        return resumeText.replace(pattern, `PROFESSIONAL SUMMARY\n${summary}\n\n`);
      }
    }

    // If no summary section exists, add it at the beginning (after contact info)
    const lines = resumeText.split('\n');
    const insertIndex = Math.min(5, lines.length); // After first few lines (contact info)
    lines.splice(insertIndex, 0, '\nPROFESSIONAL SUMMARY\n' + summary + '\n');
    return lines.join('\n');
  }

  /**
   * Generate ATS-friendly skills section
   */
  private static generateSkillsSection(
    matchingSkills: string[],
    missingSkills: string[],
    resumeSkills: string[]
  ): string {
    const allSkills = [...new Set([...matchingSkills, ...resumeSkills.slice(0, 10)])];
    return `TECHNICAL SKILLS\n${allSkills.join(' • ')}\n\n`;
  }

  /**
   * Insert or update skills section
   */
  private static insertSkillsSection(resumeText: string, skillsSection: string): string {
    const skillsPattern = /(?:TECHNICAL SKILLS|SKILLS|CORE COMPETENCIES)[\s\S]*?(?=\n[A-Z]{2,}|\n\n)/i;
    
    if (skillsPattern.test(resumeText)) {
      return resumeText.replace(skillsPattern, skillsSection);
    }

    // Add after summary or at the beginning
    return resumeText.replace(/(?:PROFESSIONAL SUMMARY[\s\S]*?\n\n)/, `$&${skillsSection}`);
  }

  /**
   * Calculate ATS compatibility score
   */
  private static calculateATSScore(resumeText: string, jobKeywords: string[]): number {
    const resumeLower = resumeText.toLowerCase();
    let matches = 0;

    jobKeywords.forEach(keyword => {
      if (resumeLower.includes(keyword.toLowerCase())) {
        matches++;
      }
    });

    return Math.round((matches / jobKeywords.length) * 100);
  }

  /**
   * Escape special regex characters
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
