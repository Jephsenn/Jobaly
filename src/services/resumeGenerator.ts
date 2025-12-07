import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import type { Resume, WorkExperience, ResumeSection } from './database';
import type { EnhancedResume } from './resumeEnhancer';

/**
 * Generate a DOCX file from enhanced resume data, preserving original formatting
 */
export async function generateResumeDocx(
  enhancedResume: EnhancedResume,
  filename?: string
): Promise<void> {
  const { original, enhanced, job } = enhancedResume;
  
  // If we have the original DOCX file, modify it directly to preserve ALL formatting
  if (original.original_file && original.file_type === 'docx') {
    return modifyOriginalDocx(enhancedResume, filename);
  }
  
  // If original has sections with formatting, use those as template
  if (original.sections && original.sections.length > 0) {
    return generateFromTemplate(enhancedResume, filename);
  }
  
  // Fallback to simple generation if no sections available
  return generateSimple(enhancedResume, filename);
}

/**
 * Modify the original DOCX file directly, preserving 100% of formatting
 * Only replaces bullet point text
 */
async function modifyOriginalDocx(
  enhancedResume: EnhancedResume,
  filename?: string
): Promise<void> {
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
    
    // Log changes for debugging
    console.group('🎨 Resume Enhancement Changes');
    console.log(`Total bullet points to enhance: ${Math.min(originalBullets.length, allEnhancedBullets.length)}`);
    console.log('---');
    
    // Replace each original bullet with enhanced version
    for (let i = 0; i < originalBullets.length && i < allEnhancedBullets.length; i++) {
      const originalText = originalBullets[i];
      const enhancedText = allEnhancedBullets[i];
      
      // Log the change
      console.log(`\n📌 Bullet ${i + 1}:`);
      console.log(`   BEFORE: "${originalText}"`);
      console.log(`   AFTER:  "${enhancedText}"`);
      console.log(`   Changed: ${originalText !== enhancedText ? '✅ Yes' : '❌ No (AI returned same text)'}`);
      
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
      if (beforeReplace === xmlContent && originalText !== enhancedText) {
        console.warn(`   ⚠️ Warning: Text not found in XML. May need manual review.`);
      }
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
    
  } catch (error) {
    console.error('Failed to modify original DOCX, falling back to template generation:', error);
    // Fallback to template generation if direct modification fails
    if (original.sections && original.sections.length > 0) {
      return generateFromTemplate(enhancedResume, filename);
    }
    return generateSimple(enhancedResume, filename);
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
