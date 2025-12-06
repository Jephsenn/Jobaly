# Cover Letter Generation System

## 1. Prompt Template

### 1.1 Base System Prompt
```
You are an expert career counselor and professional cover letter writer with 15+ years of experience helping candidates land their dream jobs.

Your task is to write compelling, personalized cover letters that:
- Demonstrate genuine interest in the company and role
- Highlight specific qualifications that match job requirements
- Use concrete examples and quantifiable achievements
- Maintain an authentic, professional tone
- Stay concise (250-350 words)
- Avoid clichés and generic statements
- Show enthusiasm without desperation
```

### 1.2 Dynamic Prompt Construction

```typescript
interface CoverLetterPrompt {
  systemPrompt: string;
  userPrompt: string;
  context: CoverLetterContext;
}

interface CoverLetterContext {
  candidateName: string;
  candidateTitle: string;
  candidateSummary: string;
  relevantExperience: WorkExperience[];
  topSkills: string[];
  achievements: string[];
  
  jobTitle: string;
  companyName: string;
  companyIndustry?: string;
  jobRequirements: string[];
  jobDescription: string;
  
  tone: 'professional' | 'enthusiastic' | 'conversational' | 'formal';
  companyResearch?: string;
  customIntro?: string;
  includeCallToAction: boolean;
}

function buildCoverLetterPrompt(context: CoverLetterContext): CoverLetterPrompt {
  const systemPrompt = getSystemPrompt(context.tone);
  const userPrompt = buildUserPrompt(context);
  
  return { systemPrompt, userPrompt, context };
}
```

---

## 2. Tone-Specific System Prompts

### 2.1 Professional Tone
```typescript
const PROFESSIONAL_TONE = `
You are writing a cover letter with a professional, balanced tone.

CHARACTERISTICS:
- Clear and direct communication
- Professional but approachable language
- Focus on qualifications and fit
- Confident without being arrogant
- Use industry-standard terminology

AVOID:
- Overly casual language
- Excessive enthusiasm or flattery
- Buzzwords without substance
- Passive voice
- Generic phrases like "I am writing to apply..."

EXAMPLE PHRASES:
✓ "My experience leading cross-functional teams aligns well with..."
✓ "At [Company], I increased revenue by 40% through..."
✓ "I'm particularly drawn to [Company]'s commitment to..."
✗ "I would be honored to..."
✗ "I am very excited to..."
✗ "I am a hard worker and team player..."
`;
```

### 2.2 Enthusiastic Tone
```typescript
const ENTHUSIASTIC_TONE = `
You are writing a cover letter with genuine enthusiasm and energy.

CHARACTERISTICS:
- Show authentic excitement about the opportunity
- Highlight passion for the company's mission
- Use dynamic, energetic language
- Connect personal values with company values
- Express eagerness to contribute

AVOID:
- Coming across as desperate
- Over-the-top flattery
- Using too many exclamation points
- Sounding immature or unprofessional

EXAMPLE PHRASES:
✓ "I've been following [Company]'s work in [area] and am inspired by..."
✓ "The opportunity to contribute to [mission] aligns perfectly with my career goals"
✓ "I'm energized by the prospect of..."
✗ "This is my dream job!!!"
✗ "I would absolutely love to..."
✗ "I'm super passionate about..."
`;
```

### 2.3 Conversational Tone
```typescript
const CONVERSATIONAL_TONE = `
You are writing a cover letter with a warm, conversational tone.

CHARACTERISTICS:
- Write like you're speaking to a colleague
- Use first-person naturally
- Keep sentences shorter and varied
- Include personality while staying professional
- Build connection through authentic voice

AVOID:
- Slang or overly casual language
- Run-on sentences
- Being too informal
- Losing professionalism

EXAMPLE PHRASES:
✓ "When I saw this role, I knew I had to apply. Here's why..."
✓ "I've spent the last five years doing exactly this kind of work"
✓ "What excites me most about this opportunity is..."
✗ "Hey there!"
✗ "So basically, I think I'd be great for this job"
✗ "Let me tell you why you should hire me..."
`;
```

### 2.4 Formal Tone
```typescript
const FORMAL_TONE = `
You are writing a cover letter with a highly formal, traditional tone.

CHARACTERISTICS:
- Use formal business letter structure
- Traditional, polished language
- Third-person references to accomplishments where appropriate
- Demonstrate utmost professionalism
- Suitable for corporate, legal, academic, or executive roles

AVOID:
- Contractions (use "I am" not "I'm")
- Casual phrases
- First-person storytelling
- Informal punctuation

EXAMPLE PHRASES:
✓ "I am writing to express my interest in the [Title] position"
✓ "My background in [field] has prepared me to contribute effectively to..."
✓ "I would welcome the opportunity to discuss how my qualifications align with..."
✗ "I'm excited to apply..."
✗ "I'd love to chat about..."
✗ "This role is perfect for me because..."
`;
```

---

## 3. User Prompt Template

```typescript
function buildUserPrompt(context: CoverLetterContext): string {
  return `
Write a cover letter for the following job application:

=== CANDIDATE INFORMATION ===
Name: ${context.candidateName}
Current Title: ${context.candidateTitle}
Professional Summary: ${context.candidateSummary}

Key Achievements:
${context.achievements.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Top Skills: ${context.topSkills.join(', ')}

Relevant Experience:
${formatRelevantExperience(context.relevantExperience)}

=== JOB INFORMATION ===
Position: ${context.jobTitle}
Company: ${context.companyName}
${context.companyIndustry ? `Industry: ${context.companyIndustry}` : ''}

Key Requirements:
${context.jobRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Job Description (excerpt):
${truncate(context.jobDescription, 500)}

${context.companyResearch ? `
=== COMPANY RESEARCH ===
${context.companyResearch}
` : ''}

${context.customIntro ? `
=== CUSTOM OPENING ===
Use this as inspiration for the opening paragraph:
${context.customIntro}
` : ''}

=== INSTRUCTIONS ===
1. Write a compelling cover letter in ${context.tone} tone
2. Structure: Opening (hook) → Body (match skills to requirements) → Closing (call to action)
3. Length: 250-350 words
4. Highlight 2-3 specific achievements that match job requirements
5. Show you understand the company and role
6. ${context.includeCallToAction ? 'End with a strong call to action' : 'End professionally but without aggressive call to action'}
7. Use candidate's name: ${context.candidateName}
8. Address to: Hiring Manager (or specific name if known)

OUTPUT FORMAT:
Return only the cover letter body text, without:
- Letter heading/address block
- Signature block
- Subject line
- Just the main paragraphs

Begin writing now:
`;
}

function formatRelevantExperience(experiences: WorkExperience[]): string {
  return experiences.map(exp => `
• ${exp.title} at ${exp.company} (${formatDateRange(exp.startDate, exp.endDate)})
  - ${exp.description}
  - Key skills: ${exp.skills.join(', ')}
`).join('\n');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function formatDateRange(start: Date, end: Date | null): string {
  const format = (d: Date) => `${d.getMonth() + 1}/${d.getFullYear()}`;
  return `${format(start)} - ${end ? format(end) : 'Present'}`;
}
```

---

## 4. Advanced Prompt Techniques

### 4.1 Few-Shot Examples
```typescript
const FEW_SHOT_EXAMPLES = `
=== EXAMPLE 1: Tech Role, Professional Tone ===

When I read about the Senior Frontend Engineer position at Stripe, your commitment to building economic infrastructure for the internet immediately resonated with my own passion for creating user-centric financial tools.

In my current role at Fintech Innovations, I led the redesign of our payments dashboard, reducing transaction processing time by 60% and improving user satisfaction scores from 3.2 to 4.7/5. This involved architecting a React-based component library used across 12 product teams and implementing real-time WebSocket connections to handle 10,000+ concurrent transactions. My experience optimizing performance-critical interfaces directly aligns with Stripe's focus on reliability at scale.

I'm particularly drawn to your team's work on Stripe Elements and the challenge of balancing security, performance, and developer experience. Having built accessible, WCAG 2.1 AA-compliant interfaces and reduced bundle sizes by 40% through code-splitting strategies, I'm confident I can contribute meaningfully to these efforts.

I'd welcome the opportunity to discuss how my experience building resilient, user-focused financial interfaces could support Stripe's mission.

=== EXAMPLE 2: Marketing Role, Enthusiastic Tone ===

HubSpot's focus on helping businesses grow better isn't just a tagline to me—it's exactly what I've been doing for the past four years at SaaS startups in the inbound marketing space.

As Content Marketing Manager at Growth Labs, I built our content engine from scratch, growing organic traffic from 5K to 250K monthly visitors in 18 months. I created a pillar-cluster content strategy that increased our keyword rankings for 50+ high-intent terms and generated 1,200+ qualified leads per month. What excites me about this role is the opportunity to apply these same growth strategies at a company that literally wrote the book on inbound marketing.

I've been a HubSpot user for three years and am constantly impressed by how the platform evolves to meet marketer needs. The chance to help other marketers discover these tools while working with a team that values experimentation and data-driven decision-making is exactly where I want to take my career next.

I'd love to share more about how my experience scaling content programs could contribute to HubSpot's continued growth.

=== END EXAMPLES ===
`;
```

### 4.2 Company-Specific Customization
```typescript
interface CompanyCustomization {
  companyName: string;
  keywords: string[];
  values: string[];
  recentNews?: string;
  products?: string[];
}

function addCompanyCustomization(
  basePrompt: string,
  customization: CompanyCustomization
): string {
  return basePrompt + `

=== COMPANY-SPECIFIC GUIDANCE ===
When writing for ${customization.companyName}:
- Incorporate these company values naturally: ${customization.values.join(', ')}
- Reference their products/services if relevant: ${customization.products?.join(', ')}
${customization.recentNews ? `- Consider mentioning: ${customization.recentNews}` : ''}
- Use terminology they use: ${customization.keywords.join(', ')}

Show you've researched the company, but don't force it—only mention what's genuinely relevant to your fit for the role.
`;
}
```

---

## 5. Post-Processing & Validation

### 5.1 Quality Checks
```typescript
interface QualityCheck {
  passed: boolean;
  score: number;
  issues: string[];
}

function validateCoverLetter(text: string, context: CoverLetterContext): QualityCheck {
  const issues: string[] = [];
  let score = 100;
  
  // Word count check
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 200) {
    issues.push('Cover letter is too short (< 200 words)');
    score -= 20;
  } else if (wordCount > 400) {
    issues.push('Cover letter is too long (> 400 words)');
    score -= 10;
  }
  
  // Cliché detection
  const cliches = [
    'hard worker',
    'team player',
    'go-getter',
    'think outside the box',
    'hit the ground running',
    'passionate about',
    'excited to apply'
  ];
  
  for (const cliche of cliches) {
    if (text.toLowerCase().includes(cliche)) {
      issues.push(`Contains cliché: "${cliche}"`);
      score -= 5;
    }
  }
  
  // Name personalization check
  if (!text.includes(context.candidateName)) {
    issues.push('Missing candidate name');
    score -= 10;
  }
  
  if (!text.includes(context.companyName)) {
    issues.push('Missing company name');
    score -= 15;
  }
  
  // Quantifiable achievement check
  const hasNumbers = /\d+/.test(text);
  if (!hasNumbers) {
    issues.push('No quantifiable achievements mentioned');
    score -= 15;
  }
  
  // Passive voice detection (simplified)
  const passiveIndicators = ['was', 'were', 'been', 'being'];
  const passiveCount = passiveIndicators.reduce((count, word) => {
    return count + (text.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
  }, 0);
  
  if (passiveCount > 3) {
    issues.push('Excessive passive voice detected');
    score -= 10;
  }
  
  return {
    passed: issues.length === 0,
    score: Math.max(0, score),
    issues
  };
}
```

### 5.2 Readability Analysis
```typescript
function analyzeReadability(text: string): {
  fleschScore: number;
  grade: string;
  avgSentenceLength: number;
} {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  
  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  // Flesch Reading Ease
  const fleschScore = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  
  let grade = '';
  if (fleschScore >= 90) grade = 'Very Easy (5th grade)';
  else if (fleschScore >= 80) grade = 'Easy (6th grade)';
  else if (fleschScore >= 70) grade = 'Fairly Easy (7th grade)';
  else if (fleschScore >= 60) grade = 'Standard (8th-9th grade)';
  else if (fleschScore >= 50) grade = 'Fairly Difficult (10th-12th grade)';
  else grade = 'Difficult (College level)';
  
  return { fleschScore, grade, avgSentenceLength };
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}
```

---

## 6. LLM Provider Abstraction

### 6.1 Interface
```typescript
interface LLMProvider {
  name: string;
  generate(prompt: CoverLetterPrompt): Promise<string>;
  estimateCost(prompt: CoverLetterPrompt): number;
  isAvailable(): Promise<boolean>;
}

class LLMService {
  private providers: Map<string, LLMProvider> = new Map();
  
  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
  }
  
  async generateCoverLetter(
    context: CoverLetterContext,
    providerName?: string
  ): Promise<string> {
    const prompt = buildCoverLetterPrompt(context);
    
    const provider = providerName
      ? this.providers.get(providerName)
      : await this.selectBestProvider();
    
    if (!provider) {
      throw new Error('No LLM provider available');
    }
    
    const text = await provider.generate(prompt);
    const validation = validateCoverLetter(text, context);
    
    if (validation.score < 70) {
      console.warn('Generated cover letter quality is low', validation);
    }
    
    return text;
  }
  
  private async selectBestProvider(): Promise<LLMProvider | null> {
    // Prefer local models, fallback to cloud
    const preferenceOrder = ['local', 'anthropic', 'openai'];
    
    for (const name of preferenceOrder) {
      const provider = this.providers.get(name);
      if (provider && await provider.isAvailable()) {
        return provider;
      }
    }
    
    return null;
  }
}
```

### 6.2 OpenAI Implementation
```typescript
import OpenAI from 'openai';

class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async generate(prompt: CoverLetterPrompt): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
      top_p: 0.9,
      frequency_penalty: 0.3, // Reduce repetition
      presence_penalty: 0.2
    });
    
    return response.choices[0].message.content || '';
  }
  
  estimateCost(prompt: CoverLetterPrompt): number {
    // GPT-4 Turbo: ~$0.01 per 1K input tokens, ~$0.03 per 1K output
    const inputTokens = (prompt.systemPrompt + prompt.userPrompt).length / 4;
    const outputTokens = 600; // Estimated
    
    return (inputTokens / 1000 * 0.01) + (outputTokens / 1000 * 0.03);
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
```

### 6.3 Anthropic Implementation
```typescript
import Anthropic from '@anthropic-ai/sdk';

class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async generate(prompt: CoverLetterPrompt): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 800,
      temperature: 0.7,
      system: prompt.systemPrompt,
      messages: [
        { role: 'user', content: prompt.userPrompt }
      ]
    });
    
    return response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
  }
  
  estimateCost(prompt: CoverLetterPrompt): number {
    // Claude Sonnet: ~$0.003 per 1K input, ~$0.015 per 1K output
    const inputTokens = (prompt.systemPrompt + prompt.userPrompt).length / 4;
    const outputTokens = 600;
    
    return (inputTokens / 1000 * 0.003) + (outputTokens / 1000 * 0.015);
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

### 6.4 Local LLM (Ollama) Implementation
```typescript
class OllamaProvider implements LLMProvider {
  name = 'local';
  private baseUrl: string;
  
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }
  
  async generate(prompt: CoverLetterPrompt): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        prompt: `${prompt.systemPrompt}\n\n${prompt.userPrompt}`,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 600
        }
      })
    });
    
    const data = await response.json();
    return data.response;
  }
  
  estimateCost(prompt: CoverLetterPrompt): number {
    return 0; // Free local inference
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

---

## 7. Template Library

```typescript
interface CoverLetterTemplate {
  id: string;
  name: string;
  description: string;
  tone: string;
  structure: string[];
  sampleText: string;
}

const TEMPLATE_LIBRARY: CoverLetterTemplate[] = [
  {
    id: 'classic',
    name: 'Classic Professional',
    description: 'Traditional 3-paragraph structure',
    tone: 'professional',
    structure: ['Hook + Interest', 'Qualifications + Match', 'Call to Action'],
    sampleText: '...'
  },
  {
    id: 'story',
    name: 'Storytelling Approach',
    description: 'Lead with a compelling narrative',
    tone: 'conversational',
    structure: ['Personal Story', 'Connect to Role', 'Future Impact'],
    sampleText: '...'
  },
  {
    id: 'problem-solution',
    name: 'Problem-Solution',
    description: 'Address company pain point',
    tone: 'enthusiastic',
    structure: ['Company Challenge', 'Your Solution', 'Proven Results'],
    sampleText: '...'
  },
  {
    id: 'executive',
    name: 'Executive Level',
    description: 'For senior leadership roles',
    tone: 'formal',
    structure: ['Strategic Vision', 'Leadership Track Record', 'Value Proposition'],
    sampleText: '...'
  }
];
```

---

## 8. User Refinement Loop

```typescript
interface RefinementRequest {
  originalLetter: string;
  feedback: string;
  changeType: 'tone' | 'length' | 'focus' | 'custom';
}

async function refineCoverLetter(
  request: RefinementRequest,
  context: CoverLetterContext
): Promise<string> {
  const refinementPrompt = `
You previously wrote this cover letter:

${request.originalLetter}

The user has requested the following change:
"${request.feedback}"

Please revise the cover letter to address this feedback while maintaining:
- The same core qualifications and achievements
- Professional quality
- Target length of 250-350 words

${request.changeType === 'tone' ? 'Focus on adjusting the tone.' : ''}
${request.changeType === 'length' ? 'Focus on length adjustment only.' : ''}
${request.changeType === 'focus' ? 'Shift the emphasis as requested.' : ''}

Output only the revised cover letter:
`;

  // Use LLM to refine
  const llmService = new LLMService();
  return await llmService.generateCoverLetter({
    ...context,
    customIntro: refinementPrompt
  });
}
```
