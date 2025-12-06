# Matching Algorithms & Scoring System

## 1. Resume Scoring Algorithm

### 1.1 Overall Match Score Formula

```typescript
interface MatchScore {
  overall: number;           // 0.0 to 1.0
  hardSkills: number;        // 0.0 to 1.0
  softSkills: number;        // 0.0 to 1.0
  experience: number;        // 0.0 to 1.0
  titleAlignment: number;    // 0.0 to 1.0
  industryAlignment: number; // 0.0 to 1.0
}

function computeMatchScore(resume: Resume, job: Job): MatchScore {
  const hardSkills = computeHardSkillsScore(resume, job);
  const softSkills = computeSoftSkillsScore(resume, job);
  const experience = computeExperienceScore(resume, job);
  const titleAlignment = computeTitleAlignment(resume, job);
  const industryAlignment = computeIndustryAlignment(resume, job);
  
  const overall = 
    (hardSkills * 0.40) +
    (softSkills * 0.20) +
    (experience * 0.20) +
    (titleAlignment * 0.10) +
    (industryAlignment * 0.10);
  
  return {
    overall,
    hardSkills,
    softSkills,
    experience,
    titleAlignment,
    industryAlignment
  };
}
```

### Weight Rationale
- **Hard Skills (40%)**: Most critical factor for technical roles
- **Soft Skills (20%)**: Important for team fit and leadership
- **Experience (20%)**: Years and relevance matter
- **Title Alignment (10%)**: Career progression indicator
- **Industry Alignment (10%)**: Domain expertise bonus

---

## 2. Hard Skills Score

### 2.1 Algorithm
```typescript
function computeHardSkillsScore(resume: Resume, job: Job): number {
  const requiredSkills = normalizeSkills(job.requiredSkills);
  const preferredSkills = normalizeSkills(job.preferredSkills);
  const userSkills = normalizeSkills(resume.hardSkills);
  
  // Match required skills
  const matchedRequired = requiredSkills.filter(skill => 
    userSkills.some(userSkill => isSimilarSkill(skill, userSkill))
  );
  
  // Match preferred skills
  const matchedPreferred = preferredSkills.filter(skill => 
    userSkills.some(userSkill => isSimilarSkill(skill, userSkill))
  );
  
  // Calculate component scores
  const requiredScore = requiredSkills.length > 0
    ? matchedRequired.length / requiredSkills.length
    : 1.0; // No requirements = perfect match
  
  const preferredScore = preferredSkills.length > 0
    ? matchedPreferred.length / preferredSkills.length
    : 1.0;
  
  // Weighted combination (required skills are more important)
  const hardSkillsScore = (requiredScore * 0.70) + (preferredScore * 0.30);
  
  return hardSkillsScore;
}
```

### 2.2 Skill Similarity Matching
```typescript
function isSimilarSkill(skill1: string, skill2: string): boolean {
  // Exact match
  if (skill1.toLowerCase() === skill2.toLowerCase()) {
    return true;
  }
  
  // Check aliases (e.g., "JavaScript" vs "JS", "React.js" vs "React")
  const aliases = getSkillAliases(skill1);
  if (aliases.some(alias => alias.toLowerCase() === skill2.toLowerCase())) {
    return true;
  }
  
  // Fuzzy match (Levenshtein distance)
  const distance = levenshteinDistance(skill1.toLowerCase(), skill2.toLowerCase());
  const maxLen = Math.max(skill1.length, skill2.length);
  const similarity = 1 - (distance / maxLen);
  
  return similarity >= 0.85; // 85% similarity threshold
}

function normalizeSkills(skills: string[]): string[] {
  return skills.map(skill => {
    // Normalize common variations
    const normalized = skill
      .toLowerCase()
      .replace(/\.js$/, '') // "React.js" → "react"
      .replace(/[\s-]/g, ''); // "Machine Learning" → "machinelearning"
    
    return normalized;
  });
}
```

### 2.3 Skill Categories
```typescript
interface SkillCategory {
  name: string;
  keywords: string[];
  weight: number; // Importance multiplier
}

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    name: 'Programming Languages',
    keywords: ['python', 'javascript', 'java', 'typescript', 'c++', 'go', 'rust'],
    weight: 1.2 // Core skills weighted higher
  },
  {
    name: 'Frameworks',
    keywords: ['react', 'angular', 'vue', 'django', 'flask', 'spring', 'express'],
    weight: 1.1
  },
  {
    name: 'Databases',
    keywords: ['sql', 'postgresql', 'mongodb', 'redis', 'elasticsearch'],
    weight: 1.0
  },
  {
    name: 'Cloud Platforms',
    keywords: ['aws', 'azure', 'gcp', 'kubernetes', 'docker'],
    weight: 1.0
  },
  {
    name: 'Tools',
    keywords: ['git', 'jira', 'jenkins', 'github', 'gitlab'],
    weight: 0.8 // Nice-to-have
  }
];
```

---

## 3. Soft Skills Score

### 3.1 Algorithm
```typescript
async function computeSoftSkillsScore(resume: Resume, job: Job): Promise<number> {
  // Extract soft skills from job description
  const jobSoftSkills = extractSoftSkills(job.description);
  
  // Extract soft skills from resume
  const resumeSoftSkills = extractSoftSkills(resume.summary + ' ' + resume.workExperience);
  
  // Generate embeddings
  const jobEmbedding = await generateEmbedding(jobSoftSkills.join(' '));
  const resumeEmbedding = await generateEmbedding(resumeSoftSkills.join(' '));
  
  // Compute cosine similarity
  const similarity = cosineSimilarity(jobEmbedding, resumeEmbedding);
  
  return similarity;
}

function extractSoftSkills(text: string): string[] {
  const softSkillKeywords = [
    'leadership', 'communication', 'teamwork', 'problem-solving',
    'analytical', 'creative', 'adaptable', 'detail-oriented',
    'collaborative', 'initiative', 'time management', 'critical thinking',
    'interpersonal', 'organizational', 'strategic', 'innovative'
  ];
  
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const skill of softSkillKeywords) {
    if (lowerText.includes(skill)) {
      found.push(skill);
    }
  }
  
  return found;
}
```

### 3.2 Embedding Generation
```typescript
import { pipeline } from '@xenova/transformers';

let embedder: any = null;

async function generateEmbedding(text: string): Promise<number[]> {
  if (!embedder) {
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true
  });
  
  return Array.from(output.data);
}
```

### 3.3 Cosine Similarity
```typescript
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimensions');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}
```

---

## 4. Experience Score

### 4.1 Algorithm
```typescript
function computeExperienceScore(resume: Resume, job: Job): number {
  const userYears = resume.yearsOfExperience || 0;
  const requiredYears = job.requiredExperienceYears || 0;
  
  if (requiredYears === 0) {
    return 1.0; // No experience required
  }
  
  // Linear scoring up to required years, capped at 1.0
  const score = Math.min(1.0, userYears / requiredYears);
  
  // Bonus for exceeding requirements (up to 1.2x)
  if (userYears > requiredYears) {
    const bonus = Math.min(0.2, (userYears - requiredYears) / requiredYears * 0.1);
    return Math.min(1.0, score + bonus);
  }
  
  return score;
}
```

### 4.2 Relevant Experience Calculation
```typescript
interface WorkExperience {
  title: string;
  company: string;
  startDate: Date;
  endDate: Date | null;
  description: string;
  skills: string[];
}

function computeRelevantExperience(
  resume: Resume,
  job: Job
): number {
  const experiences: WorkExperience[] = JSON.parse(resume.workExperience);
  
  let totalRelevantMonths = 0;
  
  for (const exp of experiences) {
    const relevanceScore = computeExperienceRelevance(exp, job);
    const months = calculateMonths(exp.startDate, exp.endDate || new Date());
    
    // Weight months by relevance
    totalRelevantMonths += months * relevanceScore;
  }
  
  return totalRelevantMonths / 12; // Convert to years
}

function computeExperienceRelevance(
  experience: WorkExperience,
  job: Job
): number {
  // Check title similarity
  const titleSim = stringSimilarity(experience.title, job.title);
  
  // Check skill overlap
  const expSkills = new Set(experience.skills.map(s => s.toLowerCase()));
  const jobSkills = new Set([
    ...job.requiredSkills,
    ...job.preferredSkills
  ].map(s => s.toLowerCase()));
  
  const overlap = [...expSkills].filter(s => jobSkills.has(s)).length;
  const skillSim = overlap / Math.max(expSkills.size, jobSkills.size);
  
  return (titleSim * 0.6) + (skillSim * 0.4);
}
```

---

## 5. Title Alignment Score

### 5.1 Algorithm
```typescript
async function computeTitleAlignment(resume: Resume, job: Job): Promise<number> {
  const currentTitle = resume.currentTitle || '';
  const jobTitle = job.title;
  
  // Generate embeddings
  const currentEmbedding = await generateEmbedding(currentTitle);
  const jobEmbedding = await generateEmbedding(jobTitle);
  
  // Cosine similarity
  const similarity = cosineSimilarity(currentEmbedding, jobEmbedding);
  
  // Bonus for exact or near-exact match
  if (currentTitle.toLowerCase() === jobTitle.toLowerCase()) {
    return 1.0;
  }
  
  // Bonus for seniority progression
  const seniorityBonus = computeSeniorityAlignment(currentTitle, jobTitle);
  
  return Math.min(1.0, similarity + seniorityBonus);
}

function computeSeniorityAlignment(currentTitle: string, jobTitle: string): number {
  const seniorityLevels = [
    ['intern', 'junior', 'entry'],
    ['mid', 'intermediate', 'ii', '2'],
    ['senior', 'sr', 'iii', '3', 'lead'],
    ['staff', 'principal', 'architect'],
    ['director', 'vp', 'head'],
    ['cto', 'ceo', 'cio', 'chief']
  ];
  
  const getCurrentLevel = (title: string): number => {
    const lower = title.toLowerCase();
    for (let i = 0; i < seniorityLevels.length; i++) {
      if (seniorityLevels[i].some(term => lower.includes(term))) {
        return i;
      }
    }
    return 1; // Default to mid-level
  };
  
  const currentLevel = getCurrentLevel(currentTitle);
  const jobLevel = getCurrentLevel(jobTitle);
  
  // Lateral move or promotion: bonus
  if (jobLevel >= currentLevel) {
    return 0.1;
  }
  
  // Demotion: penalty
  return -0.1;
}
```

---

## 6. Industry Alignment Score

### 6.1 Algorithm
```typescript
async function computeIndustryAlignment(resume: Resume, job: Job): Promise<number> {
  // Extract industry keywords from resume
  const resumeIndustries = extractIndustryKeywords(
    resume.summary + ' ' + resume.workExperience
  );
  
  // Extract industry keywords from job
  const jobIndustries = extractIndustryKeywords(
    job.description + ' ' + job.companyName
  );
  
  // Generate embeddings
  const resumeEmbedding = await generateEmbedding(resumeIndustries.join(' '));
  const jobEmbedding = await generateEmbedding(jobIndustries.join(' '));
  
  return cosineSimilarity(resumeEmbedding, jobEmbedding);
}

function extractIndustryKeywords(text: string): string[] {
  const industries = [
    'fintech', 'finance', 'banking', 'healthcare', 'medical',
    'ecommerce', 'retail', 'saas', 'b2b', 'b2c',
    'edtech', 'education', 'gaming', 'entertainment',
    'cybersecurity', 'security', 'blockchain', 'crypto',
    'ai', 'machine learning', 'data science',
    'iot', 'hardware', 'robotics', 'automotive'
  ];
  
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const industry of industries) {
    if (lowerText.includes(industry)) {
      found.push(industry);
    }
  }
  
  return found;
}
```

---

## 7. Estimated Interview Probability

### 7.1 Algorithm
```typescript
function estimateInterviewProbability(matchScore: MatchScore): number {
  const overall = matchScore.overall;
  
  // Logistic function for probability estimation
  // P(interview) = 1 / (1 + e^(-k * (score - threshold)))
  
  const threshold = 0.6; // Minimum competitive score
  const k = 10; // Steepness factor
  
  const probability = 1 / (1 + Math.exp(-k * (overall - threshold)));
  
  // Adjust for hard requirements
  if (matchScore.hardSkills < 0.5) {
    // Severe penalty if missing >50% of hard skills
    return probability * 0.3;
  }
  
  if (matchScore.experience < 0.5) {
    // Penalty for insufficient experience
    return probability * 0.7;
  }
  
  return probability;
}
```

### 7.2 Confidence Intervals
```typescript
interface InterviewEstimate {
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string[];
}

function getInterviewEstimate(
  matchScore: MatchScore,
  job: Job,
  resume: Resume
): InterviewEstimate {
  const probability = estimateInterviewProbability(matchScore);
  
  const reasoning: string[] = [];
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  
  // Factors that increase confidence
  if (matchScore.hardSkills >= 0.8) {
    reasoning.push('Strong technical skill match');
    confidence = 'high';
  }
  
  if (matchScore.experience >= 1.0) {
    reasoning.push('Meets or exceeds experience requirements');
  }
  
  if (matchScore.titleAlignment >= 0.8) {
    reasoning.push('Excellent title alignment');
  }
  
  // Factors that decrease confidence
  if (matchScore.hardSkills < 0.5) {
    reasoning.push('Missing critical skills');
    confidence = 'low';
  }
  
  if (matchScore.experience < 0.5) {
    reasoning.push('Below experience requirements');
    confidence = 'low';
  }
  
  return { probability, confidence, reasoning };
}
```

---

## 8. Salary Delta Analysis

### 8.1 Algorithm
```typescript
interface SalaryAnalysis {
  delta: number;           // Difference from user baseline
  percentile: number;      // User's position vs market
  recommendation: string;
}

function analyzeSalaryDelta(
  job: Job,
  userBaseline: number
): SalaryAnalysis {
  if (!job.salaryMin || !job.salaryMax) {
    return {
      delta: 0,
      percentile: 0.5,
      recommendation: 'Salary not disclosed'
    };
  }
  
  const jobMidpoint = (job.salaryMin + job.salaryMax) / 2;
  const delta = jobMidpoint - userBaseline;
  
  // Estimate percentile based on job range
  const range = job.salaryMax - job.salaryMin;
  const percentile = (userBaseline - job.salaryMin) / range;
  
  let recommendation = '';
  
  if (delta > 0) {
    recommendation = `This role pays ${formatCurrency(delta)} more than your target`;
  } else if (delta < 0) {
    recommendation = `This role pays ${formatCurrency(Math.abs(delta))} less than your target`;
  } else {
    recommendation = 'Salary matches your target';
  }
  
  if (percentile < 0.25) {
    recommendation += ' - negotiate for higher end of range';
  } else if (percentile > 0.75) {
    recommendation += ' - strong position to negotiate';
  }
  
  return {
    delta,
    percentile: Math.max(0, Math.min(1, percentile)),
    recommendation
  };
}
```

---

## 9. Optimization Suggestions

### 9.1 Algorithm
```typescript
interface OptimizationSuggestion {
  type: 'add_skill' | 'highlight_experience' | 'adjust_summary' | 'add_certification';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: number; // Estimated score improvement (0.0 to 1.0)
}

function generateOptimizationSuggestions(
  matchScore: MatchScore,
  matchedSkills: string[],
  missingSkills: string[],
  resume: Resume,
  job: Job
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  
  // Missing hard skills
  for (const skill of missingSkills.slice(0, 5)) {
    suggestions.push({
      type: 'add_skill',
      priority: 'high',
      description: `Add "${skill}" to your skills section or highlight related experience`,
      impact: 0.05
    });
  }
  
  // Experience gap
  if (matchScore.experience < 0.7) {
    suggestions.push({
      type: 'highlight_experience',
      priority: 'high',
      description: 'Emphasize relevant project work and accomplishments',
      impact: 0.1
    });
  }
  
  // Summary optimization
  if (matchScore.titleAlignment < 0.7) {
    suggestions.push({
      type: 'adjust_summary',
      priority: 'medium',
      description: `Tailor your professional summary to align with "${job.title}" role`,
      impact: 0.08
    });
  }
  
  // Sort by impact (descending)
  suggestions.sort((a, b) => b.impact - a.impact);
  
  return suggestions;
}
```

---

## 10. Caching Strategy

### 10.1 Embedding Cache
```typescript
class EmbeddingCache {
  private cache = new Map<string, number[]>();
  
  async getOrCompute(text: string): Promise<number[]> {
    const key = hashString(text);
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    const embedding = await generateEmbedding(text);
    this.cache.set(key, embedding);
    
    // Persist to database
    await saveEmbeddingToDb(key, embedding);
    
    return embedding;
  }
}

function hashString(str: string): string {
  // Simple hash function (use crypto.createHash in production)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
```

---

## 11. Performance Benchmarks

### Target Performance
- **Match Score Computation**: < 100ms per job
- **Embedding Generation**: < 500ms per text
- **Database Query**: < 50ms
- **UI Update**: < 16ms (60fps)

### Optimization Techniques
1. **Batch Embeddings**: Process multiple jobs at once
2. **Web Workers**: Offload embedding to separate thread
3. **Indexed Database**: Fast skill lookups
4. **Debounced Scoring**: Avoid redundant calculations
