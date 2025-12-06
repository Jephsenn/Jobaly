import type { Resume, WorkExperience, Job } from './database';

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
  };
  job?: Job;
}

/**
 * Get AI settings from localStorage
 */
export function getAISettings(): AISettings {
  const stored = localStorage.getItem('jobaly_ai_settings');
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    provider: 'openai',
    enabled: false
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
  
  if (!aiSettings.enabled || !aiSettings.apiKey) {
    return bulletPoint; // Return original if AI not configured
  }
  
  const prompt = job 
    ? `Enhance this resume bullet point to better match this job posting. Make it more impactful, quantify achievements where possible, and use strong action verbs. Keep it concise (1-2 lines).

Job Title: ${job.title}
Company: ${job.company_name}
Required Skills: ${job.required_skills || 'Not specified'}

Original bullet point: ${bulletPoint}

Enhanced bullet point:`
    : `Enhance this resume bullet point. Make it more impactful, quantify achievements where possible, and use strong action verbs. Keep it concise (1-2 lines).

Original: ${bulletPoint}

Enhanced:`;
  
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
 * Enhance all work experiences for a resume
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
  
  const enhanced: WorkExperience[] = [];
  
  for (const experience of workExperiences) {
    const enhancedBulletPoints: string[] = [];
    
    // Enhance each bullet point
    for (const bulletPoint of experience.bulletPoints) {
      const enhanced = await enhanceBulletPoint(bulletPoint, job, aiSettings);
      enhancedBulletPoints.push(enhanced);
    }
    
    enhanced.push({
      ...experience,
      bulletPoints: enhancedBulletPoints
    });
  }
  
  return enhanced;
}

/**
 * Generate a tailored summary/objective for a specific job
 */
export async function generateTailoredSummary(
  resume: Resume,
  job: Job,
  settings?: AISettings
): Promise<string> {
  const aiSettings = settings || getAISettings();
  
  if (!aiSettings.enabled || !aiSettings.apiKey) {
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
    if (aiSettings.provider === 'openai') {
      return await callOpenAI(prompt, aiSettings);
    } else if (aiSettings.provider === 'anthropic') {
      return await callAnthropic(prompt, aiSettings);
    } else {
      return resume.full_text.split('\n').slice(0, 3).join('\n');
    }
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return resume.full_text.split('\n').slice(0, 3).join('\n');
  }
}

/**
 * Enhance entire resume for a specific job
 */
export async function enhanceResumeForJob(
  resume: Resume,
  job: Job,
  settings?: AISettings
): Promise<EnhancedResume> {
  const aiSettings = settings || getAISettings();
  
  if (!aiSettings.enabled) {
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
  const enhancedWorkExperiences = resume.work_experiences
    ? await enhanceWorkExperiences(resume.work_experiences, job, aiSettings)
    : [];
  
  // Generate tailored summary
  const tailoredSummary = await generateTailoredSummary(resume, job, aiSettings);
  
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
  
  return {
    original: resume,
    enhanced: {
      work_experiences: enhancedWorkExperiences,
      full_text: enhancedText,
      tailored_summary: tailoredSummary
    },
    job
  };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt: string, settings: AISettings): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional resume writer and career coach. Provide concise, impactful improvements to resume content. Focus on quantifiable achievements and strong action verbs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
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
