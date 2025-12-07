import mammoth from 'mammoth';
import type { ResumeSection, ResumeBulletPoint, WorkExperience, EducationEntry } from './database';

export interface ParsedDOCX {
  fullText: string;
  html: string;
  sections: ResumeSection[];
  workExperiences: WorkExperience[];
  education: EducationEntry[];
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
    let fullText = textResult.value;
    const html = htmlResult.value;
    
    // Extract headers for contact info that might be in document headers
    try {
      const { default: PizZip } = await import('pizzip');
      const zip = new PizZip(arrayBuffer);
      
      // Try to extract header content
      const headerFiles = ['word/header1.xml', 'word/header2.xml', 'word/header3.xml'];
      for (const headerFile of headerFiles) {
        try {
          const headerXml = zip.file(headerFile)?.asText();
          if (headerXml) {
            // Extract text content from XML (simple approach - strips XML tags)
            const headerText = headerXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            console.log('📋 Extracted header text:', headerText);
            // Prepend header text to fullText so contact info is searchable
            fullText = headerText + '\n' + fullText;
          }
        } catch (e) {
          // Header file doesn't exist, continue
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not extract headers:', error);
    }
    
    // Parse the text into structured data
    const sections = parseSections(html, fullText);
    let workExperiences = parseWorkExperience(fullText);
    
    // If no work experiences found or they look malformed, try AI parsing
    const hasValidExperiences = workExperiences.length > 0 && 
                                 workExperiences.some(exp => exp.bulletPoints && exp.bulletPoints.length > 0);
    
    if (!hasValidExperiences) {
      console.log('⚠️ Traditional parser found no valid experiences, will try AI parsing later...');
      // Don't call AI here - will be called when user uploads resume
    }
    
    const skills = parseSkills(fullText);
    const education = parseEducation(fullText);
    const contactInfo = parseContactInfo(fullText);
    
    return {
      fullText,
      html,
      sections,
      workExperiences,
      education,
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
  
  console.log('🔍 Parsing work experience from text:', text.substring(0, 200) + '...');
  
  // Find the Experience section
  let inExperienceSection = false;
  let experienceSectionEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^experience$/i.test(line) || /^work\s+experience$/i.test(line) || /^professional\s+experience$/i.test(line)) {
      inExperienceSection = true;
      console.log('  📍 Found Experience section at line', i);
      continue;
    }
    if (inExperienceSection && /^(education|skills|projects|certifications|relevant\s+projects)$/i.test(line)) {
      experienceSectionEnd = i;
      console.log('  📍 Experience section ends at line', i);
      break;
    }
  }
  
  if (!inExperienceSection) {
    console.log('  ⚠️ No Experience section found');
    return [];
  }
  
  // Multiple patterns to try
  const titleCompanyPattern = /^(.+?)\s+(?:at|@|\||–|—)\s+(.+?)(?:\s*[,|\(]|$)/i;
  const datePattern = /(\d{4}|\w{3,9}\s+\d{4})\s*[-–—to]*\s*(present|current|\d{4}|\w{3,9}\s+\d{4})?/i;
  
  let currentExperience: Partial<WorkExperience> | null = null;
  let bulletPoints: string[] = [];
  let currentBullet: string[] = []; // Collect multi-line bullet text
  let potentialCompany: string | null = null; // Store company name if found on its own line
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Skip lines before experience section
    if (!inExperienceSection) {
      if (/^experience$/i.test(line) || /^work\s+experience$/i.test(line)) {
        inExperienceSection = true;
      }
      continue;
    }
    
    // Stop at next major section
    if (experienceSectionEnd !== -1 && i >= experienceSectionEnd) {
      break;
    }
    
    // Show first few chars for debugging bullets
    const firstChars = line.substring(0, 5).split('').map(c => c.charCodeAt(0)).join(',');
    console.log(`  Line ${i}: "${line.substring(0, 80)}" [chars: ${firstChars}]`);
    
    const titleCompanyMatch = line.match(titleCompanyPattern);
    const dateMatch = line.match(datePattern);
    const isBulletStart = /^[\u2022\u25E6\u2023\u2043•●○■□▪▫-]\s*/.test(line);
    
    if (isBulletStart) {
      console.log('  🎯 Detected bullet start!');
    }
    
    // Check if this is a standalone company name (capitalized, not a bullet, no dates)
    const isStandaloneCompany = !isBulletStart && !dateMatch && line.length < 60 && 
                                /^[A-Z]/.test(line) && !/^(provide|support|develop|manage|lead|maintain|handle|create)/i.test(line);
    
    if (titleCompanyMatch) {
      // Save any pending bullet
      if (currentBullet.length > 0) {
        bulletPoints.push(currentBullet.join(' '));
        currentBullet = [];
      }
      
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
      potentialCompany = null;
      
      if (dateMatch) {
        currentExperience.startDate = dateMatch[1];
        currentExperience.endDate = dateMatch[2] || undefined;
        currentExperience.current = /present|current/i.test(dateMatch[2] || '');
      }
    } else if (isStandaloneCompany && !currentExperience) {
      // This might be a company name on its own line
      potentialCompany = line;
      console.log('  🏢 Potential company:', potentialCompany);
    } else if (potentialCompany && dateMatch) {
      // Line with date after company name - this is likely the job title
      // Save previous experience if exists
      if (currentBullet.length > 0) {
        bulletPoints.push(currentBullet.join(' '));
        currentBullet = [];
      }
      
      if (currentExperience && currentExperience.title && currentExperience.company) {
        experiences.push({
          ...currentExperience,
          bulletPoints
        } as WorkExperience);
      }
      
      // Extract title (everything before the date)
      const titleMatch = line.match(/^(.+?)\s+(\d{4}|\w{3,9}\s+\d{4})/i);
      const title = titleMatch ? titleMatch[1].trim() : line.replace(dateMatch[0], '').trim();
      
      currentExperience = {
        title: title,
        company: potentialCompany,
        startDate: dateMatch[1],
        endDate: dateMatch[2] || undefined,
        current: /present|current/i.test(dateMatch[2] || '')
      };
      bulletPoints = [];
      potentialCompany = null;
      console.log('  ✅ Created experience:', currentExperience);
    } else if (dateMatch && currentExperience) {
      currentExperience.startDate = dateMatch[1];
      currentExperience.endDate = dateMatch[2] || undefined;
      currentExperience.current = /present|current/i.test(dateMatch[2] || '');
    } else if (isBulletStart && currentExperience) {
      // Save previous bullet if exists
      if (currentBullet.length > 0) {
        const completeBullet = currentBullet.join(' ');
        bulletPoints.push(completeBullet);
        console.log('  📝 Saved bullet:', completeBullet.substring(0, 60));
      }
      // Start new bullet
      const bulletText = line.replace(/^[\u2022\u25E6\u2023\u2043•●○■□▪▫-]\s*/, '').trim();
      currentBullet = [bulletText];
      console.log('  🔵 Starting new bullet:', bulletText.substring(0, 60));
    } else if (currentBullet.length > 0 && currentExperience && !titleCompanyMatch && !dateMatch && !isStandaloneCompany) {
      // Continue multi-line bullet (not a new section header or date)
      currentBullet.push(line);
      console.log('  ➕ Continuing bullet:', line.substring(0, 60));
    }
  }
  
  // Save any pending bullet
  if (currentBullet.length > 0) {
    bulletPoints.push(currentBullet.join(' '));
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
 * Extract skills from resume text - parse actual skills section
 */
function parseSkills(text: string): string[] {
  const skills: string[] = [];
  const lines = text.split('\n');
  
  console.log('🔧 Parsing skills from text');
  
  // Find skills section start
  let skillsStartIndex = -1;
  let skillsEndIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if we're entering the technical skills section (main header)
    if (/^technical\s+skills$/i.test(line)) {
      skillsStartIndex = i + 1;
      console.log('  📍 Found Technical Skills section at line', i);
      continue;
    }
    
    // If we're past the skills section start, look for the end
    if (skillsStartIndex !== -1 && skillsEndIndex === -1) {
      // Exit skills section if we hit another major section (Experience, Education, etc.)
      if (/^(experience|education|certifications|projects|summary|professional\s+experience|work\s+history)$/i.test(line)) {
        skillsEndIndex = i;
        console.log('  📍 Skills section ends at line', i);
        break;
      }
    }
  }
  
  // If we found a skills section, parse all lines within it
  if (skillsStartIndex !== -1) {
    const skillsLines = skillsEndIndex !== -1 
      ? lines.slice(skillsStartIndex, skillsEndIndex)
      : lines.slice(skillsStartIndex);
    
    console.log('  📝 Skills section lines:', skillsLines.length);
    
    for (const line of skillsLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Skip lines that are bullet points (work experience section)
      if (/^[•●○■□▪▫\-\*]/.test(trimmed)) continue;
      
      // Check if line is a category with colon (e.g., "Languages & Scripting: Java, Python, ...")
      const categoryMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
      
      if (categoryMatch) {
        const categoryName = categoryMatch[1].trim();
        const skillsText = categoryMatch[2].trim();
        
        console.log(`  📂 Processing category: "${categoryName}"`);
        
        // Split by commas and clean up
        const extractedSkills = skillsText
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0 && s.length < 100); // Allow longer skill names
        
        skills.push(...extractedSkills);
        console.log(`  ✅ Found ${extractedSkills.length} skills:`, extractedSkills);
      } else if (trimmed.length > 0 && trimmed.length < 200) {
        // Might be a continuation line or standalone skills
        // Only process if it looks like a list of skills (contains commas or is short)
        if (trimmed.includes(',')) {
          const extractedSkills = trimmed
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.length < 100 && !/^(and|or|&|\d+)$/i.test(s));
          
          if (extractedSkills.length > 0) {
            skills.push(...extractedSkills);
            console.log('  ✅ Found additional skills:', extractedSkills);
          }
        }
      }
    }
  }
  
  // Remove duplicates while preserving order
  const uniqueSkills = [...new Set(skills)];
  
  console.log(`  🎯 Total unique skills parsed: ${uniqueSkills.length}`);
  return uniqueSkills;
}

/**
 * Parse education entries - simplified to handle structured resume format
 */
function parseEducation(text: string): EducationEntry[] {
  const education: EducationEntry[] = [];
  const lines = text.split('\n');
  
  console.log('🎓 Parsing education from text');
  
  // Find education section boundaries
  let educationStart = -1;
  let educationEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Find education section header
    if (/^education$/i.test(line)) {
      educationStart = i + 1;
      console.log('  📍 Found education section at line', i);
      continue;
    }
    
    // Find end of education section (next major section)
    if (educationStart !== -1 && educationEnd === -1) {
      if (/^(technical\s+skills|experience|skills|certifications|projects|summary|professional\s+experience)/i.test(line)) {
        educationEnd = i;
        console.log('  📍 Education section ends at line', i);
        break;
      }
    }
  }
  
  // If we found an education section, parse it
  if (educationStart !== -1) {
    const educationLines = educationEnd !== -1 
      ? lines.slice(educationStart, educationEnd)
      : lines.slice(educationStart);
    
    console.log('  📝 Education section lines:', educationLines.length);
    
    let currentSchool = '';
    let currentDegree = '';
    let currentField = '';
    let currentDate = '';
    let currentLocation = '';
    
    for (const line of educationLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      console.log('  Checking line:', trimmed);
      
      // Check if line looks like a school name (usually first, often longer, contains "University", "College", "Institute")
      if (/university|college|institute|school|academy/i.test(trimmed)) {
        // Save previous entry if exists
        if (currentSchool && currentDegree) {
          education.push({
            school: currentSchool,
            degree: currentDegree,
            field: currentField || undefined,
            graduationDate: currentDate || undefined,
          });
          console.log('  ✅ Saved education entry:', { school: currentSchool, degree: currentDegree });
        }
        
        // Start new entry
        currentSchool = trimmed;
        currentDegree = '';
        currentField = '';
        currentDate = '';
        currentLocation = '';
      }
      // Check for degree with field (e.g., "Bachelor of Science, Computer Science")
      else if (/bachelor|master|associate|doctorate|ph\.?d|b\.?[sa]\.?|m\.?[sa]\.?|mba/i.test(trimmed)) {
        currentDegree = trimmed;
        
        // Try to extract field from same line
        const fieldMatch = trimmed.match(/,\s*(.+?)(?:\s*$|\s*\()/);
        if (fieldMatch) {
          currentField = fieldMatch[1].trim();
        }
      }
      // Check for date patterns (may include location too)
      else if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(trimmed)) {
        const dateMatch = trimmed.match(/\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+)?\d{4}\b/i);
        if (dateMatch) {
          currentDate = dateMatch[0];
        }
        // Location might be on same line
        if (!currentLocation && trimmed.includes(',')) {
          const parts = trimmed.split(',');
          if (parts.length >= 2) {
            currentLocation = parts.slice(0, -1).join(',').trim();
          }
        }
      }
    }
    
    // Save last entry
    if (currentSchool && currentDegree) {
      education.push({
        school: currentSchool,
        degree: currentDegree,
        field: currentField || undefined,
        graduationDate: currentDate || undefined,
      });
      console.log('  ✅ Saved final education entry:', { school: currentSchool, degree: currentDegree });
    }
  }
  
  console.log(`  📚 Parsed ${education.length} education entries`);
  return education;
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
