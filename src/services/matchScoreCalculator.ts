import type { Resume, Job } from './database';

export interface MatchScoreBreakdown {
  overall: number;
  skills: number;
  experience: number;
  title: number;
  keywords: number;
  details: {
    matchedSkills: string[];
    missingSkills: string[];
    experienceGap: number; // years difference
    titleSimilarity: string;
    keywordMatches: number;
    totalKeywords: number;
  };
}

export interface MatchScoreSettings {
  desiredJobTitles: string[]; // User's target job titles
  weights: {
    skills: number;
    experience: number;
    title: number;
    keywords: number;
  };
}

const DEFAULT_WEIGHTS = {
  skills: 0.40,      // 40% weight
  experience: 0.25,  // 25% weight
  title: 0.20,       // 20% weight
  keywords: 0.15     // 15% weight
};

/**
 * Get match score settings from localStorage
 */
export function getMatchScoreSettings(): MatchScoreSettings {
  const stored = localStorage.getItem('jobaly_match_settings');
  if (stored) {
    const parsed = JSON.parse(stored);
    return {
      desiredJobTitles: parsed.desiredJobTitles || [],
      weights: { ...DEFAULT_WEIGHTS, ...(parsed.weights || {}) }
    };
  }
  return {
    desiredJobTitles: [],
    weights: DEFAULT_WEIGHTS
  };
}

/**
 * Save match score settings to localStorage
 */
export function saveMatchScoreSettings(settings: MatchScoreSettings): void {
  localStorage.setItem('jobaly_match_settings', JSON.stringify(settings));
}

/**
 * Calculate match score between a resume and a job posting
 */
export function calculateMatchScore(
  resume: Resume,
  job: Job,
  settings?: MatchScoreSettings
): MatchScoreBreakdown {
  const matchSettings = settings || getMatchScoreSettings();
  
  // Calculate individual scores
  const skillsScore = calculateSkillsMatch(resume, job);
  const experienceScore = calculateExperienceMatch(resume, job);
  const titleScore = calculateTitleMatch(resume, job, matchSettings.desiredJobTitles);
  const keywordsScore = calculateKeywordsMatch(resume, job);
  
  // Calculate weighted overall score
  const overall = Math.round(
    (skillsScore.score * matchSettings.weights.skills) +
    (experienceScore.score * matchSettings.weights.experience) +
    (titleScore.score * matchSettings.weights.title) +
    (keywordsScore.score * matchSettings.weights.keywords)
  );
  
  return {
    overall,
    skills: Math.round(skillsScore.score),
    experience: Math.round(experienceScore.score),
    title: Math.round(titleScore.score),
    keywords: Math.round(keywordsScore.score),
    details: {
      matchedSkills: skillsScore.matched,
      missingSkills: skillsScore.missing,
      experienceGap: experienceScore.gap,
      titleSimilarity: titleScore.similarity,
      keywordMatches: keywordsScore.matches,
      totalKeywords: keywordsScore.total
    }
  };
}

/**
 * Calculate skills matching score
 */
function calculateSkillsMatch(resume: Resume, job: Job): {
  score: number;
  matched: string[];
  missing: string[];
} {
  // Extract skills from resume
  const resumeSkills = new Set<string>();
  
  if (resume.hard_skills) {
    resume.hard_skills.split(',').forEach(skill => {
      resumeSkills.add(skill.trim().toLowerCase());
    });
  }
  
  if (resume.soft_skills) {
    resume.soft_skills.split(',').forEach(skill => {
      resumeSkills.add(skill.trim().toLowerCase());
    });
  }
  
  if (resume.tools_technologies) {
    resume.tools_technologies.split(',').forEach(skill => {
      resumeSkills.add(skill.trim().toLowerCase());
    });
  }
  
  // ENHANCED: Extract more skills from full text as fallback
  if (resume.full_text) {
    const expandedSkills = [
      // Programming Languages
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'PHP',
      // Frontend
      'React', 'Angular', 'Vue', 'HTML', 'CSS', 'Sass', 'LESS', 'jQuery', 'Bootstrap', 'Tailwind',
      // Backend
      'Node\\.js', 'Django', 'Flask', 'Spring', 'Express', 'FastAPI', '\\.NET', 'ASP\\.NET',
      // Databases
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'Cassandra', 'DynamoDB',
      // Cloud & DevOps
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab', 'CI/CD', 'Terraform',
      // Tools & Methodologies
      'Git', 'GitHub', 'Agile', 'Scrum', 'JIRA', 'REST', 'GraphQL', 'Microservices',
      // Soft Skills
      'Leadership', 'Communication', 'Problem Solving', 'Teamwork', 'Project Management'
    ];
    expandedSkills.forEach(skill => {
      if (new RegExp(`\\b${skill}\\b`, 'i').test(resume.full_text)) {
        resumeSkills.add(skill.replace(/\\\\/g, '').toLowerCase());
      }
    });
  }
  
  console.log('📊 Resume skills extracted:', Array.from(resumeSkills).slice(0, 10).join(', '), '...');
  
  // Extract required skills from job
  const requiredSkills = new Set<string>();
  const preferredSkills = new Set<string>();
  
  if (job.required_skills) {
    job.required_skills.split(',').forEach(skill => {
      requiredSkills.add(skill.trim().toLowerCase());
    });
  }
  
  if (job.preferred_skills) {
    job.preferred_skills.split(',').forEach(skill => {
      preferredSkills.add(skill.trim().toLowerCase());
    });
  }
  
  // ENHANCED: Extract more skills from description with better patterns
  if (job.description && job.description.length > 100) {
    const expandedSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'PHP',
      'React', 'Angular', 'Vue', 'HTML', 'CSS', 'Sass', 'jQuery', 'Bootstrap', 'Tailwind',
      'Node\\.js', 'Django', 'Flask', 'Spring', 'Express', 'FastAPI', '\\.NET', 'ASP\\.NET',
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'Cassandra', 'DynamoDB',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab', 'CI/CD', 'Terraform',
      'Git', 'GitHub', 'Agile', 'Scrum', 'JIRA', 'REST', 'GraphQL', 'Microservices',
      'Leadership', 'Communication', 'Problem Solving', 'Teamwork', 'Project Management'
    ];
    expandedSkills.forEach(skill => {
      if (new RegExp(`\\b${skill}\\b`, 'i').test(job.description)) {
        preferredSkills.add(skill.replace(/\\\\/g, '').toLowerCase());
      }
    });
  }
  
  const allJobSkills = new Set([...requiredSkills, ...preferredSkills]);
  
  console.log('📊 Job skills required:', Array.from(allJobSkills).slice(0, 10).join(', '), '...');
  
  // IMPROVED: If no skills can be extracted from job, return higher neutral score
  if (allJobSkills.size === 0) {
    console.log('⚠️ No skills extracted from job - returning neutral score');
    return { score: 70, matched: [], missing: [] }; // Higher neutral score (was 50)
  }
  
  // Calculate matches
  const matched: string[] = [];
  const missing: string[] = [];
  
  allJobSkills.forEach(jobSkill => {
    let isMatch = false;
    
    // Check for exact match or partial match
    for (const resumeSkill of resumeSkills) {
      if (resumeSkill.includes(jobSkill) || jobSkill.includes(resumeSkill)) {
        matched.push(jobSkill);
        isMatch = true;
        break;
      }
    }
    
    if (!isMatch) {
      missing.push(jobSkill);
    }
  });
  
  console.log('✅ Skills matched:', matched.length, '/', allJobSkills.size);
  
  // Calculate score: required skills weighted higher
  const requiredMatched = matched.filter(s => requiredSkills.has(s)).length;
  const requiredTotal = requiredSkills.size || 1;
  const preferredMatched = matched.filter(s => preferredSkills.has(s) && !requiredSkills.has(s)).length;
  const preferredTotal = preferredSkills.size - requiredSkills.size || 1;
  
  const requiredScore = (requiredMatched / requiredTotal) * 70; // 70% for required
  const preferredScore = (preferredMatched / preferredTotal) * 30; // 30% for preferred
  
  const score = Math.min(100, requiredScore + preferredScore);
  
  return { score, matched, missing };
}

/**
 * Calculate experience level matching
 */
function calculateExperienceMatch(resume: Resume, job: Job): {
  score: number;
  gap: number;
} {
  const resumeYears = resume.years_of_experience || 0;
  const requiredYears = job.experience_years || 0;
  
  if (requiredYears === 0) {
    return { score: 100, gap: 0 }; // No requirement = perfect match
  }
  
  const gap = requiredYears - resumeYears;
  
  if (gap <= 0) {
    // Meets or exceeds requirement
    return { score: 100, gap };
  } else if (gap <= 1) {
    // 1 year short
    return { score: 80, gap };
  } else if (gap <= 2) {
    // 2 years short
    return { score: 60, gap };
  } else if (gap <= 3) {
    // 3 years short
    return { score: 40, gap };
  } else {
    // More than 3 years short
    return { score: 20, gap };
  }
}

/**
 * Calculate job title matching
 */
function calculateTitleMatch(
  resume: Resume,
  job: Job,
  desiredTitles: string[]
): {
  score: number;
  similarity: string;
} {
  const resumeTitle = (resume.current_title || '').toLowerCase();
  const jobTitle = job.title.toLowerCase();
  
  // IMPROVED: Detect generic/placeholder titles from failed scraping
  const isGenericTitle = /^(linkedin|indeed|glassdoor|job)\s+(job|posting)\s+\d+$/i.test(job.title);
  if (isGenericTitle) {
    console.log('⚠️ Generic job title detected:', job.title, '- returning neutral score');
    return { score: 60, similarity: 'Job title not available' };
  }
  
  // Check against desired job titles first
  if (desiredTitles.length > 0) {
    for (const desired of desiredTitles) {
      const desiredLower = desired.trim().toLowerCase();
      if (jobTitle.includes(desiredLower) || desiredLower.includes(jobTitle)) {
        return { score: 100, similarity: 'Matches desired role' };
      }
    }
  }
  
  // Check if current title matches job title
  if (resumeTitle && jobTitle && jobTitle.length > 3) {
    const titleWords = new Set(resumeTitle.split(/\s+/).filter(w => w.length > 2));
    const jobWords = new Set(jobTitle.split(/\s+/).filter(w => w.length > 2));
    
    // Calculate word overlap
    let matches = 0;
    titleWords.forEach(word => {
      if (jobWords.has(word)) {
        matches++;
      }
    });
    
    // ENHANCED: Check for semantic similarity with more domain words
    const domainWords = [
      'help', 'desk', 'support', 'technical', 'system', 'network', 'software', 'web', 'data', 
      'cloud', 'engineer', 'developer', 'designer', 'manager', 'analyst', 'specialist',
      'coordinator', 'administrator', 'consultant', 'architect'
    ];
    let domainMatches = 0;
    domainWords.forEach(domain => {
      if (resumeTitle.includes(domain) && jobTitle.includes(domain)) {
        domainMatches++;
      }
    });
    
    // If 2+ domain words match (e.g., "help desk"), consider it a strong match even if role differs
    if (domainMatches >= 2) {
      return { score: 85, similarity: 'Same domain, similar role' };
    }
    
    // If 1 domain word matches, moderate score
    if (domainMatches === 1) {
      return { score: 70, similarity: 'Related field' };
    }
    
    const totalUniqueWords = new Set([...titleWords, ...jobWords]).size;
    const overlapPercent = totalUniqueWords > 0 ? (matches / totalUniqueWords) * 100 : 0;
    
    if (overlapPercent >= 50) {
      return { score: 90, similarity: 'Very similar title' };
    } else if (overlapPercent >= 30) {
      return { score: 70, similarity: 'Somewhat similar title' };
    } else if (overlapPercent >= 10) {
      return { score: 50, similarity: 'Related title' };
    }
  }
  
  // Check for seniority level match
  const seniorityLevels = ['intern', 'junior', 'mid', 'senior', 'lead', 'principal', 'staff', 'director', 'vp', 'head'];
  let resumeSeniority = '';
  let jobSeniority = '';
  
  seniorityLevels.forEach(level => {
    if (resumeTitle.includes(level)) resumeSeniority = level;
    if (jobTitle.includes(level)) jobSeniority = level;
  });
  
  if (resumeSeniority && jobSeniority && resumeSeniority === jobSeniority) {
    return { score: 60, similarity: 'Same seniority level' };
  }
  
  // IMPROVED: Better default for no match
  return { score: 40, similarity: 'Different role' }; // Increased from 30
}

/**
 * Calculate keyword matching from job description
 */
function calculateKeywordsMatch(resume: Resume, job: Job): {
  score: number;
  matches: number;
  total: number;
} {
  // IMPROVED: Return higher neutral score if no description or very short description
  if (!job.description) {
    console.log('⚠️ No job description - returning neutral keyword score');
    return { score: 70, matches: 0, total: 0 }; // Higher neutral (was 50)
  }
  
  if (job.description.length < 100) {
    console.log('⚠️ Job description too short (<100 chars) - returning neutral keyword score');
    return { score: 70, matches: 0, total: 0 }; // Higher neutral for short descriptions
  }
  
  const resumeText = resume.full_text.toLowerCase();
  const jobDescription = job.description.toLowerCase();
  
  // Extract important keywords from job description (nouns, tech terms)
  const keywords = extractKeywords(jobDescription);
  
  console.log('📊 Keywords extracted from job:', keywords.length);
  
  if (keywords.length === 0) {
    console.log('⚠️ No keywords extracted - returning neutral score');
    return { score: 70, matches: 0, total: 0 }; // Higher neutral (was 50)
  }
  
  // Count matches
  let matches = 0;
  keywords.forEach(keyword => {
    if (resumeText.includes(keyword.toLowerCase())) {
      matches++;
    }
  });
  
  console.log('✅ Keywords matched:', matches, '/', keywords.length);
  
  const score = (matches / keywords.length) * 100;
  
  return {
    score: Math.min(100, score),
    matches,
    total: keywords.length
  };
}

/**
 * Extract important keywords from text
 */
function extractKeywords(text: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'we', 'you', 'they', 'our', 'your', 'their'
  ]);
  
  // Extract words (3+ characters)
  const words = text.match(/\b[a-z]{3,}\b/gi) || [];
  
  // Count frequency
  const frequency = new Map<string, number>();
  words.forEach(word => {
    const lower = word.toLowerCase();
    if (!stopWords.has(lower)) {
      frequency.set(lower, (frequency.get(lower) || 0) + 1);
    }
  });
  
  // Get top keywords (mentioned 2+ times)
  const keywords = Array.from(frequency.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, _]) => word);
  
  return keywords;
}

/**
 * Get color class based on match score
 */
export function getMatchScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  if (score >= 80) {
    return {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      label: 'Excellent Match'
    };
  } else if (score >= 60) {
    return {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300',
      label: 'Good Match'
    };
  } else if (score >= 40) {
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
      label: 'Fair Match'
    };
  } else {
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-300',
      label: 'Low Match'
    };
  }
}
