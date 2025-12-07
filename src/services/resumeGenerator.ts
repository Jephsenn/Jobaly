import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import type { Resume, WorkExperience, ResumeSection } from './database';
import type { EnhancedResume } from './resumeEnhancer';

/**
 * Generate a DOCX file from enhanced resume data, preserving original formatting
 * Returns status of bullet point updates (only for DOCX modification path)
 */
export async function generateResumeDocx(
  enhancedResume: EnhancedResume,
  filename?: string
): Promise<BulletUpdateStatus[]> {
  const { original, enhanced, job } = enhancedResume;
  
  // If we have the original DOCX file, modify it directly to preserve ALL formatting
  if (original.original_file && original.file_type === 'docx') {
    return modifyOriginalDocx(enhancedResume, filename);
  }
  
  // If original has sections with formatting, use those as template
  if (original.sections && original.sections.length > 0) {
    await generateFromTemplate(enhancedResume, filename);
    return []; // Template generation doesn't track individual bullet updates
  }
  
  // Fallback to simple generation if no sections available
  await generateSimple(enhancedResume, filename);
  return []; // Simple generation doesn't track individual bullet updates
}

export interface BulletUpdateStatus {
  bulletIndex: number;
  aiEnhanced: boolean;  // Was the bullet enhanced by AI?
  docxUpdated: boolean; // Was it successfully found and updated in DOCX XML?
  originalText: string;
  enhancedText: string;
}

/**
 * Modify the original DOCX file directly, preserving 100% of formatting
 * Only replaces bullet point text
 * Returns status of each bullet update
 */
async function modifyOriginalDocx(
  enhancedResume: EnhancedResume,
  filename?: string
): Promise<BulletUpdateStatus[]> {
  const { original, enhanced, job } = enhancedResume;
  
  try {
    // Decode base64 to binary
    const base64Data = original.original_file!;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Load DOCX as ZIP
    const zip = new PizZip(bytes);
    
    // Get document.xml (main content)
    const docXml = zip.file('word/document.xml');
    if (!docXml) {
      throw new Error('Could not find document.xml in DOCX file');
    }
    
    let xmlContent = docXml.asText();
    
    // Create a flat list of all enhanced bullets
    const allEnhancedBullets: string[] = [];
    enhanced.work_experiences?.forEach(exp => {
      exp.bulletPoints.forEach(bullet => {
        allEnhancedBullets.push(bullet);
      });
    });
    
    // Find and replace bullet points in XML
    // DOCX uses <w:t> tags for text content
    // Bullets are typically in <w:p> paragraphs with <w:numPr> (numbering properties)
    
    let enhancedBulletIndex = 0;
    const originalBullets = extractBulletsFromSections(original.sections || []);
    const updateStatuses: BulletUpdateStatus[] = [];
    
    // Log changes for debugging
    console.group('🎨 Resume Enhancement Changes');
    console.log(`Total bullet points to enhance: ${Math.min(originalBullets.length, allEnhancedBullets.length)}`);
    console.log('---');
    
    // Replace each original bullet with enhanced version
    for (let i = 0; i < originalBullets.length && i < allEnhancedBullets.length; i++) {
      const originalText = originalBullets[i];
      const enhancedText = allEnhancedBullets[i];
      const aiEnhanced = originalText !== enhancedText;
      
      // Log the change
      console.log(`\n📌 Bullet ${i + 1}:`);
      console.log(`   BEFORE: "${originalText}"`);
      console.log(`   AFTER:  "${enhancedText}"`);
      console.log(`   Changed: ${aiEnhanced ? '✅ Yes' : '❌ No (AI returned same text)'}`);
      
      // Escape XML special characters
      const escapedOriginal = escapeXml(originalText);
      const escapedEnhanced = escapeXml(enhancedText);
      
      // Find the original text in XML to show surrounding formatting
      const textPattern = new RegExp(`(<w:r[^>]*>.*?<w:t[^>]*>)${escapeRegex(escapedOriginal)}(</w:t>.*?</w:r>)`, 's');
      const match = xmlContent.match(textPattern);
      if (match) {
        // Extract font information from <w:rPr> (run properties) tag
        const fontMatch = match[0].match(/<w:rFonts[^>]*w:ascii="([^"]+)"/);
        const sizeMatch = match[0].match(/<w:sz[^>]*w:val="([^"]+)"/);
        if (fontMatch || sizeMatch) {
          console.log(`   📝 Format: ${fontMatch ? 'Font=' + fontMatch[1] : ''} ${sizeMatch ? 'Size=' + (parseInt(sizeMatch[1]) / 2) + 'pt' : ''}`);
        }
      }
      
      // Replace in XML (preserve all formatting tags)
      const beforeReplace = xmlContent;
      xmlContent = xmlContent.replace(
        new RegExp(`(<w:t[^>]*>)${escapeRegex(escapedOriginal)}(</w:t>)`, 'g'),
        `$1${escapedEnhanced}$2`
      );
      
      // Verify replacement worked
      const docxUpdated = beforeReplace !== xmlContent || !aiEnhanced;
      if (!docxUpdated && aiEnhanced) {
        console.warn(`   ⚠️ Warning: Text not found in XML. May need manual review.`);
      }
      
      // Track status
      updateStatuses.push({
        bulletIndex: i,
        aiEnhanced,
        docxUpdated,
        originalText,
        enhancedText
      });
    }
    
    console.log('\n---');
    console.log('✨ Enhancement complete!');
    console.groupEnd();
    
    // Update the document.xml in the ZIP
    zip.file('word/document.xml', xmlContent);
    
    // Generate new DOCX
    const modifiedDocx = zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    
    // Download
    const defaultFilename = filename || `${job?.company_name || 'Resume'}_${job?.title?.replace(/[^a-z0-9]/gi, '_') || 'Enhanced'}.docx`;
    saveAs(modifiedDocx, defaultFilename);
    
    return updateStatuses;
    
  } catch (error) {
    console.error('Failed to modify original DOCX, falling back to template generation:', error);
    // Fallback to template generation if direct modification fails
    if (original.sections && original.sections.length > 0) {
      await generateFromTemplate(enhancedResume, filename);
    } else {
      await generateSimple(enhancedResume, filename);
    }
    // Return empty status on fallback
    return [];
  }
}

/**
 * Extract bullet point text from sections for matching
 */
function extractBulletsFromSections(sections: ResumeSection[]): string[] {
  const bullets: string[] = [];
  
  for (const section of sections) {
    if (section.type === 'experience' && section.items) {
      for (const item of section.items) {
        bullets.push(item.text);
      }
    }
  }
  
  return bullets;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape regex special characters
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate resume from original template structure, preserving all formatting
 * ONLY enhances bullet points, keeps everything else identical
 */
async function generateFromTemplate(
  enhancedResume: EnhancedResume,
  filename?: string
): Promise<void> {
  const { original, enhanced, job } = enhancedResume;
  const paragraphs: Paragraph[] = [];
  
  // Create a flat list of all enhanced bullets for matching
  const allEnhancedBullets: string[] = [];
  enhanced.work_experiences?.forEach(exp => {
    exp.bulletPoints.forEach(bullet => {
      allEnhancedBullets.push(bullet);
    });
  });
  
  let enhancedBulletIndex = 0;
  
  // Process each section, preserving EXACT structure
  for (const section of (original.sections || [])) {
    // Add section title if it exists (preserve exact formatting)
    if (section.title) {
      const titleFormatting = section.formatting || {};
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              bold: titleFormatting.bold,
              italics: titleFormatting.italic,
              size: titleFormatting.fontSize ? titleFormatting.fontSize * 2 : undefined,
              font: titleFormatting.fontFamily
            })
          ],
          alignment: titleFormatting.alignment === 'center' ? AlignmentType.CENTER : 
                     titleFormatting.alignment === 'right' ? AlignmentType.RIGHT : 
                     AlignmentType.LEFT,
          spacing: { after: 120 }
        })
      );
    }
    
    // Add section content (non-bullet text) - preserve exactly
    if (section.content && !section.items?.length) {
      const contentLines = section.content.split('\n').filter(line => line.trim());
      for (const line of contentLines) {
        const contentFormatting = section.formatting || {};
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: contentFormatting.bold,
                italics: contentFormatting.italic,
                size: contentFormatting.fontSize ? contentFormatting.fontSize * 2 : undefined,
                font: contentFormatting.fontFamily
              })
            ],
            alignment: contentFormatting.alignment === 'center' ? AlignmentType.CENTER : 
                       contentFormatting.alignment === 'right' ? AlignmentType.RIGHT : 
                       AlignmentType.LEFT,
            spacing: { after: 100 }
          })
        );
      }
    }
    
    // Process items (bullet points or other list items)
    if (section.items && section.items.length > 0) {
      for (const item of section.items) {
        const itemFormatting = item.formatting || {};
        
        // For experience sections, use enhanced bullet if available
        let bulletText = item.text;
        if (section.type === 'experience' && enhancedBulletIndex < allEnhancedBullets.length) {
          bulletText = allEnhancedBullets[enhancedBulletIndex];
          enhancedBulletIndex++;
        }
        
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: bulletText,
                bold: itemFormatting.bold,
                italics: itemFormatting.italic
              })
            ],
            bullet: {
              level: item.level || 0
            },
            spacing: { after: 80 }
          })
        );
      }
    }
  }
  
  // Create and download document
  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });
  
  const blob = await Packer.toBlob(doc);
  const defaultFilename = filename || `${job?.company_name || 'Resume'}_${job?.title?.replace(/[^a-z0-9]/gi, '_') || 'Enhanced'}.docx`;
  saveAs(blob, defaultFilename);
}

/**
 * Fallback: Simple generation without template
 */
async function generateSimple(
  enhancedResume: EnhancedResume,
  filename?: string
): Promise<void> {
  const { original, enhanced, job } = enhancedResume;
  
  // Build document sections
  const sections: Paragraph[] = [];
  
  // Header - Name and Contact Info
  sections.push(
    new Paragraph({
      text: original.name.replace(/\.(pdf|docx|doc|txt)$/i, '').toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );
  
  // Contact Information
  const contactInfo: string[] = [];
  if (original.email) contactInfo.push(original.email);
  if (original.phone) contactInfo.push(original.phone);
  if (original.linkedin) contactInfo.push(original.linkedin);
  if (original.website) contactInfo.push(original.website);
  
  if (contactInfo.length > 0) {
    sections.push(
      new Paragraph({
        text: contactInfo.join(' | '),
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );
  }
  
  // Tailored Summary
  if (enhanced.tailored_summary) {
    sections.push(
      new Paragraph({
        text: 'PROFESSIONAL SUMMARY',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 }
      })
    );
    
    sections.push(
      new Paragraph({
        text: enhanced.tailored_summary,
        spacing: { after: 400 }
      })
    );
  }
  
  // Enhanced Work Experience
  if (enhanced.work_experiences && enhanced.work_experiences.length > 0) {
    sections.push(
      new Paragraph({
        text: 'EXPERIENCE',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 }
      })
    );
    
    for (const experience of enhanced.work_experiences) {
      // Job Title and Company
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: experience.title,
              bold: true,
              size: 24
            }),
            new TextRun({
              text: ' | ',
              size: 24
            }),
            new TextRun({
              text: experience.company,
              bold: true,
              size: 24
            })
          ],
          spacing: { before: 200, after: 100 }
        })
      );
      
      // Dates and Location
      const dateLocationParts: string[] = [];
      if (experience.startDate) {
        const dateRange = `${experience.startDate} - ${experience.endDate || 'Present'}`;
        dateLocationParts.push(dateRange);
      }
      if (experience.location) {
        dateLocationParts.push(experience.location);
      }
      
      if (dateLocationParts.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: dateLocationParts.join(' | '),
                italics: true
              })
            ],
            spacing: { after: 100 }
          })
        );
      }
      
      // Bullet Points
      for (const bullet of experience.bulletPoints) {
        sections.push(
          new Paragraph({
            text: bullet,
            bullet: {
              level: 0
            },
            spacing: { after: 100 }
          })
        );
      }
      
      sections.push(
        new Paragraph({
          text: '',
          spacing: { after: 200 }
        })
      );
    }
  }
  
  // Other Sections (Skills, Education, Certifications)
  if (original.sections) {
    const otherSections = original.sections.filter(s => 
      s.type !== 'experience' && s.type !== 'summary' && s.type !== 'header'
    );
    
    for (const section of otherSections) {
      if (section.title) {
        sections.push(
          new Paragraph({
            text: section.title.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 200 }
          })
        );
      }
      
      // Handle bullet points if available
      if (section.items && section.items.length > 0) {
        for (const item of section.items) {
          sections.push(
            new Paragraph({
              text: item.text,
              bullet: {
                level: item.level || 0
              },
              spacing: { after: 100 }
            })
          );
        }
      } else {
        // Add plain content
        const lines = section.content.split('\n').filter(line => line.trim());
        for (const line of lines) {
          sections.push(
            new Paragraph({
              text: line,
              spacing: { after: 100 }
            })
          );
        }
      }
      
      sections.push(
        new Paragraph({
          text: '',
          spacing: { after: 200 }
        })
      );
    }
  }
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });
  
  // Generate and download
  const blob = await Packer.toBlob(doc);
  const defaultFilename = job
    ? `${original.name.replace(/\.(pdf|docx|doc|txt)$/i, '')}_${job.company_name}_${job.title}.docx`.replace(/[^a-z0-9_.-]/gi, '_')
    : `${original.name.replace(/\.(pdf|docx|doc|txt)$/i, '')}_enhanced.docx`;
  
  saveAs(blob, filename || defaultFilename);
}

/**
 * Download original resume file (if available)
 */
export function downloadOriginalResume(resume: Resume): void {
  if (!resume.original_file || !resume.file_type) {
    alert('Original file not available for download');
    return;
  }
  
  // Convert base64 back to blob
  const byteCharacters = atob(resume.original_file);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  
  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'txt': 'text/plain'
  };
  
  const blob = new Blob([byteArray], { type: mimeTypes[resume.file_type] || 'application/octet-stream' });
  saveAs(blob, resume.name);
}

/**
 * Generate a simple text resume (fallback)
 */
export function downloadTextResume(enhancedResume: EnhancedResume, filename?: string): void {
  const { enhanced, job } = enhancedResume;
  const blob = new Blob([enhanced.full_text], { type: 'text/plain' });
  
  const defaultFilename = job
    ? `resume_${job.company_name}_${job.title}.txt`.replace(/[^a-z0-9_.-]/gi, '_')
    : 'resume_enhanced.txt';
  
  saveAs(blob, filename || defaultFilename);
}

/**
 * Extract person's name from resume (not filename)
 */
function extractPersonName(resume: Resume): string {
  // PRIORITY 0: Check user settings first
  try {
    const userSettings = localStorage.getItem('jobaly_user_settings');
    if (userSettings) {
      const parsed = JSON.parse(userSettings);
      if (parsed.name && parsed.name.trim().length > 0) {
        return parsed.name.trim();
      }
    }
  } catch (error) {
    // Continue to other methods if settings not available
  }
  
  // PRIORITY 1: Try to get name from full_text (usually at the very top)
  if (resume.full_text) {
    const lines = resume.full_text.split('\n');
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      // Look for a name-like line: 2-4 words, no special chars, no numbers (except maybe middle initial)
      if (line.length > 0 && 
          line.length < 50 &&
          !line.includes('@') && 
          !line.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) && // No phone numbers
          !line.toLowerCase().includes('linkedin') &&
          !line.toLowerCase().includes('http') &&
          !line.toLowerCase().includes('resume') &&
          !line.toLowerCase().includes('.com') &&
          /^[A-Z][a-z]+(\s+[A-Z]\.?)?\s+[A-Z][a-z]+$/.test(line)) { // Name pattern: "First Last" or "First M Last"
        return line;
      }
    }
  }
  
  // PRIORITY 2: Try to get name from the first section (usually header)
  if (resume.sections && resume.sections.length > 0) {
    const headerSection = resume.sections[0]; // First section is usually the header
    if (headerSection && headerSection.content) {
      const lines = headerSection.content.split('\n');
      for (const line of lines) {
        const cleaned = line.trim();
        if (cleaned.length > 0 && 
            cleaned.length < 50 &&
            !cleaned.includes('@') && 
            !cleaned.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) &&
            !cleaned.toLowerCase().includes('linkedin') &&
            !cleaned.toLowerCase().includes('http') &&
            /^[A-Z][a-z]+(\s+[A-Z]\.?)?\s+[A-Z][a-z]+$/.test(cleaned)) {
          return cleaned;
        }
      }
    }
  }
  
  // PRIORITY 3: Try to extract from email with separators (e.g., john.josephsen@gmail.com -> John Josephsen)
  if (resume.email) {
    const emailName = resume.email.split('@')[0];
    const parts = emailName.split(/[._-]/);
    if (parts.length >= 2) {
      return parts
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }
  }
  
  // PRIORITY 4: Ask user to add their name (better than showing filename)
  return 'Your Name';
}

/**
 * Generate a cover letter DOCX file
 */
export async function generateCoverLetterDocx(
  enhancedResume: EnhancedResume,
  filename?: string
): Promise<void> {
  const { enhanced, job, original } = enhancedResume;
  
  if (!enhanced.cover_letter) {
    throw new Error('No cover letter found in enhanced resume');
  }
  
  const coverLetterText = enhanced.cover_letter;
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const personName = extractPersonName(original);
  
  // Get user settings (prioritize over resume)
  let userName = personName;
  let userAddress = '';
  let userCity = '';
  let userState = '';
  let userZip = '';
  let userEmail = original.email;
  let userPhone = original.phone;
  let userLinkedIn = original.linkedin;
  
  try {
    const userSettings = localStorage.getItem('jobaly_user_settings');
    if (userSettings) {
      const parsed = JSON.parse(userSettings);
      if (parsed.name) userName = parsed.name;
      if (parsed.address) userAddress = parsed.address;
      if (parsed.city) userCity = parsed.city;
      if (parsed.state) userState = parsed.state;
      if (parsed.zip) userZip = parsed.zip;
      if (parsed.email) userEmail = parsed.email;
      if (parsed.phone) userPhone = parsed.phone;
    }
  } catch (error) {
    // Use resume/extracted data if settings not available
  }
  
  // Create document sections
  const sections: Paragraph[] = [];
  
  // Add sender info (your contact info) - traditional business letter format
  if (userName) {
    sections.push(
      new Paragraph({
        text: userName,
        spacing: { after: 0 }
      })
    );
  }
  
  if (userAddress) {
    sections.push(
      new Paragraph({
        text: userAddress,
        spacing: { after: 0 }
      })
    );
  }
  
  // City, State ZIP on one line
  const cityStateZip: string[] = [];
  if (userCity) cityStateZip.push(userCity);
  if (userState) cityStateZip.push(userState);
  const cityStateLine = cityStateZip.join(', ');
  const fullCityLine = userZip ? `${cityStateLine} ${userZip}` : cityStateLine;
  
  if (fullCityLine) {
    sections.push(
      new Paragraph({
        text: fullCityLine,
        spacing: { after: 0 }
      })
    );
  }
  
  // Email and phone on separate lines
  if (userEmail) {
    sections.push(
      new Paragraph({
        text: userEmail,
        spacing: { after: 0 }
      })
    );
  }
  
  if (userPhone) {
    sections.push(
      new Paragraph({
        text: userPhone,
        spacing: { after: userLinkedIn ? 0 : 240 }
      })
    );
  }
  
  // LinkedIn if available
  if (userLinkedIn) {
    sections.push(
      new Paragraph({
        text: userLinkedIn,
        spacing: { after: 240 }
      })
    );
  }
  
  // Add date
  sections.push(
    new Paragraph({
      text: today,
      spacing: { after: 240 }
    })
  );
  
  // Add hiring manager address (if job has company info)
  if (job && job.company_name) {
    sections.push(
      new Paragraph({
        text: 'Hiring Manager',
        spacing: { after: 0 }
      }),
      new Paragraph({
        text: job.company_name,
        spacing: { after: job.location ? 0 : 240 }
      })
    );
    
    if (job.location) {
      sections.push(
        new Paragraph({
          text: job.location,
          spacing: { after: 240 }
        })
      );
    }
  }
  
  // Add salutation
  sections.push(
    new Paragraph({
      text: 'Dear Hiring Manager,',
      spacing: { after: 240 }
    })
  );
  
  // Filter out placeholder lines first
  const lines = coverLetterText.split('\n');
  const filteredLines = lines.filter(line => {
    const lower = line.toLowerCase().trim();
    return !lower.startsWith('[') &&
           !lower.includes('[your') &&
           !lower.includes('[date') &&
           !lower.includes('[city') &&
           !lower.includes('[company') &&
           !lower.includes('dear hiring manager') &&
           !lower.includes('sincerely') &&
           !lower.includes('best regards') &&
           !lower.startsWith('hiring manager');
  });
  
  // Split into paragraphs - handle both double newlines and preserve blank lines for splitting
  const cleanedText = filteredLines.join('\n');
  let paragraphs = cleanedText.split('\n\n').filter(p => p.trim().length > 0);
  
  // If we only got 1 paragraph, try splitting by single newlines to detect sentence-based paragraphs
  if (paragraphs.length === 1) {
    // Split into sentences and group every 3-4 sentences into a paragraph
    const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];
    paragraphs = [];
    let currentPara = '';
    let sentenceCount = 0;
    
    for (const sentence of sentences) {
      currentPara += sentence;
      sentenceCount++;
      
      // Create a new paragraph every 3-4 sentences
      if (sentenceCount >= 3 && currentPara.length > 200) {
        paragraphs.push(currentPara.trim());
        currentPara = '';
        sentenceCount = 0;
      }
    }
    
    // Add remaining sentences as final paragraph
    if (currentPara.trim().length > 0) {
      paragraphs.push(currentPara.trim());
    }
  }
  
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    
    // Additional safety check
    if (para.toLowerCase().startsWith('[') || para.includes('[your')) {
      continue;
    }
    
    sections.push(
      new Paragraph({
        text: para,
        spacing: { 
          after: 240,  // Space between paragraphs
          line: 276    // 1.15 line spacing within paragraphs
        },
        alignment: AlignmentType.LEFT
      })
    );
  }
  
  // Add signature with reduced spacing
  sections.push(
    new Paragraph({
      text: 'Sincerely,',
      spacing: { after: 240 } // Reduced space between "Sincerely," and name
    }),
    new Paragraph({
      text: userName,
      spacing: { after: 0 }
    })
  );
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });
  
  // Generate and download
  const blob = await Packer.toBlob(doc);
  const defaultFilename = filename || `CoverLetter_${job?.company_name || 'Company'}_${job?.title?.replace(/[^a-z0-9]/gi, '_') || 'Position'}.docx`;
  saveAs(blob, defaultFilename);
}
