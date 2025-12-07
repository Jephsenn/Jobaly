import type { Resume, WorkExperience, Job } from './database';
import type { BulletUpdateStatus } from './resumeGenerator';

export interface AISettings {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model?: string;
  enabled: boolean;
}

export interface EnhancedResume {
  original: Resume;
  enhanced: {
    work_experiences: WorkExperience[];
    full_text: string;
    tailored_summary?: string;
    cover_letter?: string; // AI-generated cover letter tailored to the job
  };
  job?: Job;
  bulletUpdateStatuses?: BulletUpdateStatus[]; // Track which bullets were successfully updated in DOCX
}

/**
 * Get AI settings from localStorage
 */
export function getAISettings(): AISettings {
  const stored = localStorage.getItem('jobaly_ai_settings');
  if (stored) {
    const settings = JSON.parse(stored);
    // API key is now handled securely by backend proxy
    settings.provider = 'openai';
    settings.enabled = true;
    return settings;
  }
  return {
    provider: 'openai',
    model: 'gpt-4o-mini',
    enabled: true
  };
}

/**
 * Save AI settings to localStorage
 */
export function saveAISettings(settings: AISettings): void {
  localStorage.setItem('jobaly_ai_settings', JSON.stringify(settings));
}

/**
 * Enhance a single bullet point using AI
 */
async function enhanceBulletPoint(
  bulletPoint: string,
  job?: Job,
  settings?: AISettings
): Promise<string> {
  const aiSettings = settings || getAISettings();
  
  if (!aiSettings.enabled) {
    return bulletPoint; // Return original if AI not enabled
  }
  
  const prompt = job 
    ? `Enhance this resume bullet point to better match this job posting. IMPORTANT: Keep the same length or shorter than the original. Do not add new information or expand significantly. Just improve the wording and impact. Use strong action verbs and quantify if possible.

Job Title: ${job.title}
Company: ${job.company_name}
Required Skills: ${job.required_skills || 'Not specified'}

Original bullet point: ${bulletPoint}

Enhanced bullet point (same length or shorter):`
    : `Enhance this resume bullet point. IMPORTANT: Keep the same length or shorter than the original. Do not add new information or expand significantly. Just improve the wording and impact. Use strong action verbs and quantify if possible.

Original: ${bulletPoint}

Enhanced (same length or shorter):`;
  
  try {
    if (aiSettings.provider === 'openai') {
      return await callOpenAI(prompt, aiSettings);
    } else if (aiSettings.provider === 'anthropic') {
      return await callAnthropic(prompt, aiSettings);
    } else {
      // Local AI not implemented yet
      return bulletPoint;
    }
  } catch (error) {
    console.error('Failed to enhance bullet point:', error);
    return bulletPoint; // Return original on error
  }
}

/**
 * Sleep helper for rate limit delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhance multiple bullet points in a single API call (batched)
 */
async function enhanceBulletsBatch(
  bulletPoints: string[],
  job?: Job,
  settings?: AISettings
): Promise<string[]> {
  const aiSettings = settings || getAISettings();
  
  if (!aiSettings.enabled || bulletPoints.length === 0) {
    return bulletPoints;
  }

  // Create numbered list of bullet points
  const bulletList = bulletPoints.map((bullet, i) => `${i + 1}. ${bullet}`).join('\n');

  const prompt = job 
    ? `Enhance these resume bullet points to better match this job posting. IMPORTANT: Keep each the same length or shorter than the original. Do not add new information or expand significantly. Just improve the wording and impact. Use strong action verbs and quantify if possible.

Job Title: ${job.title}
Company: ${job.company_name}
Required Skills: ${job.required_skills || 'Not specified'}

Original bullet points:
${bulletList}

Return ONLY the enhanced bullet points in the same numbered format (1., 2., etc.). Keep each bullet the same length or shorter:`
    : `Enhance these resume bullet points. IMPORTANT: Keep each the same length or shorter than the original. Do not add new information or expand significantly. Just improve the wording and impact. Use strong action verbs and quantify if possible.

Original bullet points:
${bulletList}

Return ONLY the enhanced bullet points in the same numbered format (1., 2., etc.). Keep each bullet the same length or shorter:`;

  try {
    let response: string;
    let retries = 0;
    const maxRetries = 3;

    // Retry loop with exponential backoff
    while (retries < maxRetries) {
      try {
        if (aiSettings.provider === 'openai') {
          response = await callOpenAI(prompt, aiSettings);
        } else if (aiSettings.provider === 'anthropic') {
          response = await callAnthropic(prompt, aiSettings);
        } else {
          return bulletPoints;
        }
        break; // Success, exit retry loop
      } catch (error: any) {
        // Check if it's a rate limit error
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          retries++;
          if (retries >= maxRetries) {
            console.warn('⚠️ Rate limit reached, returning original bullets');
            return bulletPoints;
          }
          // Exponential backoff: 20s, 40s, 60s
          const delay = 20000 * retries;
          console.log(`⏳ Rate limit hit, waiting ${delay / 1000}s before retry ${retries}/${maxRetries}...`);
          await sleep(delay);
        } else {
          throw error; // Re-throw if not a rate limit error
        }
      }
    }

    // Parse the response to extract bullet points
    const lines = response!.split('\n').filter(line => line.trim());
    const enhanced: string[] = [];

    for (const line of lines) {
      // Remove numbering (1. , 2. , etc.) and trim
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match) {
        enhanced.push(match[1].trim());
      }
    }

    // Handle count mismatch: use what we got, keep rest unchanged
    if (enhanced.length !== bulletPoints.length) {
      console.warn(`⚠️ Batch response count mismatch (expected ${bulletPoints.length}, got ${enhanced.length})`);
      
      if (enhanced.length === 0) {
        console.warn('   No bullets parsed, returning all originals');
        return bulletPoints;
      }
      
      // Use enhanced bullets we got, fill rest with originals
      const result: string[] = [];
      for (let i = 0; i < bulletPoints.length; i++) {
        result.push(enhanced[i] || bulletPoints[i]);
      }
      console.warn(`   Using ${enhanced.length} enhanced, ${bulletPoints.length - enhanced.length} original`);
      return result;
    }

    return enhanced;
  } catch (error) {
    console.error('Failed to enhance bullet batch:', error);
    return bulletPoints;
  }
}

/**
 * Enhance all work experiences for a resume (with batching)
 */
export async function enhanceWorkExperiences(
  workExperiences: WorkExperience[],
  job?: Job,
  settings?: AISettings
): Promise<WorkExperience[]> {
  const aiSettings = settings || getAISettings();
  
  if (!aiSettings.enabled) {
    return workExperiences; // Return original if AI not enabled
  }
  
  console.group('🤖 AI Enhancement Process (Batched)');
  console.log(`Job: ${job?.title || 'General'} at ${job?.company_name || 'N/A'}`);
  console.log(`Total experiences to enhance: ${workExperiences.length}`);
  console.log('---\n');
  
  const enhanced: WorkExperience[] = [];
  let totalBullets = 0;
  let changedBullets = 0;
  
  for (const experience of workExperiences) {
    console.log(`📋 ${experience.company} - ${experience.title}`);
    console.log(`   Bullet points found: ${experience.bulletPoints?.length || 0}`);
    
    if (!experience.bulletPoints || experience.bulletPoints.length === 0) {
      console.warn('   ⚠️ No bullet points in this experience!');
      enhanced.push(experience);
      continue;
    }
    
    const originalBullets = experience.bulletPoints;
    totalBullets += originalBullets.length;
    
    // Enhance all bullets for this experience in one API call
    console.log(`   🔄 Enhancing ${originalBullets.length} bullets in batch...`);
    const enhancedBullets = await enhanceBulletsBatch(originalBullets, job, aiSettings);
    
    // Log changes
    for (let i = 0; i < originalBullets.length; i++) {
      if (enhancedBullets[i] !== originalBullets[i]) {
        changedBullets++;
        console.log(`   ✅ Bullet ${i + 1}: Enhanced`);
        console.log(`      Before: "${originalBullets[i].substring(0, 50)}..."`);
        console.log(`      After:  "${enhancedBullets[i].substring(0, 50)}..."`);
      } else {
        console.log(`   ⚠️ Bullet ${i + 1}: Unchanged`);
      }
    }
    
    console.log('');
    
    enhanced.push({
      ...experience,
      bulletPoints: enhancedBullets
    });
  }
  
  console.log('---');
  console.log(`Summary: ${changedBullets}/${totalBullets} bullets enhanced`);
  console.groupEnd();
  
  return enhanced;
}

/**
 * Generate a tailored summary/objective for a specific job (with retry)
 */
export async function generateTailoredSummary(
  resume: Resume,
  job: Job,
  settings?: AISettings
): Promise<string> {
  const aiSettings = settings || getAISettings();
  
  if (!aiSettings.enabled) {
    return resume.full_text.split('\n').slice(0, 3).join('\n'); // Return first few lines as fallback
  }
  
  const prompt = `Create a compelling professional summary (2-3 sentences) tailored to this job posting. Highlight relevant skills and experience from the resume.

Job Title: ${job.title}
Company: ${job.company_name}
Job Description: ${job.description.substring(0, 500)}...
Required Skills: ${job.required_skills || 'Not specified'}

Resume Skills: ${resume.hard_skills || 'Not specified'}
Current Title: ${resume.current_title || 'Not specified'}
Years of Experience: ${resume.years_of_experience || 'Not specified'}

Professional Summary:`;
  
  try {
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        if (aiSettings.provider === 'openai') {
          return await callOpenAI(prompt, aiSettings);
        } else if (aiSettings.provider === 'anthropic') {
          return await callAnthropic(prompt, aiSettings);
        } else {
          return resume.full_text.split('\n').slice(0, 3).join('\n');
        }
      } catch (error: any) {
        // Check if it's a rate limit error
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          retries++;
          if (retries >= maxRetries) {
            console.warn('⚠️ Rate limit reached for summary, using fallback');
            return resume.full_text.split('\n').slice(0, 3).join('\n');
          }
          const delay = 20000 * retries;
          console.log(`⏳ Rate limit hit on summary, waiting ${delay / 1000}s before retry ${retries}/${maxRetries}...`);
          await sleep(delay);
        } else {
          throw error;
        }
      }
    }
    
    return resume.full_text.split('\n').slice(0, 3).join('\n');
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return resume.full_text.split('\n').slice(0, 3).join('\n');
  }
}

/**
 * Generate a tailored cover letter for the job
 */
export async function generateCoverLetter(
  resume: Resume,
  enhancedWorkExperiences: WorkExperience[],
  job: Job,
  settings?: AISettings
): Promise<string> {
  const aiSettings = settings || getAISettings();
  
  if (!aiSettings.enabled) {
    return generateFallbackCoverLetter(resume, job);
  }
  
  // Get top 2-3 most relevant experiences
  const topExperiences = enhancedWorkExperiences.slice(0, 3);
  const experienceDetails = topExperiences.map(exp => 
    `${exp.title} at ${exp.company}:\n${exp.bulletPoints.slice(0, 2).join('\n')}`
  ).join('\n\n');
  
  const prompt = `Write a compelling, professional cover letter BODY ONLY (250-350 words) for this job application. 

CANDIDATE INFORMATION:
Name: ${resume.name || 'Candidate'}
Current Title: ${resume.current_title || 'Professional'}
Years of Experience: ${resume.years_of_experience || 'Several years'}
Top Skills: ${resume.hard_skills?.split(',').slice(0, 5).join(', ') || 'Not specified'}

RELEVANT EXPERIENCE:
${experienceDetails}

JOB DETAILS:
Position: ${job.title}
Company: ${job.company_name}
Key Requirements: ${job.required_skills || 'Not specified'}
Job Description: ${job.description.substring(0, 600)}...

CRITICAL INSTRUCTIONS:
- Write ONLY the body paragraphs - NO header information at all
- Do NOT include: [Your Name], [Your Address], [City, State, Zip], [Your Email], [Your Phone Number], [Date], [Company Address], or ANY other bracketed placeholders
- Do NOT write "Dear Hiring Manager" - I will add that separately
- Do NOT write "Sincerely" or signature - I will add that separately  
- Start immediately with the first paragraph of the letter body
- Write in first person as the candidate
- Open with a strong hook that shows genuine interest
- Highlight 2-3 specific achievements that match job requirements
- Show enthusiasm for the company and role
- Include a call to action in the closing paragraph
- Use a professional but approachable tone
- Keep it concise (250-350 words)
- Do NOT use generic phrases like "I am writing to apply"
- Focus on value you can bring to the company

EXAMPLE OF WHAT TO WRITE:
"When I learned about the [Position] opportunity at [Company], I was immediately drawn to [specific aspect]. With [X years] of experience in [field], I have developed expertise in [relevant skills]..."

DO NOT WRITE ANYTHING LIKE THIS:
[Your Name]
[Date]
Dear Hiring Manager,

Cover Letter Body (start with first paragraph immediately):`;
  
  try {
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        if (aiSettings.provider === 'openai') {
          return await callOpenAI(prompt, aiSettings, 'coverLetter');
        } else if (aiSettings.provider === 'anthropic') {
          return await callAnthropic(prompt, aiSettings);
        } else {
          return generateFallbackCoverLetter(resume, job);
        }
      } catch (error: any) {
        // Check if it's a rate limit error
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          retries++;
          if (retries >= maxRetries) {
            console.warn('⚠️ Rate limit reached for cover letter, using fallback');
            return generateFallbackCoverLetter(resume, job);
          }
          const delay = 20000 * retries;
          console.log(`⏳ Rate limit hit on cover letter, waiting ${delay / 1000}s before retry ${retries}/${maxRetries}...`);
          await sleep(delay);
        } else {
          throw error;
        }
      }
    }
    
    return generateFallbackCoverLetter(resume, job);
  } catch (error) {
    console.error('Failed to generate cover letter:', error);
    return generateFallbackCoverLetter(resume, job);
  }
}

/**
 * Generate a basic fallback cover letter without AI
 */
function generateFallbackCoverLetter(resume: Resume, job: Job): string {
  return `I am writing to express my strong interest in the ${job.title} position at ${job.company_name}. With ${resume.years_of_experience || 'several years'} of experience as a ${resume.current_title || 'professional'}, I am confident that my skills and background make me an excellent fit for this role.

${resume.work_experiences && resume.work_experiences.length > 0 
  ? `In my current role as ${resume.work_experiences[0].title} at ${resume.work_experiences[0].company}, I have developed strong expertise in ${resume.hard_skills?.split(',').slice(0, 3).join(', ') || 'relevant areas'}. This experience has prepared me well for the challenges and opportunities that come with the ${job.title} position.` 
  : 'Throughout my career, I have developed strong expertise in the key areas required for this position.'}

I am particularly excited about the opportunity to contribute to ${job.company_name}'s continued success. My background in ${resume.hard_skills?.split(',').slice(0, 2).join(' and ') || 'the field'} aligns well with your requirements, and I am eager to bring my skills and experience to your team.

Thank you for considering my application. I would welcome the opportunity to discuss how my qualifications align with your needs and to learn more about this exciting opportunity.`;
}

/**
 * Progress callback for resume enhancement
 */
export type ProgressCallback = (progress: { step: string; percent: number }) => void;

/**
 * Enhance entire resume for a specific job
 */
export async function enhanceResumeForJob(
  resume: Resume,
  job: Job,
  progressCallback?: ProgressCallback | AISettings,
  settings?: AISettings
): Promise<EnhancedResume> {
  // Handle backward compatibility: if progressCallback is AISettings, treat as settings
  let aiSettings: AISettings;
  let onProgress: ProgressCallback | undefined;
  
  if (progressCallback && typeof progressCallback === 'function') {
    onProgress = progressCallback;
    aiSettings = settings || getAISettings();
  } else if (progressCallback && typeof progressCallback === 'object') {
    aiSettings = progressCallback as AISettings;
  } else {
    aiSettings = settings || getAISettings();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting Resume Enhancement');
  console.log('='.repeat(60));
  console.log(`Resume: ${resume.name}`);
  console.log(`Job: ${job.title} at ${job.company_name}`);
  console.log(`AI Enabled: ${aiSettings.enabled ? '✅' : '❌'}`);
  console.log('='.repeat(60) + '\n');
  
  if (!aiSettings.enabled) {
    console.log('⚠️ AI not enabled, returning original resume');
    return {
      original: resume,
      enhanced: {
        work_experiences: resume.work_experiences || [],
        full_text: resume.full_text
      },
      job
    };
  }
  
  // Enhance work experiences
  console.log('Step 1/2: Enhancing work experience bullet points...\n');
  onProgress?.({ step: 'Enhancing work experiences...', percent: 0 });
  
  const totalExperiences = resume.work_experiences?.length || 0;
  const enhancedWorkExperiences: WorkExperience[] = [];
  
  if (resume.work_experiences && resume.work_experiences.length > 0) {
    for (let i = 0; i < resume.work_experiences.length; i++) {
      const exp = resume.work_experiences[i];
      const expProgress = (i / totalExperiences) * 80; // 0% to 80%
      onProgress?.({ 
        step: `Enhancing ${exp.company} (${i + 1}/${totalExperiences})...`, 
        percent: expProgress 
      });
      
      const enhanced = await enhanceWorkExperiences([exp], job, aiSettings);
      enhancedWorkExperiences.push(...enhanced);
    }
  }
  
  // Generate tailored summary
  console.log('\nStep 2/3: Generating tailored summary...');
  onProgress?.({ step: 'Generating tailored summary...', percent: 85 });
  
  const tailoredSummary = await generateTailoredSummary(resume, job, aiSettings);
  console.log(`✅ Summary generated (${tailoredSummary.length} characters)\n`);
  
  // Generate cover letter
  console.log('\nStep 3/3: Generating cover letter...');
  onProgress?.({ step: 'Generating cover letter...', percent: 90 });
  
  const coverLetter = await generateCoverLetter(resume, enhancedWorkExperiences, job, aiSettings);
  console.log(`✅ Cover letter generated (${coverLetter.length} characters)\n`);
  
  onProgress?.({ step: 'Finalizing...', percent: 95 });
  
  // Reconstruct full text with enhancements
  let enhancedText = tailoredSummary + '\n\n';
  
  // Add enhanced work experiences
  if (enhancedWorkExperiences.length > 0) {
    enhancedText += 'EXPERIENCE\n\n';
    for (const exp of enhancedWorkExperiences) {
      enhancedText += `${exp.title} | ${exp.company}\n`;
      if (exp.startDate) {
        enhancedText += `${exp.startDate} - ${exp.endDate || 'Present'}\n`;
      }
      if (exp.location) {
        enhancedText += `${exp.location}\n`;
      }
      enhancedText += '\n';
      for (const bullet of exp.bulletPoints) {
        enhancedText += `• ${bullet}\n`;
      }
      enhancedText += '\n';
    }
  }
  
  // Add other sections from original resume (skills, education, etc.)
  if (resume.sections) {
    const otherSections = resume.sections.filter(s => 
      s.type !== 'experience' && s.type !== 'summary' && s.type !== 'header'
    );
    for (const section of otherSections) {
      if (section.title) {
        enhancedText += `${section.title.toUpperCase()}\n\n`;
      }
      enhancedText += section.content + '\n\n';
    }
  }
  
  console.log('='.repeat(60));
  console.log('✨ Enhancement Complete!');
  console.log('='.repeat(60));
  console.log(`Total work experiences: ${enhancedWorkExperiences.length}`);
  const totalBullets = enhancedWorkExperiences.reduce((sum, exp) => sum + exp.bulletPoints.length, 0);
  console.log(`Total bullet points: ${totalBullets}`);
  console.log(`Summary length: ${tailoredSummary.length} characters`);
  console.log('='.repeat(60) + '\n');
  
  return {
    original: resume,
    enhanced: {
      work_experiences: enhancedWorkExperiences,
      full_text: enhancedText,
      tailored_summary: tailoredSummary,
      cover_letter: coverLetter
    },
    job
  };
}

/**
 * Call OpenAI API directly (development only)
 */
async function callOpenAIDirect(prompt: string, settings: AISettings, apiKey: string, taskType: 'default' | 'parsing' | 'coverLetter' = 'default'): Promise<string> {
  // Determine max tokens based on task type
  const maxTokens = taskType === 'parsing' ? 2000 : taskType === 'coverLetter' ? 600 : 200;
  const systemContent = taskType === 'parsing' 
    ? 'You are a resume parser. Extract work experience data and return ONLY valid JSON with no additional text.'
    : taskType === 'coverLetter'
    ? 'You are a professional cover letter writer. Write compelling, personalized cover letters that highlight relevant achievements and show genuine interest in the role.'
    : 'You are a professional resume writer and career coach. Provide CONCISE, impactful improvements to resume content. CRITICAL: Keep responses the same length or shorter than the original. Do not expand or add new information. Focus on better wording, quantifiable achievements, and strong action verbs.';
    
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: maxTokens
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

/**
 * Call OpenAI API through secure proxy or direct (development only)
 */
async function callOpenAI(prompt: string, settings: AISettings, taskType: 'default' | 'parsing' | 'coverLetter' = 'default'): Promise<string> {
  // Check if we're in development
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Get API key from localStorage for development (NOT for production)
  const devApiKey = isDevelopment ? localStorage.getItem('jobaly_dev_openai_key') : null;
  
  // Determine max tokens based on task type
  const maxTokens = taskType === 'parsing' ? 2000 : taskType === 'coverLetter' ? 600 : 200;
  const systemContent = taskType === 'parsing' 
    ? 'You are a resume parser. Extract work experience data and return ONLY valid JSON with no additional text.'
    : taskType === 'coverLetter'
    ? 'You are a professional cover letter writer. Write compelling, personalized cover letters that highlight relevant achievements and show genuine interest in the role.'
    : 'You are a professional resume writer and career coach. Provide CONCISE, impactful improvements to resume content. CRITICAL: Keep responses the same length or shorter than the original. Do not expand or add new information. Focus on better wording, quantifiable achievements, and strong action verbs.';
  
  // If in development and have local key, use direct OpenAI API
  if (isDevelopment && devApiKey) {
    console.log('🔧 Development mode: Using direct OpenAI API');
    return callOpenAIDirect(prompt, settings, devApiKey, taskType);
  }
  
  // Otherwise use secure proxy
  console.log('🔒 Using secure API proxy');
  const apiEndpoint = '/api/openai';
  
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: maxTokens
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

/**
 * Call Anthropic API
 */
async function callAnthropic(prompt: string, settings: AISettings): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey || '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: settings.model || 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a professional resume writer and career coach. Provide concise, impactful improvements to resume content. Focus on quantifiable achievements and strong action verbs.\n\n${prompt}`
        }
      ]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.content[0].text.trim();
}

/**
 * Test AI connection
 */
export async function testAIConnection(settings: AISettings): Promise<boolean> {
  try {
    const testPrompt = 'Respond with "OK" if you can read this.';
    const response = settings.provider === 'openai'
      ? await callOpenAI(testPrompt, settings)
      : await callAnthropic(testPrompt, settings);
    return response.toLowerCase().includes('ok');
  } catch (error) {
    console.error('AI connection test failed:', error);
    return false;
  }
}

/**
 * Use AI to parse work experiences from resume text
 * Handles any resume format - much more flexible than regex
 */
export async function parseWorkExperiencesWithAI(resumeText: string, settings?: AISettings): Promise<WorkExperience[]> {
  const aiSettings = settings || getAISettings();
  
  if (!aiSettings.enabled) {
    console.warn('AI not enabled, cannot parse work experiences');
    return [];
  }
  
  console.log('🤖 Using AI to parse work experiences from resume...');
  
  // Truncate resume text if too long (to avoid token limits)
  const maxLength = 6000; // About 1500 tokens
  const truncatedText = resumeText.length > maxLength 
    ? resumeText.substring(0, maxLength) + '\n...[truncated]'
    : resumeText;

  const prompt = `Parse the work experiences from this resume text and return them as a JSON array. Extract each job's company, title, dates, and bullet points.

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON, no other text
2. Keep bullet points SHORT (under 100 characters each)
3. If a bullet is too long, summarize it
4. Include ALL experiences you find
5. Format dates as "Month Year" or "Present"

JSON format:
[
  {
    "company": "Company Name",
    "title": "Job Title",
    "startDate": "Month Year",
    "endDate": "Present",
    "current": true,
    "location": "City, State",
    "bulletPoints": ["Brief point 1", "Brief point 2"]
  }
]

Resume text:
${truncatedText}

JSON array:`;

  try {
    // Pass taskType='parsing' to get more tokens and appropriate system message
    const response = aiSettings.provider === 'openai'
      ? await callOpenAI(prompt, aiSettings, 'parsing')
      : await callAnthropic(prompt, aiSettings);
    
    console.log('AI response:', response);
    
    // Try to extract JSON from response
    let jsonText = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    // Parse JSON
    const experiences = JSON.parse(jsonText);
    
    console.log(`✅ Successfully parsed ${experiences.length} work experiences with AI`);
    
    return experiences;
  } catch (error) {
    console.error('Failed to parse work experiences with AI:', error);
    return [];
  }
}
