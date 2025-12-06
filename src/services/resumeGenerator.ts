import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import type { Resume, WorkExperience, ResumeSection } from './database';
import type { EnhancedResume } from './resumeEnhancer';

/**
 * Generate a DOCX file from enhanced resume data
 */
export async function generateResumeDocx(
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
