import * as pdfjsLib from 'pdfjs-dist';
import type { ResumeSection, ResumeBulletPoint, WorkExperience } from './database';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedPDF {
  fullText: string;
  sections: ResumeSection[];
  workExperiences: WorkExperience[];
  skills: string[];
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
}

/**
 * Parse PDF resume file and extract structured content
 */
export async function parsePDFResume(file: File): Promise<ParsedPDF> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const textByPage: string[] = [];
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textByPage.push(pageText);
      fullText += pageText + '\n';
    }
    
    // Parse the text into structured data
    const sections = parseSections(fullText);
    const workExperiences = parseWorkExperience(fullText);
    const skills = parseSkills(fullText);
    const contactInfo = parseContactInfo(fullText);
    
    return {
      fullText,
      sections,
      workExperiences,
      skills,
      ...contactInfo
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

/**
 * Parse resume into sections (Experience, Education, Skills, etc.)
 */
function parseSections(text: string): ResumeSection[] {
  const sections: ResumeSection[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Common section headers
  const sectionPatterns = {
    experience: /^(work\s+)?experience|employment\s+history|professional\s+experience/i,
    education: /^education|academic\s+background/i,
    skills: /^skills|technical\s+skills|core\s+competencies/i,
    summary: /^summary|profile|objective|about/i,
    certifications: /^certifications?|licenses?/i,
  };
  
  let currentSection: ResumeSection | null = null;
  let currentContent: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this line is a section header
    let isSectionHeader = false;
    for (const [type, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(trimmedLine)) {
        // Save previous section if exists
        if (currentSection) {
          currentSection.content = currentContent.join('\n');
          currentSection.items = parseBulletPoints(currentContent);
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          type: type as any,
          title: trimmedLine,
          content: '',
          items: []
        };
        currentContent = [];
        isSectionHeader = true;
        break;
      }
    }
    
    if (!isSectionHeader && currentSection) {
      currentContent.push(trimmedLine);
    } else if (!isSectionHeader && !currentSection) {
      // This might be header info (name, contact, etc.)
      if (!sections.length) {
        sections.push({
          type: 'header',
          content: trimmedLine,
          items: []
        });
      }
    }
  }
  
  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n');
    currentSection.items = parseBulletPoints(currentContent);
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Parse bullet points from content
 */
function parseBulletPoints(lines: string[]): ResumeBulletPoint[] {
  const bulletPoints: ResumeBulletPoint[] = [];
  const bulletPattern = /^[\u2022\u25E6\u2023\u2043•●○■□▪▫-]\s*(.+)/;
  
  for (const line of lines) {
    const match = line.match(bulletPattern);
    if (match) {
      bulletPoints.push({
        text: match[1].trim(),
        level: 0
      });
    }
  }
  
  return bulletPoints;
}

/**
 * Parse work experience entries
 */
function parseWorkExperience(text: string): WorkExperience[] {
  const experiences: WorkExperience[] = [];
  const lines = text.split('\n');
  
  // Pattern to match job titles and companies
  // Example: "Software Engineer | Google" or "Software Engineer at Google"
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
      // Save previous experience
      if (currentExperience && currentExperience.title && currentExperience.company) {
        experiences.push({
          ...currentExperience,
          bulletPoints
        } as WorkExperience);
      }
      
      // Start new experience
      currentExperience = {
        title: titleCompanyMatch[1].trim(),
        company: titleCompanyMatch[2].trim()
      };
      bulletPoints = [];
      
      // Check if dates are on the same line
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
      // This is a bullet point
      bulletPoints.push(line.replace(/^[\u2022\u25E6\u2023\u2043•●○■□▪▫-]\s*/, '').trim());
    }
  }
  
  // Save last experience
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
  
  // ENHANCED: More comprehensive skills list
  const commonSkills = [
    // Programming languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust', 'Scala', 'Perl', 'R',
    // Web technologies
    'React', 'Angular', 'Vue', 'Node.js', 'Express', 'HTML', 'CSS', 'SASS', 'LESS', 'Tailwind', 'Bootstrap', 'jQuery', 'Next.js', 'Nuxt', 'Gatsby',
    // Backend frameworks
    'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', '.NET', 'ASP.NET', 'Laravel', 'Rails', 'Sinatra',
    // Databases
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB', 'Cassandra', 'Oracle', 'SQLite', 'MariaDB', 'Elasticsearch',
    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Git', 'GitHub', 'GitLab', 'Terraform', 'Ansible', 'Chef', 'Puppet',
    // Testing
    'Jest', 'Mocha', 'Cypress', 'Selenium', 'JUnit', 'PyTest', 'Testing', 'Unit Testing', 'Integration Testing', 'TDD',
    // Design & Tools
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'InDesign',
    // Data & Analytics
    'Excel', 'Tableau', 'PowerBI', 'Power BI', 'Data Analysis', 'Data Visualization', 'Pandas', 'NumPy', 'SciPy',
    // Methodologies
    'Agile', 'Scrum', 'Kanban', 'Waterfall', 'DevOps', 'JIRA', 'Confluence',
    // APIs & Protocols
    'REST', 'RESTful', 'GraphQL', 'SOAP', 'Microservices', 'API', 'WebSocket',
    // Soft Skills
    'Leadership', 'Communication', 'Problem Solving', 'Teamwork', 'Project Management', 'Time Management', 'Critical Thinking'
  ];
  
  const lowerText = text.toLowerCase();
  
  console.log('🔍 PDF Parser: Extracting skills from text (length:', text.length, ')');
  
  for (const skill of commonSkills) {
    // Escape special regex characters in skill name
    const escapedSkill = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedSkill}\\b`, 'i');
    if (pattern.test(lowerText)) {
      skills.add(skill);
    }
  }
  
  console.log('✅ PDF Parser: Found', skills.size, 'skills');
  
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
