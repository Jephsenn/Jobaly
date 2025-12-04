/**
 * Job Match Service
 * Calculates match scores between jobs and resumes
 */

export interface MatchScore {
  overall: number;
  skills: number;
  experience: number;
  title: number;
  breakdown: {
    matchedSkills: string[];
    missingSkills: string[];
    experienceMatch: boolean;
    titleSimilarity: number;
  };
}

export class JobMatchService {
  /**
   * Calculate match score between a job and a resume
   */
  static calculateMatch(
    job: {
      title: string | null;
      description: string | null;
      required_skills: string | null;
      required_experience_years: number | null;
    },
    resume: {
      hard_skills: string | null;
      soft_skills: string | null;
      years_of_experience: number | null;
      current_title: string | null;
    }
  ): MatchScore {
    const skillsScore = this.calculateSkillsMatch(job, resume);
    const experienceScore = this.calculateExperienceMatch(job, resume);
    const titleScore = this.calculateTitleMatch(job, resume);

    // Weighted average: skills 50%, experience 25%, title 25%
    const overall = Math.round(
      skillsScore.score * 0.5 +
      experienceScore.score * 0.25 +
      titleScore.score * 0.25
    );

    return {
      overall,
      skills: skillsScore.score,
      experience: experienceScore.score,
      title: titleScore.score,
      breakdown: {
        matchedSkills: skillsScore.matched,
        missingSkills: skillsScore.missing,
        experienceMatch: experienceScore.match,
        titleSimilarity: titleScore.score
      }
    };
  }

  /**
   * Calculate skills match percentage
   */
  private static calculateSkillsMatch(
    job: { description: string | null; required_skills: string | null },
    resume: { hard_skills: string | null; soft_skills: string | null }
  ): { score: number; matched: string[]; missing: string[] } {
    // Extract skills from job description and required_skills
    const jobSkills = new Set<string>();
    
    // Add explicit required skills
    if (job.required_skills) {
      job.required_skills.toLowerCase().split(',').forEach(skill => {
        jobSkills.add(skill.trim());
      });
    }

    // Extract skills from description
    if (job.description) {
      const descLower = job.description.toLowerCase();
      const commonSkills = [
        'javascript', 'typescript', 'python', 'java', 'c#', 'react', 'angular', 'vue',
        'node.js', 'sql', 'mongodb', 'aws', 'azure', 'docker', 'kubernetes',
        'git', 'agile', 'scrum', 'rest api', 'graphql', 'ci/cd', 'linux', 'windows'
      ];

      commonSkills.forEach(skill => {
        if (descLower.includes(skill)) {
          jobSkills.add(skill);
        }
      });
    }

    // Get resume skills
    const resumeSkills = new Set<string>();
    if (resume.hard_skills) {
      resume.hard_skills.toLowerCase().split(',').forEach(skill => {
        resumeSkills.add(skill.trim());
      });
    }
    if (resume.soft_skills) {
      resume.soft_skills.toLowerCase().split(',').forEach(skill => {
        resumeSkills.add(skill.trim());
      });
    }

    if (jobSkills.size === 0) {
      // If no skills extracted from job, assume 70% match if resume has any skills
      return {
        score: resumeSkills.size > 0 ? 70 : 50,
        matched: Array.from(resumeSkills).slice(0, 5),
        missing: []
      };
    }

    // Calculate match
    const matched: string[] = [];
    const missing: string[] = [];

    jobSkills.forEach(jobSkill => {
      let found = false;
      for (const resumeSkill of resumeSkills) {
        if (this.skillsAreSimilar(jobSkill, resumeSkill)) {
          matched.push(jobSkill);
          found = true;
          break;
        }
      }
      if (!found) {
        missing.push(jobSkill);
      }
    });

    const score = jobSkills.size > 0 
      ? Math.round((matched.length / jobSkills.size) * 100)
      : 0;

    return { score, matched, missing };
  }

  /**
   * Check if two skills are similar (handles variations like "react" vs "react.js")
   */
  private static skillsAreSimilar(skill1: string, skill2: string): boolean {
    const s1 = skill1.toLowerCase().replace(/[.\s-]/g, '');
    const s2 = skill2.toLowerCase().replace(/[.\s-]/g, '');
    
    return s1 === s2 || s1.includes(s2) || s2.includes(s1);
  }

  /**
   * Calculate experience match
   */
  private static calculateExperienceMatch(
    job: { required_experience_years: number | null },
    resume: { years_of_experience: number | null }
  ): { score: number; match: boolean } {
    if (!job.required_experience_years) {
      // If no experience requirement, give high score
      return { score: 90, match: true };
    }

    if (!resume.years_of_experience) {
      // If we don't know resume experience, assume mid-level (5 years)
      const assumedYears = 5;
      const diff = Math.abs(job.required_experience_years - assumedYears);
      const score = Math.max(0, 100 - (diff * 15));
      return { score, match: diff <= 2 };
    }

    // Calculate score based on experience difference
    const diff = Math.abs(job.required_experience_years - resume.years_of_experience);
    
    if (resume.years_of_experience >= job.required_experience_years) {
      // Has enough or more experience
      return { score: 100, match: true };
    } else {
      // Less experience than required
      const score = Math.max(0, 100 - (diff * 20));
      return { score, match: diff <= 1 };
    }
  }

  /**
   * Calculate title similarity
   */
  private static calculateTitleMatch(
    job: { title: string | null },
    resume: { current_title: string | null }
  ): { score: number } {
    if (!job.title || !resume.current_title) {
      return { score: 60 }; // Neutral score if titles missing
    }

    const jobTitle = job.title.toLowerCase();
    const resumeTitle = resume.current_title.toLowerCase();

    // Exact match
    if (jobTitle === resumeTitle) {
      return { score: 100 };
    }

    // Check for common keywords
    const jobWords = new Set(jobTitle.split(/\s+/));
    const resumeWords = new Set(resumeTitle.split(/\s+/));
    
    // Remove common words that don't indicate role
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'at']);
    jobWords.forEach(w => stopWords.has(w) && jobWords.delete(w));
    resumeWords.forEach(w => stopWords.has(w) && resumeWords.delete(w));

    // Count matching words
    let matchingWords = 0;
    jobWords.forEach(word => {
      if (resumeWords.has(word)) {
        matchingWords++;
      }
    });

    const totalWords = Math.max(jobWords.size, resumeWords.size);
    const score = totalWords > 0 
      ? Math.round((matchingWords / totalWords) * 100)
      : 0;

    // Boost score for common role keywords
    const roleKeywords = ['engineer', 'developer', 'analyst', 'manager', 'designer', 'architect'];
    for (const keyword of roleKeywords) {
      if (jobTitle.includes(keyword) && resumeTitle.includes(keyword)) {
        return { score: Math.min(100, score + 20) };
      }
    }

    return { score: Math.max(score, 40) }; // Minimum 40 if both titles exist
  }

  /**
   * Batch calculate match scores for multiple jobs against a resume
   */
  static batchCalculateMatches(
    jobs: Array<{
      id: number;
      title: string | null;
      description: string | null;
      required_skills: string | null;
      required_experience_years: number | null;
    }>,
    resume: {
      hard_skills: string | null;
      soft_skills: string | null;
      years_of_experience: number | null;
      current_title: string | null;
    }
  ): Map<number, MatchScore> {
    const scores = new Map<number, MatchScore>();
    
    for (const job of jobs) {
      const score = this.calculateMatch(job, resume);
      scores.set(job.id, score);
    }

    return scores;
  }
}
