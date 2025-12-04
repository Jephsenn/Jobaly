import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import * as fs from 'fs';
import PizZip from 'pizzip';

interface UserSettings {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
}

interface Resume {
  contact_info?: string;
  summary?: string;
  work_experience?: string;
  education?: string;
  hard_skills?: string;
  certifications?: string;
}

export class DocumentGenerator {
  /**
   * Generate a formatted resume DOCX file using the original template
   */
  static async generateResume(
    tailoredText: string,
    userSettings: UserSettings,
    originalResume: Resume,
    outputPath: string,
    templateBuffer?: Buffer
  ): Promise<void> {
    if (templateBuffer) {
      // Use the original DOCX template and replace content intelligently
      await this.generateFromTemplate(tailoredText, userSettings, templateBuffer, outputPath);
    } else {
      // Fallback to creating a new document
      await this.generateNewResume(tailoredText, userSettings, originalResume, outputPath);
    }
  }

  /**
   * Generate resume using original DOCX template (preserves formatting)
   * This directly modifies the XML content of the DOCX file
   */
  private static async generateFromTemplate(
    tailoredText: string,
    userSettings: UserSettings,
    templateBuffer: Buffer,
    outputPath: string
  ): Promise<void> {
    try {
      console.log('\n=== Starting Template-Based Resume Generation ===');
      const zip = new PizZip(templateBuffer);
      
      // Get the main document XML
      let documentXml = zip.file('word/document.xml')?.asText();
      
      if (!documentXml) {
        throw new Error('Invalid DOCX file');
      }

      console.log('Original document XML length:', documentXml.length);

      // Parse sections from tailored text
      const sections = this.parseResumeText(tailoredText);
      console.log('\nParsed tailored sections:');
      console.log('- Summary:', sections.summary ? sections.summary.substring(0, 100) + '...' : 'None');
      console.log('- Skills:', sections.skills ? sections.skills.substring(0, 100) + '...' : 'None');
      console.log('- Experience:', sections.experience ? sections.experience.substring(0, 100) + '...' : 'None');

      // Replace contact information
      console.log('\n=== Replacing Contact Information ===');
      const originalXml = documentXml;
      
      console.log('Replacing name:', userSettings.name || 'N/A');
      documentXml = this.replaceInXml(documentXml, userSettings.name, ['John Josephsen', 'Your Name']);
      
      console.log('Replacing email:', userSettings.email || 'N/A');
      documentXml = this.replaceInXml(documentXml, userSettings.email, ['jjosephsenyt@gmail.com', 'your.email@example.com']);
      
      console.log('Replacing phone:', userSettings.phone || 'N/A');
      documentXml = this.replaceInXml(documentXml, userSettings.phone, ['973-619-2981', '(555) 123-4567']);
      
      const fullAddress = `${userSettings.address}${userSettings.city ? ', ' + userSettings.city : ''}${userSettings.state ? ', ' + userSettings.state : ''}${userSettings.zip ? ' ' + userSettings.zip : ''}`;
      console.log('Replacing address:', fullAddress || 'N/A');
      documentXml = this.replaceInXml(documentXml, fullAddress, ['17 Hammond Ave #2, Clifton, NJ 07011', 'Your Address']);

      const contactInfoChanged = documentXml !== originalXml;
      console.log('Contact info changed:', contactInfoChanged);

      // Extract and replace skills intelligently
      if (sections.skills) {
        console.log('\n=== Replacing Skills Section ===');
        const beforeSkills = documentXml.length;
        documentXml = this.replaceSkillsSection(documentXml, sections.skills);
        console.log('Skills section changed:', documentXml.length !== beforeSkills);
      }

      // Extract and replace experience bullets intelligently
      if (sections.experience) {
        console.log('\n=== Replacing Experience Section ===');
        const beforeExp = documentXml.length;
        documentXml = this.replaceExperienceSection(documentXml, sections.experience);
        console.log('Experience section changed:', documentXml.length !== beforeExp);
      }

      console.log('\nFinal document XML length:', documentXml.length);
      console.log('Total changes made:', documentXml !== originalXml);

      // Update document XML
      zip.file('word/document.xml', documentXml);

      // Generate the new DOCX
      const buffer = zip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      fs.writeFileSync(outputPath, buffer);
      console.log('=== Resume Generated Successfully ===\n');
    } catch (error) {
      console.error('Error using template, falling back to new document:', error);
      // If template fails, create a new document
      await this.generateNewResume(tailoredText, userSettings, {}, outputPath);
    }
  }

  /**
   * Replace skills section while preserving formatting
   */
  private static replaceSkillsSection(xml: string, newSkills: string): string {
    console.log('\n--- Skills Replacement Details ---');
    console.log('New skills to insert:\n', newSkills.substring(0, 200));
    
    // Look for the Technical Skills section
    const skillsHeaderPattern = /<w:t[^>]*>Technical Skills<\/w:t>/i;
    
    if (!skillsHeaderPattern.test(xml)) {
      console.log('⚠️ Technical Skills header not found in XML');
      return xml;
    }

    console.log('✓ Found Technical Skills header');

    // Extract individual skill categories and new skills
    const newSkillLines = newSkills.split('\n').filter(line => line.trim());
    console.log('Skill lines to process:', newSkillLines.length);
    
    let result = xml;
    let replacementsMade = 0;
    
    // Replace Languages & Scripting
    const langPattern = /(<w:t[^>]*>Languages &amp; Scripting:<\/w:t>.*?<w:t[^>]*>)([^<]+)(<\/w:t>)/s;
    const langMatch = newSkillLines.find(line => line.includes('Languages') || line.includes('Scripting'));
    if (langMatch && langPattern.test(result)) {
      const skills = langMatch.split(':')[1]?.trim() || '';
      console.log('Replacing Languages & Scripting with:', skills.substring(0, 50) + '...');
      result = result.replace(langPattern, `$1${this.escapeXml(skills)}$3`);
      replacementsMade++;
    }

    // Replace Tools & Platforms
    const toolsPattern = /(<w:t[^>]*>Tools &amp; Platforms:<\/w:t>.*?<w:t[^>]*>)([^<]+)(<\/w:t>)/s;
    const toolsMatch = newSkillLines.find(line => line.includes('Tools') || line.includes('Platforms'));
    if (toolsMatch && toolsPattern.test(result)) {
      const skills = toolsMatch.split(':')[1]?.trim() || '';
      console.log('Replacing Tools & Platforms with:', skills.substring(0, 50) + '...');
      result = result.replace(toolsPattern, `$1${this.escapeXml(skills)}$3`);
      replacementsMade++;
    }

    // Replace Testing & Automation
    const testingPattern = /(<w:t[^>]*>Testing &amp; Automation:<\/w:t>.*?<w:t[^>]*>)([^<]+)(<\/w:t>)/s;
    const testingMatch = newSkillLines.find(line => line.includes('Testing') || line.includes('Automation'));
    if (testingMatch && testingPattern.test(result)) {
      const skills = testingMatch.split(':')[1]?.trim() || '';
      console.log('Replacing Testing & Automation with:', skills.substring(0, 50) + '...');
      result = result.replace(testingPattern, `$1${this.escapeXml(skills)}$3`);
      replacementsMade++;
    }

    // Replace Systems & Web
    const systemsPattern = /(<w:t[^>]*>Systems &amp; Web:<\/w:t>.*?<w:t[^>]*>)([^<]+)(<\/w:t>)/s;
    const systemsMatch = newSkillLines.find(line => line.includes('Systems') || line.includes('Web'));
    if (systemsMatch && systemsPattern.test(result)) {
      const skills = systemsMatch.split(':')[1]?.trim() || '';
      console.log('Replacing Systems & Web with:', skills.substring(0, 50) + '...');
      result = result.replace(systemsPattern, `$1${this.escapeXml(skills)}$3`);
      replacementsMade++;
    }

    console.log(`Total skill category replacements: ${replacementsMade}/4`);
    return result;
  }

  /**
   * Replace experience section bullets while preserving formatting
   */
  private static replaceExperienceSection(xml: string, newExperience: string): string {
    console.log('\n--- Experience Replacement Details ---');
    console.log('New experience to insert:\n', newExperience.substring(0, 300));
    
    // Look for the Experience section
    const expHeaderPattern = /<w:t[^>]*>Experience<\/w:t>/i;
    
    if (!expHeaderPattern.test(xml)) {
      console.log('⚠️ Experience header not found in XML');
      return xml;
    }

    console.log('✓ Found Experience header');

    // Parse new experience into companies and bullets
    const companies = this.parseExperienceByCompany(newExperience);
    console.log('Companies found in tailored experience:', Object.keys(companies));
    
    let result = xml;
    let totalReplacements = 0;

    // For each company, try to find and replace bullets
    for (const [companyName, bullets] of Object.entries(companies)) {
      console.log(`\nProcessing company: ${companyName}`);
      console.log(`Bullets to insert: ${bullets.length}`);
      
      // Find company name in XML
      const companyPattern = new RegExp(`<w:t[^>]*>${this.escapeRegex(companyName)}<\\/w:t>`, 'i');
      
      if (companyPattern.test(result)) {
        console.log(`✓ Found ${companyName} in document`);
        // Replace bullets for this company
        const beforeLength = result.length;
        result = this.replaceCompanyBullets(result, companyName, bullets);
        const changed = result.length !== beforeLength;
        console.log(`Bullets replaced: ${changed}`);
        if (changed) totalReplacements++;
      } else {
        console.log(`⚠️ Company "${companyName}" not found in document`);
      }
    }

    console.log(`\nTotal companies with replaced bullets: ${totalReplacements}/${Object.keys(companies).length}`);
    return result;
  }

  /**
   * Parse experience text into companies and their bullet points
   */
  private static parseExperienceByCompany(experience: string): Record<string, string[]> {
    const companies: Record<string, string[]> = {};
    const lines = experience.split('\n');
    let currentCompany = '';
    let currentBullets: string[] = [];

    console.log('\n--- Parsing Experience into Companies ---');
    console.log('Total lines to parse:', lines.length);

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) continue;
      
      // Check if it's a bullet point
      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*');
      
      // Check if it's a date range (indicates a job position)
      const isDateRange = /\d{4}\s*[–-]\s*(\d{4}|Present)/i.test(trimmed);
      
      // Check if it looks like a company name (bold/standalone, not too long, not a bullet)
      const looksLikeCompany = !isBullet && !isDateRange && trimmed.length < 100 && 
                               (trimmed.includes('Companies') || trimmed.includes('University') || 
                                trimmed.includes('Corp') || trimmed.includes('Inc') || 
                                trimmed.length < 50);
      
      if (looksLikeCompany && !trimmed.match(/^(Help Desk|Per Diem|Student|Provide|Support|Maintain|Lead|Deliver|Resolved|Built|Co-managed)/i)) {
        // Save previous company
        if (currentCompany && currentBullets.length > 0) {
          companies[currentCompany] = currentBullets;
          console.log(`  ✓ Saved company: ${currentCompany} with ${currentBullets.length} bullets`);
        }
        
        currentCompany = trimmed;
        currentBullets = [];
        console.log(`  Found company: ${currentCompany}`);
      } else if (isBullet) {
        // It's a bullet point
        const bulletText = trimmed.replace(/^[•\-\*]\s*/, '');
        currentBullets.push(bulletText);
      }
    }

    // Save last company
    if (currentCompany && currentBullets.length > 0) {
      companies[currentCompany] = currentBullets;
      console.log(`  ✓ Saved company: ${currentCompany} with ${currentBullets.length} bullets`);
    }

    console.log(`Total companies parsed: ${Object.keys(companies).length}`);
    return companies;
  }

  /**
   * Replace bullet points for a specific company
   */
  private static replaceCompanyBullets(xml: string, companyName: string, newBullets: string[]): string {
    // Find the company section and locate bullet points
    const companyEscaped = this.escapeRegex(companyName);
    
    // Look for bullet characters after company name (•, -, or similar)
    // Match bullet points that come after the company name
    const bulletPattern = /<w:t[^>]*>[•\-]<\/w:t>.*?<w:t[^>]*>([^<]+)<\/w:t>/g;
    
    let result = xml;
    let bulletIndex = 0;
    let foundCompany = false;
    let replacements = 0;

    // Split XML into sections and find company location
    const companyIndex = result.search(new RegExp(`<w:t[^>]*>${companyEscaped}<\\/w:t>`, 'i'));
    
    if (companyIndex === -1) return result;

    // Process only the section after the company name
    const beforeCompany = result.substring(0, companyIndex);
    let afterCompany = result.substring(companyIndex);
    
    // Find next company or section (to limit replacement scope)
    const nextSectionIndex = afterCompany.search(/<w:t[^>]*>(Montclair State University|Relevant Projects|Education)<\/w:t>/i);
    const sectionEnd = nextSectionIndex > 0 ? nextSectionIndex : afterCompany.length;
    
    const companySection = afterCompany.substring(0, sectionEnd);
    const afterSection = afterCompany.substring(sectionEnd);

    // Replace bullets in this company's section only
    const replacedSection = companySection.replace(
      bulletPattern,
      (match, bulletText) => {
        if (bulletIndex < newBullets.length && replacements < newBullets.length) {
          const replacement = match.replace(bulletText, this.escapeXml(newBullets[bulletIndex]));
          bulletIndex++;
          replacements++;
          return replacement;
        }
        return match;
      }
    );

    return beforeCompany + replacedSection + afterSection;
  }

  /**
   * Escape special characters for XML
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Escape special regex characters
   */
  private static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Helper to replace text in DOCX XML while preserving formatting
   */
  private static replaceInXml(xml: string, newValue: string, oldValues: string[]): string {
    if (!newValue) return xml;
    
    let result = xml;
    for (const oldValue of oldValues) {
      // Escape XML special characters
      const escapedOld = oldValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const escapedNew = newValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      result = result.replace(new RegExp(escapedOld, 'g'), escapedNew);
    }
    return result;
  }

  /**
   * Generate a new resume document from scratch
   */
  private static async generateNewResume(
    tailoredText: string,
    userSettings: UserSettings,
    originalResume: Resume,
    outputPath: string
  ): Promise<void> {
    // Parse the tailored resume text into sections
    const sections = this.parseResumeText(tailoredText);
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header with contact info
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: userSettings.name || 'Your Name',
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${userSettings.address}${userSettings.city ? ', ' + userSettings.city : ''}${userSettings.state ? ', ' + userSettings.state : ''}${userSettings.zip ? ' ' + userSettings.zip : ''}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${userSettings.email}${userSettings.phone ? ' | ' + userSettings.phone : ''}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          // Professional Summary
          ...(sections.summary ? [
            new Paragraph({
              text: 'PROFESSIONAL SUMMARY',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 100 },
            }),
            ...sections.summary.split('\n').map(line => 
              new Paragraph({
                text: line,
                spacing: { after: 100 },
              })
            ),
          ] : []),

          // Skills
          ...(sections.skills ? [
            new Paragraph({
              text: 'SKILLS',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 100 },
            }),
            ...sections.skills.split('\n').map(line => 
              new Paragraph({
                text: line,
                spacing: { after: 50 },
              })
            ),
          ] : []),

          // Work Experience
          ...(sections.experience ? [
            new Paragraph({
              text: 'WORK EXPERIENCE',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 100 },
            }),
            ...sections.experience.split('\n').map(line => 
              new Paragraph({
                text: line,
                spacing: { after: 50 },
              })
            ),
          ] : []),

          // Education
          ...(sections.education ? [
            new Paragraph({
              text: 'EDUCATION',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 100 },
            }),
            ...sections.education.split('\n').map(line => 
              new Paragraph({
                text: line,
                spacing: { after: 50 },
              })
            ),
          ] : []),

          // Certifications
          ...(sections.certifications ? [
            new Paragraph({
              text: 'CERTIFICATIONS',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 100 },
            }),
            ...sections.certifications.split('\n').map(line => 
              new Paragraph({
                text: line,
                spacing: { after: 50 },
              })
            ),
          ] : []),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
  }

  /**
   * Generate a formatted cover letter DOCX file
   */
  static async generateCoverLetter(
    coverLetterText: string,
    userSettings: UserSettings,
    jobTitle: string,
    companyName: string,
    outputPath: string
  ): Promise<void> {
    const today = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Your contact info
          new Paragraph({
            text: userSettings.name || 'Your Name',
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: userSettings.address || 'Your Address',
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: `${userSettings.city || 'City'}${userSettings.state ? ', ' + userSettings.state : ''}${userSettings.zip ? ' ' + userSettings.zip : ''}`,
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: userSettings.email || 'your.email@example.com',
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: userSettings.phone || '(555) 123-4567',
            spacing: { after: 200 },
          }),

          // Date
          new Paragraph({
            text: today,
            spacing: { after: 200 },
          }),

          // Employer info
          new Paragraph({
            text: 'Hiring Manager',
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: companyName || 'Company Name',
            spacing: { after: 200 },
          }),

          // Salutation
          new Paragraph({
            text: `Dear Hiring Manager,`,
            spacing: { after: 200 },
          }),

          // Body (split into paragraphs)
          ...coverLetterText.split('\n\n').map(para => 
            new Paragraph({
              text: para.trim(),
              spacing: { after: 200 },
            })
          ),

          // Closing
          new Paragraph({
            text: 'Sincerely,',
            spacing: { after: 200, before: 200 },
          }),
          new Paragraph({
            text: userSettings.name || 'Your Name',
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
  }

  /**
   * Parse tailored resume text into sections
   */
  private static parseResumeText(text: string): {
    summary?: string;
    skills?: string;
    experience?: string;
    education?: string;
    certifications?: string;
  } {
    const sections: any = {};
    const lines = text.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const upperLine = trimmed.toUpperCase();
      
      if (upperLine.includes('SUMMARY') || upperLine.includes('OBJECTIVE')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'summary';
        currentContent = [];
      } else if (upperLine.includes('TECHNICAL SKILLS') || upperLine === 'SKILLS') {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'skills';
        currentContent = [];
      } else if (upperLine.includes('EXPERIENCE') || upperLine.includes('EMPLOYMENT')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'experience';
        currentContent = [];
      } else if (upperLine.includes('EDUCATION')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'education';
        currentContent = [];
      } else if (upperLine.includes('CERTIFICATION') || upperLine.includes('PROJECT')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'certifications';
        currentContent = [];
      } else if (trimmed && currentSection) {
        // Add non-empty lines to current section
        currentContent.push(line);
      }
    }

    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    console.log('\n=== Parsed Resume Sections ===');
    console.log('Summary length:', sections.summary?.length || 0);
    console.log('Skills length:', sections.skills?.length || 0);
    console.log('Experience length:', sections.experience?.length || 0);
    console.log('Skills content:\n', sections.skills);
    console.log('Experience first 500 chars:\n', sections.experience?.substring(0, 500));

    return sections;
  }
}
