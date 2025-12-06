import mammoth from 'mammoth';
import type { ResumeSection, ResumeBulletPoint, WorkExperience } from './database';

export interface ParsedDOCX {
  fullText: string;
  html: string;
  sections: ResumeSection[];
  workExperiences: WorkExperience[];
  skills: string[];
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
}

/**
 * Parse DOCX resume file and extract structured content with formatting
 */
export async function parseDOCXResume(file: File): Promise<ParsedDOCX> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract HTML with formatting
    const htmlResult = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh"
        ]
      }
    );
    
    // Extract plain text
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const fullText = textResult.value;
    const html = htmlResult.value;
    
    // Parse the text into structured data
    const sections = parseSections(html, fullText);
    const workExperiences = parseWorkExperience(fullText);
    const skills = parseSkills(fullText);
    const contactInfo = parseContactInfo(fullText);
    
    return {
      fullText,
      html,
      sections,
      workExperiences,
      skills,
      ...contactInfo
    };
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

/**
 * Parse HTML into sections with formatting preserved
 */
function parseSections(html: string, plainText: string): ResumeSection[] {
  const sections: ResumeSection[] = [];
  
  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements = doc.body.children;
  
  const sectionPatterns = {
    experience: /^(work\s+)?experience|employment\s+history|professional\s+experience/i,
    education: /^education|academic\s+background/i,
    skills: /^skills|technical\s+skills|core\s+competencies/i,
    summary: /^summary|profile|objective|about/i,
    certifications: /^certifications?|licenses?/i,
  };
  
  let currentSection: ResumeSection | null = null;
  let currentContent: string[] = [];
  let currentItems: ResumeBulletPoint[] = [];
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const text = element.textContent?.trim() || '';
    
    if (!text) continue;
    
    // Check if this is a section header (h1, h2, h3, or strong/bold text)
    const isHeading = /^h[1-3]$/i.test(element.tagName) || 
                     (element.querySelector('strong') && text.length < 50);
    
    let isSectionHeader = false;
    if (isHeading) {
      for (const [type, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(text)) {
          // Save previous section
          if (currentSection) {
            currentSection.content = currentContent.join('\n');
            currentSection.items = currentItems;
            sections.push(currentSection);
          }
          
          // Start new section
          currentSection = {
            type: type as any,
            title: text,
            content: '',
            items: [],
            formatting: detectFormatting(element)
          };
          currentContent = [];
          currentItems = [];
          isSectionHeader = true;
          break;
        }
      }
    }
    
    if (!isSectionHeader && currentSection) {
      // Check if this is a list item
      if (element.tagName === 'UL' || element.tagName === 'OL') {
        const listItems = element.querySelectorAll('li');
        listItems.forEach(li => {
          const itemText = li.textContent?.trim() || '';
          currentItems.push({
            text: itemText,
            level: 0,
            formatting: detectFormatting(li)
          });
          currentContent.push(itemText);
        });
      } else {
        // Check if it looks like a bullet point
        const bulletMatch = text.match(/^[\u2022\u25E6\u2023\u2043•●○■□▪▫-]\s*(.+)/);
        if (bulletMatch) {
          currentItems.push({
            text: bulletMatch[1].trim(),
            level: 0,
            formatting: detectFormatting(element)
          });
        }
        currentContent.push(text);
      }
    } else if (!isSectionHeader && !currentSection) {
      // This might be header info
      if (!sections.length) {
        sections.push({
          type: 'header',
          content: text,
          items: [],
          formatting: detectFormatting(element)
        });
      }
    }
  }
  
  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n');
    currentSection.items = currentItems;
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Detect formatting from HTML element
 */
function detectFormatting(element: Element): { bold?: boolean; italic?: boolean } {
  const hasStrong = element.querySelector('strong') || element.querySelector('b');
  const hasEm = element.querySelector('em') || element.querySelector('i');
  const style = window.getComputedStyle(element);
  
  return {
    bold: !!hasStrong || style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 600,
    italic: !!hasEm || style.fontStyle === 'italic'
  };
}

/**
 * Parse work experience entries
 */
function parseWorkExperience(text: string): WorkExperience[] {
  const experiences: WorkExperience[] = [];
  const lines = text.split('\n');
  
  const titleCompanyPattern = /^(.+?)\s+(?:at|@|\||–|—)\s+(.+?)(?:\s*[,|\(]|$)/i;
  const datePattern = /(\d{4}|\w{3,9}\s+\d{4})\s*[-–—to]*\s*(present|current|\d{4}|\w{3,9}\s+\d{4})?/i;
  
  let currentExperience: Partial<WorkExperience> | null = null;
  let bulletPoints: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const titleCompanyMatch = line.match(titleCompanyPattern);
    const dateMatch = line.match(datePattern);
    
    if (titleCompanyMatch) {
      if (currentExperience && currentExperience.title && currentExperience.company) {
        experiences.push({
          ...currentExperience,
          bulletPoints
        } as WorkExperience);
      }
      
      currentExperience = {
        title: titleCompanyMatch[1].trim(),
        company: titleCompanyMatch[2].trim()
      };
      bulletPoints = [];
      
      if (dateMatch) {
        currentExperience.startDate = dateMatch[1];
        currentExperience.endDate = dateMatch[2] || undefined;
        currentExperience.current = /present|current/i.test(dateMatch[2] || '');
      }
    } else if (dateMatch && currentExperience) {
      currentExperience.startDate = dateMatch[1];
      currentExperience.endDate = dateMatch[2] || undefined;
      currentExperience.current = /present|current/i.test(dateMatch[2] || '');
    } else if (/^[\u2022\u25E6\u2023\u2043•●○■□▪▫-]\s*/.test(line) && currentExperience) {
      bulletPoints.push(line.replace(/^[\u2022\u25E6\u2023\u2043•●○■□▪▫-]\s*/, '').trim());
    }
  }
  
  if (currentExperience && currentExperience.title && currentExperience.company) {
    experiences.push({
      ...currentExperience,
      bulletPoints
    } as WorkExperience);
  }
  
  return experiences;
}

/**
 * Extract skills from resume text
 */
function parseSkills(text: string): string[] {
  const skills: Set<string> = new Set();
  
  const commonSkills = [
    // Programming languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust',
    // Web technologies
    'React', 'Angular', 'Vue', 'Node.js', 'Express', 'HTML', 'CSS', 'SASS', 'Tailwind',
    // Databases
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB',
    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Git',
    // Other tools
    'Figma', 'Photoshop', 'Excel', 'Tableau', 'PowerBI'
  ];
  
  const lowerText = text.toLowerCase();
  
  for (const skill of commonSkills) {
    // Escape special regex characters in skill name
    const escapedSkill = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedSkill}\\b`, 'i');
    if (pattern.test(lowerText)) {
      skills.add(skill);
    }
  }
  
  return Array.from(skills);
}

/**
 * Extract contact information
 */
function parseContactInfo(text: string): { email?: string; phone?: string; linkedin?: string; website?: string } {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phonePattern = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const linkedinPattern = /(?:linkedin\.com\/in\/)([\w-]+)/i;
  const websitePattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/;
  
  const emailMatch = text.match(emailPattern);
  const phoneMatch = text.match(phonePattern);
  const linkedinMatch = text.match(linkedinPattern);
  const websiteMatch = text.match(websitePattern);
  
  return {
    email: emailMatch?.[0],
    phone: phoneMatch?.[0],
    linkedin: linkedinMatch?.[0],
    website: websiteMatch?.[0]
  };
}
