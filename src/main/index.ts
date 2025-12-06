import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import mammoth from 'mammoth';
import { logger } from './utils/logger';
import DatabaseService from './database';
import { getJobDetector } from './services/JobDetector';
import { getJobParser } from './services/JobParser';
import { getNativeMessagingServer } from './services/NativeMessagingServer';
import { ResumeParser } from './services/ResumeParser';
import { JobMatchService } from './services/JobMatchService';
import { ResumeTailoring } from './services/ResumeTailoring';
import { CoverLetterGenerator } from './services/CoverLetterGenerator';
import { DocumentGenerator } from './services/DocumentGenerator';
import { AutoUpdaterService } from './services/AutoUpdater';
import type { Job } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let autoUpdaterService: AutoUpdaterService | null = null;
const jobDetector = getJobDetector();
const jobParser = getJobParser();
const nativeMessaging = getNativeMessagingServer();

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    // mainWindow.webContents.openDevTools(); // Commented out - open manually with F12 if needed
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  logger.info('Main window created');
}

function createApplicationMenu() {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => {
            if (autoUpdaterService) {
              autoUpdaterService.manualCheckForUpdates();
            }
          }
        },
        {
          label: 'About',
          click: () => {
            if (mainWindow) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'About JobTracker',
                message: 'JobTracker',
                detail: `Version: ${app.getVersion()}\n\nA job application tracker with auto-detection.`
              });
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  logger.info('App ready, initializing...');
  
  // Initialize database
  try {
    await DatabaseService.initialize();
    logger.info('Database ready');
  } catch (error) {
    logger.error('Database initialization failed', { error });
  }

  await createWindow();

  // Initialize auto-updater
  if (mainWindow) {
    autoUpdaterService = new AutoUpdaterService(mainWindow);
    autoUpdaterService.setupListeners();
  }

  // Create application menu with Check for Updates option
  createApplicationMenu();

  // Start job detection
  startJobDetection();

  // Set up IPC handlers
  setupIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    jobDetector.stop();
    DatabaseService.save();
    DatabaseService.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  jobDetector.stop();
  nativeMessaging.stop();
  DatabaseService.save();
  DatabaseService.close();
  logger.info('App quit');
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', { error });
});

/**
 * Generate tailored resume and cover letter for a job application
 */
async function generateApplicationMaterials(
  jobId: number, 
  db: any,
  applicationStatus: string = 'draft'
): Promise<void> {
  try {
    // Get primary resume
    const resumeResult = db.exec('SELECT * FROM resumes WHERE is_primary = 1 LIMIT 1');
    if (!resumeResult || resumeResult.length === 0 || resumeResult[0].values.length === 0) {
      logger.warn('No primary resume found, skipping material generation', { jobId });
      return;
    }

    const resumeColumns = resumeResult[0].columns;
    const resumeRow = resumeResult[0].values[0];
    const resume: any = {};
    resumeColumns.forEach((col: string, i: number) => {
      resume[col] = resumeRow[i];
    });

    // Get job details
    const jobResult = db.exec(`SELECT * FROM jobs WHERE id = ${jobId}`);
    if (!jobResult || jobResult.length === 0 || jobResult[0].values.length === 0) {
      logger.warn('Job not found', { jobId });
      return;
    }

    const jobColumns = jobResult[0].columns;
    const jobRow = jobResult[0].values[0];
    const job: any = {};
    jobColumns.forEach((col: string, i: number) => {
      job[col] = jobRow[i];
    });

    logger.info('Generating materials for job', { 
      jobId, 
      jobTitle: job.title, 
      company: job.company_name 
    });

    // Calculate match score
    const matchScore = JobMatchService.calculateMatch(job, resume);

    // Generate tailored resume
    const tailoredResume = ResumeTailoring.tailor(resume, job);
    
    logger.info('Tailored resume generated', {
      jobId,
      atsScore: tailoredResume.modifications.ats_score,
      addedKeywords: tailoredResume.modifications.added_keywords.slice(0, 5),
      emphasizedSkills: tailoredResume.modifications.emphasized_skills.slice(0, 5),
      tailoredTextPreview: tailoredResume.tailored_text.substring(0, 200) + '...'
    });
    
    // Generate cover letter
    const coverLetter = CoverLetterGenerator.generate(resume, job, matchScore);

    // Escape strings safely by replacing single quotes with double single quotes
    const escapedResume = tailoredResume.tailored_text.replace(/'/g, "''");
    const escapedCoverLetter = coverLetter.replace(/'/g, "''");

    // Check if application already exists
    const appCheckResult = db.exec(`SELECT id FROM applications WHERE job_id = ${jobId}`);
    
    if (appCheckResult && appCheckResult[0] && appCheckResult[0].values.length > 0) {
      // Update existing application
      const appId = appCheckResult[0].values[0][0];
      db.exec(`
        UPDATE applications 
        SET resume_version_snapshot = '${escapedResume}',
            cover_letter_text = '${escapedCoverLetter}',
            status = '${applicationStatus}',
            updated_at = datetime('now')
        WHERE id = ${appId}
      `);
      logger.info('Application materials updated', { jobId, appId });
    } else {
      // Create new application
      db.exec(`
        INSERT INTO applications (
          user_id, job_id, resume_id, status,
          resume_version_snapshot, cover_letter_text,
          applied_date
        ) VALUES (
          1,
          ${jobId},
          ${resume.id},
          '${applicationStatus}',
          '${escapedResume}',
          '${escapedCoverLetter}',
          datetime('now')
        )
      `);
      
      const appIdResult = db.exec('SELECT last_insert_rowid() as id');
      const appId = appIdResult[0]?.values[0]?.[0];
      
      logger.info('Application materials generated', { 
        jobId, 
        appId,
        resumeId: resume.id,
        atsScore: tailoredResume.modifications.ats_score,
        matchScore: matchScore.overall
      });
    }
  } catch (error) {
    logger.error('Failed to generate application materials', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      jobId 
    });
  }
}

/**
 * Start job detection service
 */
function startJobDetection() {
  // Listen for detected jobs
  jobDetector.on('job-detected', async (detectedJob) => {
    try {
      logger.info('Processing detected job', { platform: detectedJob.platform });

      // Parse job details - pass clipboardText so parser can extract title from text
      const jobData = await jobParser.parseJobFromUrl(
        detectedJob.url,
        detectedJob.platform,
        detectedJob.clipboardText
      );

      // Save to database
      const db = DatabaseService.getDatabase();
      
      // sql.js uses exec() - column names must match schema (job_url, company_name, etc.)
      // Use NULL for missing data instead of placeholder strings
      // Helper to escape SQL strings
      const escapeSQL = (val: any) => val ? `'${String(val).replace(/'/g, "''")}'` : 'NULL';
      
      db.exec(`
        INSERT INTO jobs (
          job_url, platform, platform_job_id, title, company_name, location, location_type,
          salary_min, salary_max, salary_currency, salary_period,
          description, required_skills, preferred_skills, required_experience_years, 
          education_level, benefits, detected_at, is_saved, is_archived
        ) VALUES (
          ${escapeSQL(jobData.url || detectedJob.url)},
          ${escapeSQL(jobData.platform || detectedJob.platform)},
          ${escapeSQL(jobData.externalId)},
          ${escapeSQL(jobData.title)},
          ${escapeSQL(jobData.company)},
          ${escapeSQL(jobData.location)},
          ${escapeSQL(jobData.locationType)},
          ${jobData.salaryMin || 'NULL'},
          ${jobData.salaryMax || 'NULL'},
          ${escapeSQL(jobData.salaryCurrency)},
          ${escapeSQL(jobData.salaryPeriod)},
          ${escapeSQL(jobData.description)},
          ${escapeSQL(jobData.requiredSkills?.join(', '))},
          ${escapeSQL(jobData.preferredSkills?.join(', '))},
          ${jobData.requiredExperienceYears || 'NULL'},
          ${escapeSQL(jobData.educationLevel)},
          ${escapeSQL(jobData.benefits?.join(', '))},
          '${new Date().toISOString()}',
          0,
          0
        )
      `);

      DatabaseService.save();

      // Get the last inserted ID
      const result = db.exec('SELECT last_insert_rowid() as id');
      const jobId = result[0]?.values[0]?.[0] as number;
      
      logger.info('Job saved to database', { jobId, platform: jobData.platform || detectedJob.platform });

      // Notify UI
      if (mainWindow) {
        mainWindow.webContents.send('job-added', { id: jobId, ...jobData });
      }

    } catch (error) {
      logger.error('Failed to process detected job', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        platform: detectedJob.platform 
      });
    }
  });

  // Start monitoring
  jobDetector.start();
  
  // Start HTTP server for browser extension
  nativeMessaging.start((extensionJob) => {
    logger.info('Job received from browser extension', { 
      platform: extensionJob.platform,
      title: extensionJob.title || 'Untitled',
      company: extensionJob.company || 'Unknown'
    });
    
    try {
      const db = DatabaseService.getDatabase();
      
      // Helper to escape SQL strings
      const escapeSQL = (val: any) => val ? `'${String(val).replace(/'/g, "''")}'` : 'NULL';
      
      // Save job to database with all enhanced fields from extension
      db.exec(`
        INSERT INTO jobs (
          job_url, platform, platform_job_id, title, company_name, location, location_type,
          salary_min, salary_max, salary_currency, salary_period,
          description, required_skills, preferred_skills, required_experience_years, 
          education_level, benefits, detected_at, is_saved, is_archived
        ) VALUES (
          ${escapeSQL(extensionJob.url)},
          ${escapeSQL(extensionJob.platform)},
          ${escapeSQL(extensionJob.id)},
          ${escapeSQL(extensionJob.title)},
          ${escapeSQL(extensionJob.company)},
          ${escapeSQL(extensionJob.location)},
          ${escapeSQL(extensionJob.locationType)},
          ${extensionJob.salaryMin || 'NULL'},
          ${extensionJob.salaryMax || 'NULL'},
          ${escapeSQL(extensionJob.salaryCurrency || 'USD')},
          ${escapeSQL(extensionJob.salaryPeriod)},
          ${escapeSQL(extensionJob.description)},
          ${escapeSQL(extensionJob.skills?.join(', '))},
          ${escapeSQL(extensionJob.preferredSkills?.join(', '))},
          ${extensionJob.experienceYears || 'NULL'},
          ${escapeSQL(extensionJob.educationLevel)},
          ${escapeSQL(extensionJob.benefits?.join(', '))},
          ${escapeSQL(extensionJob.detectedAt || new Date().toISOString())},
          0,
          0
        )
      `);
      
      DatabaseService.save();
      
      const result = db.exec('SELECT last_insert_rowid() as id');
      const jobId = result[0]?.values[0]?.[0] as number;
      
      logger.info('Extension job saved to database', { 
        jobId, 
        platform: extensionJob.platform,
        fieldsExtracted: {
          salary: extensionJob.salaryMin || extensionJob.salaryMax ? 'yes' : 'no',
          locationType: extensionJob.locationType || 'none',
          skills: extensionJob.skills?.length || 0,
          benefits: extensionJob.benefits?.length || 0
        }
      });
      
      // Notify UI
      if (mainWindow) {
        mainWindow.webContents.send('job-added', { ...extensionJob, id: jobId });
      }
    } catch (error) {
      logger.error('Failed to save extension job', { 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  logger.info('Job detection started');
}

/**
 * Set up IPC handlers for renderer process
 */
function setupIpcHandlers() {
  // Get all jobs
  ipcMain.handle('get-jobs', async () => {
    try {
      const db = DatabaseService.getDatabase();
      const result = db.exec(`
        SELECT * FROM jobs 
        ORDER BY detected_at DESC 
        LIMIT 100
      `);
      
      if (!result || result.length === 0) {
        return [];
      }
      
      // Convert sql.js result to array of objects
      const columns = result[0].columns;
      const values = result[0].values;
      const jobs = values.map((row: any) => {
        const job: any = {};
        columns.forEach((col: string, i: number) => {
          job[col] = row[i];
        });
        return job;
      });
      
      return jobs;
    } catch (error) {
      logger.error('Failed to get jobs', { error });
      return [];
    }
  });

  // Get job by ID
  ipcMain.handle('get-job', async (_, id: number) => {
    try {
      const db = DatabaseService.getDatabase();
      const result = db.exec(`SELECT * FROM jobs WHERE id = ${id}`);
      
      if (!result || result.length === 0 || result[0].values.length === 0) {
        return null;
      }
      
      const columns = result[0].columns;
      const row = result[0].values[0];
      const job: any = {};
      columns.forEach((col: string, i: number) => {
        job[col] = row[i];
      });
      
      return job;
    } catch (error) {
      logger.error('Failed to get job', { error, id });
      return null;
    }
  });

  // Update job status
  ipcMain.handle('update-job-status', async (_, id: number, status: string) => {
    try {
      const db = DatabaseService.getDatabase();
      
      // Map status to is_saved/is_archived flags
      const isSaved = status === 'saved' ? 1 : 0;
      const isArchived = status === 'dismissed' || status === 'archived' ? 1 : 0;
      
      db.exec(`UPDATE jobs SET is_saved = ${isSaved}, is_archived = ${isArchived} WHERE id = ${id}`);
      
      // If saving a job, generate tailored resume and cover letter
      if (status === 'saved') {
        await generateApplicationMaterials(id, db);
      }
      
      DatabaseService.save();
      logger.info('Job status updated', { id, status, isSaved, isArchived });
      return true;
    } catch (error) {
      logger.error('Failed to update job status', { error, id });
      return false;
    }
  });

  // Mark job as applied
  ipcMain.handle('mark-job-applied', async (_, jobId: number) => {
    try {
      const db = DatabaseService.getDatabase();
      
      // First, ensure the job is marked as saved
      db.exec(`
        UPDATE jobs 
        SET is_saved = 1, updated_at = datetime('now')
        WHERE id = ${jobId}
      `);
      
      // Check if application already exists
      const checkResult = db.exec(`SELECT id FROM applications WHERE job_id = ${jobId}`);
      
      if (checkResult && checkResult[0] && checkResult[0].values.length > 0) {
        // Update existing application
        db.exec(`
          UPDATE applications 
          SET status = 'applied', applied_date = datetime('now'), updated_at = datetime('now')
          WHERE job_id = ${jobId}
        `);
        logger.info('Application status updated to applied', { jobId });
      } else {
        // Create new application if materials were generated
        const materialsResult = db.exec(`
          SELECT id FROM applications 
          WHERE job_id = ${jobId} AND status = 'draft'
        `);
        
        if (materialsResult && materialsResult[0] && materialsResult[0].values.length > 0) {
          // Update draft to applied
          db.exec(`
            UPDATE applications 
            SET status = 'applied', applied_date = datetime('now'), updated_at = datetime('now')
            WHERE job_id = ${jobId} AND status = 'draft'
          `);
        } else {
          // Generate materials and mark as applied
          await generateApplicationMaterials(jobId, db, 'applied');
        }
      }
      
      DatabaseService.save();
      logger.info('Job marked as applied', { jobId });
      return true;
    } catch (error) {
      logger.error('Failed to mark job as applied', { error, jobId });
      return false;
    }
  });

  // Regenerate application materials for a saved job
  ipcMain.handle('regenerate-materials', async (_, jobId: number) => {
    try {
      const db = DatabaseService.getDatabase();
      logger.info('Regenerating application materials', { jobId });
      
      // Delete existing materials
      db.exec(`DELETE FROM applications WHERE job_id = ${jobId}`);
      
      // Generate new materials
      await generateApplicationMaterials(jobId, db);
      
      DatabaseService.save();
      logger.info('Materials regenerated successfully', { jobId });
      return true;
    } catch (error) {
      logger.error('Failed to regenerate materials', { error, jobId });
      return false;
    }
  });

  // Delete job
  ipcMain.handle('delete-job', async (_, id: number) => {
    try {
      const db = DatabaseService.getDatabase();
      db.exec(`DELETE FROM jobs WHERE id = ${id}`);
      DatabaseService.save();
      logger.info('Job deleted', { id });
      return true;
    } catch (error) {
      logger.error('Failed to delete job', { error, id });
      return false;
    }
  });

  // ========== Resume Handlers ==========

  // Get all resumes
  ipcMain.handle('get-resumes', async () => {
    try {
      const db = DatabaseService.getDatabase();
      const result = db.exec(`
        SELECT * FROM resumes 
        ORDER BY is_primary DESC, created_at DESC
      `);
      
      if (!result || result.length === 0) {
        return [];
      }
      
      const columns = result[0].columns;
      const values = result[0].values;
      const resumes = values.map((row: any) => {
        const resume: any = {};
        columns.forEach((col: string, i: number) => {
          resume[col] = row[i];
        });
        return resume;
      });
      
      return resumes;
    } catch (error) {
      logger.error('Failed to get resumes', { error });
      return [];
    }
  });

  // Save new resume
  ipcMain.handle('save-resume', async (_, resumeData: {
    name: string;
    fileBuffer?: number[];
    fileType?: string;
    full_text?: string;
    is_primary: boolean;
  }) => {
    try {
      const db = DatabaseService.getDatabase();
      
      let fullText = '';
      let originalDocxBuffer: Buffer | null = null;
      
      // Extract text based on file type
      if (resumeData.fileBuffer && resumeData.fileType) {
        const buffer = Buffer.from(resumeData.fileBuffer);
        
        if (resumeData.fileType === '.docx' || resumeData.fileType === '.doc') {
          // Store original DOCX for template use
          originalDocxBuffer = buffer;
          
          // Parse DOCX using mammoth
          const result = await mammoth.extractRawText({ buffer });
          fullText = result.value;
          logger.info('Extracted text from DOCX', { length: fullText.length });
        } else if (resumeData.fileType === '.txt') {
          // Plain text
          fullText = buffer.toString('utf-8');
        } else if (resumeData.fileType === '.pdf') {
          // For now, show error - PDF parsing needs additional library
          return { 
            success: false, 
            error: 'PDF parsing not yet supported. Please use DOCX or TXT format.' 
          };
        } else {
          return { 
            success: false, 
            error: `Unsupported file type: ${resumeData.fileType}` 
          };
        }
      } else if (resumeData.full_text) {
        // Legacy support for direct text upload
        fullText = resumeData.full_text;
      } else {
        return { success: false, error: 'No resume content provided' };
      }
      
      if (!fullText || fullText.trim().length === 0) {
        return { success: false, error: 'Resume file appears to be empty' };
      }
      
      // Parse resume to extract structured data
      const parsed = ResumeParser.parse(fullText);
      
      // If this is set as primary, unset all others first
      if (resumeData.is_primary) {
        db.exec('UPDATE resumes SET is_primary = 0');
      }
      
      // Add original_docx_template column if it doesn't exist
      try {
        db.exec(`
          ALTER TABLE resumes ADD COLUMN original_docx_template BLOB
        `);
      } catch (e) {
        // Column already exists, ignore
      }
      
      // Insert resume - using string concatenation for SQL.js compatibility
      const escapeSQL = (val: string) => val.replace(/'/g, "''");
      const isPrimary = resumeData.is_primary ? 1 : 0;
      const hardSkillsStr = parsed.hard_skills.length > 0 ? escapeSQL(parsed.hard_skills.join(',')) : null;
      const softSkillsStr = parsed.soft_skills.length > 0 ? escapeSQL(parsed.soft_skills.join(',')) : null;
      const toolsStr = parsed.tools_technologies.length > 0 ? escapeSQL(parsed.tools_technologies.join(',')) : null;
      const yearsExp = parsed.years_of_experience || null;
      const currentTitleStr = parsed.current_title ? escapeSQL(parsed.current_title) : null;
      const eduStr = parsed.education.length > 0 ? escapeSQL(parsed.education.join('|')) : null;
      const certsStr = parsed.certifications.length > 0 ? escapeSQL(parsed.certifications.join('|')) : null;
      const workExpStr = parsed.work_experience.length > 0 ? escapeSQL(parsed.work_experience.join('|')) : null;
      
      db.exec(`
        INSERT INTO resumes (
          user_id, name, is_primary, full_text,
          hard_skills, soft_skills, tools_technologies,
          years_of_experience, current_title,
          education, certifications, work_experience
        ) VALUES (
          1, '${escapeSQL(resumeData.name)}', ${isPrimary}, '${escapeSQL(fullText)}',
          ${hardSkillsStr ? `'${hardSkillsStr}'` : 'NULL'},
          ${softSkillsStr ? `'${softSkillsStr}'` : 'NULL'},
          ${toolsStr ? `'${toolsStr}'` : 'NULL'},
          ${yearsExp || 'NULL'},
          ${currentTitleStr ? `'${currentTitleStr}'` : 'NULL'},
          ${eduStr ? `'${eduStr}'` : 'NULL'},
          ${certsStr ? `'${certsStr}'` : 'NULL'},
          ${workExpStr ? `'${workExpStr}'` : 'NULL'}
        )
      `);
      
      DatabaseService.save();
      
      const result = db.exec('SELECT last_insert_rowid() as id');
      const resumeId = result[0]?.values[0]?.[0] as number;
      
      logger.info('Resume saved', { resumeId, name: resumeData.name, skills: parsed.hard_skills.length });
      return { success: true, id: resumeId };
    } catch (error) {
      logger.error('Failed to save resume', { error });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Set primary resume
  ipcMain.handle('set-primary-resume', async (_, resumeId: number) => {
    try {
      const db = DatabaseService.getDatabase();
      
      // Unset all primary flags
      db.exec('UPDATE resumes SET is_primary = 0');
      
      // Set the selected resume as primary
      db.exec(`UPDATE resumes SET is_primary = 1 WHERE id = ${resumeId}`);
      
      DatabaseService.save();
      logger.info('Primary resume updated', { resumeId });
      return true;
    } catch (error) {
      logger.error('Failed to set primary resume', { error, resumeId });
      return false;
    }
  });

  // Delete resume
  ipcMain.handle('delete-resume', async (_, resumeId: number) => {
    try {
      const db = DatabaseService.getDatabase();
      db.exec(`DELETE FROM resumes WHERE id = ${resumeId}`);
      DatabaseService.save();
      logger.info('Resume deleted', { resumeId });
      return true;
    } catch (error) {
      logger.error('Failed to delete resume', { error, resumeId });
      return false;
    }
  });

  // ========== Job Match Handlers ==========

  // Get job matches for all jobs (against primary resume)
  ipcMain.handle('get-job-matches', async () => {
    try {
      const db = DatabaseService.getDatabase();
      
      // Get primary resume
      const resumeResult = db.exec('SELECT * FROM resumes WHERE is_primary = 1 LIMIT 1');
      if (!resumeResult || resumeResult.length === 0 || resumeResult[0].values.length === 0) {
        logger.info('No primary resume found for matching');
        return {};
      }

      const resumeColumns = resumeResult[0].columns;
      const resumeRow = resumeResult[0].values[0];
      const resume: any = {};
      resumeColumns.forEach((col: string, i: number) => {
        resume[col] = resumeRow[i];
      });

      // Get all jobs
      const jobsResult = db.exec('SELECT * FROM jobs ORDER BY detected_at DESC LIMIT 100');
      if (!jobsResult || jobsResult.length === 0) {
        return {};
      }

      const jobColumns = jobsResult[0].columns;
      const jobValues = jobsResult[0].values;
      const jobs = jobValues.map((row: any) => {
        const job: any = {};
        jobColumns.forEach((col: string, i: number) => {
          job[col] = row[i];
        });
        return job;
      });

      // Calculate matches
      const matches = JobMatchService.batchCalculateMatches(jobs, resume);
      
      // Convert Map to plain object for IPC
      const matchesObj: any = {};
      matches.forEach((score, jobId) => {
        matchesObj[jobId] = score;
      });

      logger.info('Calculated job matches', { count: jobs.length });
      return matchesObj;
    } catch (error) {
      logger.error('Failed to calculate job matches', { error });
      return {};
    }
  });

  // Get application materials for a job
  ipcMain.handle('get-application-materials', async (_, jobId: number) => {
    try {
      const db = DatabaseService.getDatabase();
      const result = db.exec(`
        SELECT resume_version_snapshot, cover_letter_text, status, applied_date
        FROM applications
        WHERE job_id = ${jobId}
        LIMIT 1
      `);

      if (!result || result.length === 0 || result[0].values.length === 0) {
        return null;
      }

      const row = result[0].values[0];
      return {
        tailored_resume: row[0],
        cover_letter: row[1],
        status: row[2],
        applied_date: row[3]
      };
    } catch (error) {
      logger.error('Failed to get application materials', { error, jobId });
      return null;
    }
  });

  // Get all applications with job details
  ipcMain.handle('get-all-applications', async () => {
    try {
      const db = DatabaseService.getDatabase();
      const result = db.exec(`
        SELECT 
          a.id,
          a.job_id,
          a.resume_id,
          a.status,
          a.applied_date,
          a.updated_at,
          a.resume_version_snapshot,
          a.cover_letter_text,
          a.notes,
          j.title as job_title,
          j.company_name,
          j.job_url,
          j.platform
        FROM applications a
        LEFT JOIN jobs j ON a.job_id = j.id
        ORDER BY a.updated_at DESC
      `);

      if (!result || result.length === 0 || result[0].values.length === 0) {
        return [];
      }

      const columns = result[0].columns;
      const apps = result[0].values.map((row: any) => {
        const app: any = {};
        columns.forEach((col: string, i: number) => {
          app[col] = row[i];
        });
        return app;
      });

      logger.info('Retrieved applications', { count: apps.length });
      return apps;
    } catch (error) {
      logger.error('Failed to get applications', { error });
      return [];
    }
  });

  // Update application status
  ipcMain.handle('update-application-status', async (_, appId: number, status: string) => {
    try {
      const db = DatabaseService.getDatabase();
      db.exec(`
        UPDATE applications 
        SET status = '${status}', updated_at = datetime('now')
        WHERE id = ${appId}
      `);
      DatabaseService.save();
      logger.info('Application status updated', { appId, status });
      return true;
    } catch (error) {
      logger.error('Failed to update application status', { error, appId });
      return false;
    }
  });

  // Add note to application
  ipcMain.handle('add-application-note', async (_, appId: number, note: string) => {
    try {
      const db = DatabaseService.getDatabase();
      const escapedNote = note.replace(/'/g, "''");
      db.exec(`
        UPDATE applications 
        SET notes = '${escapedNote}', updated_at = datetime('now')
        WHERE id = ${appId}
      `);
      DatabaseService.save();
      logger.info('Application note added', { appId });
      return true;
    } catch (error) {
      logger.error('Failed to add application note', { error, appId });
      return false;
    }
  });

  // Save user settings
  ipcMain.handle('save-user-settings', async (_, settings: any) => {
    try {
      const db = DatabaseService.getDatabase();
      
      // Check if user exists
      const userCheck = db.exec('SELECT id FROM users LIMIT 1');
      
      if (userCheck && userCheck[0] && userCheck[0].values.length > 0) {
        // Update existing user
        const userId = userCheck[0].values[0][0];
        db.exec(`
          UPDATE users 
          SET email = '${settings.email?.replace(/'/g, "''")}',
              updated_at = datetime('now')
          WHERE id = ${userId}
        `);
        
        // Update or insert user_settings (we'll need to add this table)
        db.exec(`
          CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        
        const settingsCheck = db.exec(`SELECT id FROM user_settings WHERE user_id = ${userId}`);
        
        if (settingsCheck && settingsCheck[0] && settingsCheck[0].values.length > 0) {
          db.exec(`
            UPDATE user_settings
            SET name = '${settings.name?.replace(/'/g, "''")}',
                address = '${settings.address?.replace(/'/g, "''")}',
                city = '${settings.city?.replace(/'/g, "''")}',
                state = '${settings.state?.replace(/'/g, "''")}',
                zip = '${settings.zip?.replace(/'/g, "''")}',
                phone = '${settings.phone?.replace(/'/g, "''")}',
                updated_at = datetime('now')
            WHERE user_id = ${userId}
          `);
        } else {
          db.exec(`
            INSERT INTO user_settings (user_id, name, address, city, state, zip, phone)
            VALUES (
              ${userId},
              '${settings.name?.replace(/'/g, "''")}',
              '${settings.address?.replace(/'/g, "''")}',
              '${settings.city?.replace(/'/g, "''")}',
              '${settings.state?.replace(/'/g, "''")}',
              '${settings.zip?.replace(/'/g, "''")}',
              '${settings.phone?.replace(/'/g, "''")}'
            )
          `);
        }
      }
      
      logger.info('User settings saved');
      return { success: true };
    } catch (error) {
      logger.error('Failed to save user settings', { error });
      throw error;
    }
  });

  // Get user settings
  ipcMain.handle('get-user-settings', async () => {
    try {
      const db = DatabaseService.getDatabase();
      
      // Ensure table exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          zip TEXT,
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      const result = db.exec(`
        SELECT us.name, us.address, us.city, us.state, us.zip, us.phone, u.email
        FROM user_settings us
        JOIN users u ON us.user_id = u.id
        LIMIT 1
      `);

      if (!result || result.length === 0 || result[0].values.length === 0) {
        return {
          name: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          email: '',
          phone: ''
        };
      }

      const row = result[0].values[0];
      return {
        name: row[0] || '',
        address: row[1] || '',
        city: row[2] || '',
        state: row[3] || '',
        zip: row[4] || '',
        phone: row[5] || '',
        email: row[6] || ''
      };
    } catch (error) {
      logger.error('Failed to get user settings', { error });
      return {
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        email: '',
        phone: ''
      };
    }
  });

  // Download resume as DOCX
  ipcMain.handle('download-resume', async (_, jobId: number) => {
    try {
      const db = DatabaseService.getDatabase();
      
      // Get application materials
      const appResult = db.exec(`
        SELECT resume_version_snapshot FROM applications WHERE job_id = ${jobId} LIMIT 1
      `);
      
      if (!appResult || appResult.length === 0 || appResult[0].values.length === 0) {
        throw new Error('No application materials found for this job');
      }
      
      const tailoredResume = appResult[0].values[0][0] as string;
      
      // Get user settings
      const settingsResult = db.exec(`
        SELECT us.name, us.address, us.city, us.state, us.zip, us.phone, u.email
        FROM user_settings us
        JOIN users u ON us.user_id = u.id
        LIMIT 1
      `);
      
      const userSettings = settingsResult && settingsResult[0]?.values[0] ? {
        name: settingsResult[0].values[0][0] as string || '',
        address: settingsResult[0].values[0][1] as string || '',
        city: settingsResult[0].values[0][2] as string || '',
        state: settingsResult[0].values[0][3] as string || '',
        zip: settingsResult[0].values[0][4] as string || '',
        phone: settingsResult[0].values[0][5] as string || '',
        email: settingsResult[0].values[0][6] as string || ''
      } : {
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        email: '',
        phone: ''
      };
      
      // Get job info for filename
      const jobResult = db.exec(`SELECT title, company_name FROM jobs WHERE id = ${jobId}`);
      const jobTitle = jobResult?.[0]?.values[0]?.[0] as string || 'Job';
      const companyName = jobResult?.[0]?.values[0]?.[1] as string || 'Company';
      
      // Get resume for original format and template
      const resumeResult = db.exec('SELECT * FROM resumes WHERE is_primary = 1 LIMIT 1');
      const resumeRow = resumeResult?.[0]?.values[0];
      const resumeColumns = resumeResult?.[0]?.columns || [];
      
      const resume = resumeRow ? {
        contact_info: resumeRow[resumeColumns.indexOf('contact_info')],
        summary: resumeRow[resumeColumns.indexOf('summary')],
        work_experience: resumeRow[resumeColumns.indexOf('work_experience')],
        education: resumeRow[resumeColumns.indexOf('education')],
        hard_skills: resumeRow[resumeColumns.indexOf('hard_skills')],
        certifications: resumeRow[resumeColumns.indexOf('certifications')]
      } : {};
      
      // Get original DOCX template if available
      const templateIndex = resumeColumns.indexOf('original_docx_template');
      const templateBuffer = (templateIndex >= 0 && resumeRow?.[templateIndex]) 
        ? Buffer.from(resumeRow[templateIndex] as Uint8Array)
        : undefined;
      
      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: 'Save Resume',
        defaultPath: `Resume_${companyName.replace(/[^a-z0-9]/gi, '_')}_${jobTitle.replace(/[^a-z0-9]/gi, '_')}.docx`,
        filters: [{ name: 'Word Document', extensions: ['docx'] }]
      });
      
      if (!result.canceled && result.filePath) {
        await DocumentGenerator.generateResume(
          tailoredResume,
          userSettings,
          resume,
          result.filePath,
          templateBuffer
        );
        
        logger.info('Resume downloaded', { jobId, path: result.filePath });
        return { success: true, path: result.filePath };
      }
      
      return { success: false };
    } catch (error) {
      logger.error('Failed to download resume', { error, jobId });
      throw error;
    }
  });

  // Download cover letter as DOCX
  ipcMain.handle('download-cover-letter', async (_, jobId: number) => {
    try {
      const db = DatabaseService.getDatabase();
      
      // Get application materials
      const appResult = db.exec(`
        SELECT cover_letter_text FROM applications WHERE job_id = ${jobId} LIMIT 1
      `);
      
      if (!appResult || appResult.length === 0 || appResult[0].values.length === 0) {
        throw new Error('No cover letter found for this job');
      }
      
      const coverLetter = appResult[0].values[0][0] as string;
      
      // Get user settings
      const settingsResult = db.exec(`
        SELECT us.name, us.address, us.city, us.state, us.zip, us.phone, u.email
        FROM user_settings us
        JOIN users u ON us.user_id = u.id
        LIMIT 1
      `);
      
      const userSettings = settingsResult && settingsResult[0]?.values[0] ? {
        name: settingsResult[0].values[0][0] as string || '',
        address: settingsResult[0].values[0][1] as string || '',
        city: settingsResult[0].values[0][2] as string || '',
        state: settingsResult[0].values[0][3] as string || '',
        zip: settingsResult[0].values[0][4] as string || '',
        phone: settingsResult[0].values[0][5] as string || '',
        email: settingsResult[0].values[0][6] as string || ''
      } : {
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        email: '',
        phone: ''
      };
      
      // Get job info
      const jobResult = db.exec(`SELECT title, company_name FROM jobs WHERE id = ${jobId}`);
      const jobTitle = jobResult?.[0]?.values[0]?.[0] as string || 'Job';
      const companyName = jobResult?.[0]?.values[0]?.[1] as string || 'Company';
      
      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: 'Save Cover Letter',
        defaultPath: `CoverLetter_${companyName.replace(/[^a-z0-9]/gi, '_')}_${jobTitle.replace(/[^a-z0-9]/gi, '_')}.docx`,
        filters: [{ name: 'Word Document', extensions: ['docx'] }]
      });
      
      if (!result.canceled && result.filePath) {
        await DocumentGenerator.generateCoverLetter(
          coverLetter,
          userSettings,
          jobTitle,
          companyName,
          result.filePath
        );
        
        logger.info('Cover letter downloaded', { jobId, path: result.filePath });
        return { success: true, path: result.filePath };
      }
      
      return { success: false };
    } catch (error) {
      logger.error('Failed to download cover letter', { error, jobId });
      throw error;
    }
  });

  logger.info('IPC handlers registered');
}
