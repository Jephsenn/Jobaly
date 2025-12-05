/**
 * Resume Parser Service
 * Extracts structured information from resume text
 */

export interface ParsedResume {
  hard_skills: string[];
  soft_skills: string[];
  tools_technologies: string[];
  years_of_experience: number | null;
  current_title: string | null;
  education: string[];
  certifications: string[];
  work_experience: string[];
}

export class ResumeParser {
  // Common technical skills to look for
  private static COMMON_TECH_SKILLS = [
    // Programming Languages
    'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'ruby', 'php', 'go', 'rust', 'swift', 'kotlin',
    
    // Web Technologies
    'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'next.js', 'graphql', 'rest api', 'webpack',
    
    // Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'oracle',
    
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible',
    
    // Tools & Frameworks
    'git', 'jira', 'agile', 'scrum', 'linux', 'windows server', 'nginx', 'apache',
    
    // Data & AI
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'data analysis',
    
    // Other
    'api', 'microservices', 'security', 'networking', 'troubleshooting', 'system administration'
  ];

  private static SOFT_SKILLS = [
    'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
    'time management', 'adaptability', 'creativity', 'collaboration', 'mentoring',
    'project management', 'strategic thinking', 'analytical', 'detail-oriented'
  ];

  /**
   * Parse resume text and extract structured information
   */
  static parse(fullText: string): ParsedResume {
    const lowerText = fullText.toLowerCase();

    return {
      hard_skills: this.extractTechnicalSkills(lowerText),
      soft_skills: this.extractSoftSkills(lowerText),
      tools_technologies: this.extractTools(lowerText),
      years_of_experience: this.extractYearsOfExperience(fullText),
      current_title: this.extractCurrentTitle(fullText),
      education: this.extractEducation(fullText),
      certifications: this.extractCertifications(fullText),
      work_experience: this.extractWorkExperience(fullText)
    };
  }

  /**
   * Extract technical skills from resume text
   */
  private static extractTechnicalSkills(lowerText: string): string[] {
    const foundSkills = new Set<string>();

    for (const skill of this.COMMON_TECH_SKILLS) {
      // Look for the skill as a whole word (case-insensitive)
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerText)) {
        foundSkills.add(skill);
      }
    }

    return Array.from(foundSkills);
  }

  /**
   * Extract soft skills from resume text
   */
  private static extractSoftSkills(lowerText: string): string[] {
    const foundSkills = new Set<string>();

    for (const skill of this.SOFT_SKILLS) {
      const regex = new RegExp(`\\b${skill}\\b`, 'i');
      if (regex.test(lowerText)) {
        foundSkills.add(skill);
      }
    }

    return Array.from(foundSkills);
  }

  /**
   * Extract tools and technologies (similar to technical skills but more specific)
   */
  private static extractTools(lowerText: string): string[] {
    // For now, return a subset of technical skills that are tools
    const tools = this.COMMON_TECH_SKILLS.filter(skill => 
      ['git', 'jira', 'docker', 'kubernetes', 'jenkins', 'aws', 'azure', 'gcp'].includes(skill)
    );

    return tools.filter(tool => {
      const regex = new RegExp(`\\b${tool}\\b`, 'i');
      return regex.test(lowerText);
    });
  }

  /**
   * Extract years of experience from resume text
   */
  private static extractYearsOfExperience(text: string): number | null {
    // Look for patterns like "5 years of experience", "10+ years", etc.
    const patterns = [
      /(\d+)\+?\s*years?\s+of\s+experience/i,
      /(\d+)\+?\s*years?\s+experience/i,
      /experience:\s*(\d+)\+?\s*years?/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    // Try to calculate from work history dates
    const yearMatches = text.match(/20\d{2}|19\d{2}/g);
    if (yearMatches && yearMatches.length >= 2) {
      const years = yearMatches.map(y => parseInt(y)).sort((a, b) => a - b);
      const earliest = years[0];
      const latest = years[years.length - 1];
      const experience = latest - earliest;
      if (experience > 0 && experience < 50) {
        return experience;
      }
    }

    return null;
  }

  /**
   * Extract current job title
   */
  private static extractCurrentTitle(text: string): string | null {
    // Look for common title indicators
    const patterns = [
      /current\s+(?:role|position|title):\s*([^\n]+)/i,
      /(?:senior|junior|lead|principal|staff)?\s*(engineer|developer|analyst|manager|designer|architect|administrator|specialist|consultant)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1]?.trim() || match[0]?.trim();
      }
    }

    // Try to get the first job title in the resume (usually the current one)
    const lines = text.split('\n');
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim();
      if (line.match(/engineer|developer|analyst|manager|designer|architect|administrator|specialist|consultant/i)) {
        if (line.length < 60) { // Titles shouldn't be too long
          return line;
        }
      }
    }

    return null;
  }

  /**
   * Extract education information
   */
  private static extractEducation(text: string): string[] {
    const education = [];
    const degrees = ['bachelor', 'master', 'phd', 'associate', 'mba', 'b.s.', 'm.s.', 'b.a.', 'm.a.'];
    
    const lines = text.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (degrees.some(degree => lowerLine.includes(degree))) {
        education.push(line.trim());
      }
    }

    return education;
  }

  /**
   * Extract certifications
   */
  private static extractCertifications(text: string): string[] {
    const certifications = [];
    const certKeywords = ['certified', 'certification', 'certificate', 'aws certified', 'microsoft certified'];
    
    const lines = text.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (certKeywords.some(keyword => lowerLine.includes(keyword))) {
        certifications.push(line.trim());
      }
    }

    return certifications;
  }

  /**
   * Extract work experience entries
   */
  private static extractWorkExperience(text: string): string[] {
    const experiences: string[] = [];
    
    // Look for date ranges that indicate work history
    const experiencePattern = /(20\d{2}|present)\s*[-–]\s*(20\d{2}|present)/gi;
    const matches = text.match(experiencePattern);
    
    if (matches) {
      return matches.map(m => m.trim());
    }

    return experiences;
  }
}
