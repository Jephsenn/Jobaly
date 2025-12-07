/**
 * One-time script to add current_title to existing resumes
 * 
 * INSTRUCTIONS:
 * 1. Open http://localhost:3000 in your browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run
 * 5. Refresh the page to see updated match scores
 */

(async function fixResumeTitles() {
  console.log('🔧 Updating resumes with current_title...');
  
  // Access the database directly from the window object
  const Dexie = (await import('https://unpkg.com/dexie@latest/dist/dexie.mjs')).default;
  
  const db = new Dexie('JobTrackerDB');
  db.version(2).stores({
    jobs: '++id, title, company, location, salary_min, salary_max, url, source, created_at, saved, applied',
    resumes: '++id, name, created_at, is_primary',
    applications: '++id, job_id, resume_id, status, applied_date, created_at',
    generated_materials: '++id, job_id, resume_id, type, created_at'
  });
  
  const resumes = await db.resumes.toArray();
  console.log(`📄 Found ${resumes.length} resumes to check`);
  
  let updated = 0;
  for (const resume of resumes) {
    if (!resume.current_title && resume.work_experiences && resume.work_experiences.length > 0) {
      const currentTitle = resume.work_experiences[0].title;
      await db.resumes.update(resume.id, {
        current_title: currentTitle
      });
      console.log(`✅ Updated "${resume.name}" with current_title: "${currentTitle}"`);
      updated++;
    } else if (resume.current_title) {
      console.log(`⏭️ "${resume.name}" already has current_title: "${resume.current_title}"`);
    } else {
      console.log(`⚠️ "${resume.name}" has no work experiences to extract title from`);
    }
  }
  
  console.log(`\n✨ Updated ${updated} resume(s)!`);
  console.log('🔄 Refresh the page to see updated match scores');
})();
