/**
 * Cover Letter Generator Service
 * Creates professional, tailored cover letters for job applications
 */

export class CoverLetterGenerator {
  /**
   * Generate a cover letter for a job application
   */
  static generate(
    resume: {
      current_title: string | null;
      hard_skills: string | null;
      years_of_experience: number | null;
      work_experience: string | null;
    },
    job: {
      title: string | null;
      company_name: string | null;
      description: string | null;
      location: string | null;
    },
    matchScore?: {
      overall: number;
      breakdown: {
        matchedSkills: string[];
      };
    }
  ): string {
    const companyName = job.company_name || '[Company Name]';
    const jobTitle = job.title || '[Position Title]';
    const currentTitle = resume.current_title || 'Professional';
    const yearsExp = resume.years_of_experience || 5;
    
    // Get top matching skills
    const topSkills = matchScore?.breakdown.matchedSkills.slice(0, 3) || 
                      (resume.hard_skills ? resume.hard_skills.split(',').slice(0, 3) : ['problem solving', 'communication', 'teamwork']);

    const sections = [];

    // Opening paragraph - Express interest and brief intro
    sections.push(
      `I am writing to express my strong interest in the ${jobTitle} position at ${companyName}. ` +
      `As a ${currentTitle} with ${yearsExp}+ years of experience, I am excited about the opportunity to contribute ` +
      `to your team and help drive ${companyName}'s continued success.`
    );
    sections.push('');

    // Second paragraph - Highlight relevant experience and skills
    const skillsList = topSkills.map(s => s.trim()).join(', ');
    sections.push(
      `Throughout my career, I have developed strong expertise in ${skillsList}, which aligns perfectly ` +
      `with the requirements outlined in your job posting. My background has equipped me with a comprehensive ` +
      `understanding of the technical and collaborative skills needed to excel in this role.`
    );
    sections.push('');

    // Third paragraph - Specific achievements or how you can add value
    sections.push(
      `I am particularly drawn to ${companyName} because of its reputation for ${this.getCompanyValues(job)}. ` +
      `I am confident that my proven track record of ${this.getAchievements(resume)} would enable me to make ` +
      `immediate contributions to your team. My ability to ${this.getKeyStrengths(topSkills)} has consistently ` +
      `delivered results in fast-paced, collaborative environments.`
    );
    sections.push('');

    // Fourth paragraph - Why you're a good fit
    if (matchScore && matchScore.overall >= 70) {
      sections.push(
        `My background aligns closely with your needs, particularly in areas such as ${topSkills.slice(0, 2).join(' and ')}. ` +
        `I am eager to bring this expertise to ${companyName} and contribute to your ongoing initiatives.`
      );
    } else {
      sections.push(
        `While reviewing the position requirements, I was excited to see the emphasis on ${topSkills[0] || 'technical skills'} ` +
        `and ${topSkills[1] || 'problem solving'}. These are areas where I have consistently excelled and developed ` +
        `innovative solutions that drive business value.`
      );
    }
    sections.push('');

    // Closing paragraph
    sections.push(
      `I would welcome the opportunity to discuss how my skills and experience can benefit ${companyName}. ` +
      `Thank you for considering my application. I look forward to the possibility of contributing to your team ` +
      `and am available for an interview at your earliest convenience.`
    );

    return sections.join('\n');
  }

  /**
   * Extract or infer company values from job description
   */
  private static getCompanyValues(job: { description: string | null; company_name: string | null }): string {
    if (!job.description) return 'innovation and excellence';

    const descLower = job.description.toLowerCase();
    
    if (descLower.includes('innovation')) return 'innovation and cutting-edge technology';
    if (descLower.includes('customer') || descLower.includes('client')) return 'customer-centric approach and quality service';
    if (descLower.includes('team') || descLower.includes('collaborat')) return 'collaborative culture and teamwork';
    if (descLower.includes('growth') || descLower.includes('scale')) return 'growth mindset and scalability';
    if (descLower.includes('quality')) return 'commitment to quality and excellence';
    
    return 'industry leadership and innovation';
  }

  /**
   * Generate achievement statements from resume
   */
  private static getAchievements(resume: { work_experience: string | null; hard_skills: string | null }): string {
    const skills = resume.hard_skills ? resume.hard_skills.split(',') : [];
    
    if (skills.some(s => s.toLowerCase().includes('lead'))) {
      return 'leading cross-functional teams and delivering complex projects';
    }
    if (skills.some(s => ['python', 'javascript', 'java'].includes(s.toLowerCase()))) {
      return 'developing scalable software solutions';
    }
    if (skills.some(s => s.toLowerCase().includes('aws') || s.toLowerCase().includes('cloud'))) {
      return 'architecting cloud-based infrastructure';
    }
    if (skills.some(s => s.toLowerCase().includes('data'))) {
      return 'analyzing data to drive business decisions';
    }
    
    return 'solving complex problems and driving measurable results';
  }

  /**
   * Generate key strength statement from skills
   */
  private static getKeyStrengths(skills: string[]): string {
    if (skills.length === 0) return 'adapt quickly and deliver results';
    
    const skill = skills[0].toLowerCase();
    
    if (skill.includes('lead') || skill.includes('manage')) {
      return 'lead teams and manage complex initiatives';
    }
    if (skill.includes('develop') || skill.includes('build')) {
      return 'develop innovative solutions and build robust systems';
    }
    if (skill.includes('analyze') || skill.includes('data')) {
      return 'analyze complex data and translate insights into action';
    }
    if (skill.includes('design')) {
      return 'design elegant solutions to challenging problems';
    }
    
    return `leverage ${skills[0]} to deliver impactful results`;
  }

  /**
   * Generate a shorter, more casual cover letter
   */
  static generateBrief(
    resume: { current_title: string | null; hard_skills: string | null },
    job: { title: string | null; company_name: string | null }
  ): string {
    const companyName = job.company_name || '[Company Name]';
    const jobTitle = job.title || '[Position Title]';
    const currentTitle = resume.current_title || 'Professional';

    return `Dear Hiring Manager,

I am excited to apply for the ${jobTitle} position at ${companyName}. As a ${currentTitle}, I have the technical skills and professional experience needed to excel in this role.

My background in ${resume.hard_skills?.split(',').slice(0, 3).join(', ') || 'relevant technologies'} aligns well with your requirements, and I am eager to contribute to your team's success.

I would appreciate the opportunity to discuss how I can add value to ${companyName}. Thank you for your consideration.

Best regards,
[Your Name]`;
  }
}
