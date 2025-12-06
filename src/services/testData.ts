// Test Data Seeder for Jobaly Web App
// Run this in the browser console to populate test data

import { jobsAPI, resumesAPI } from './database';

export async function seedTestData() {
  console.log('🌱 Seeding test data...');

  // Add test jobs
  const testJobs = [
    {
      title: 'Senior Frontend Developer',
      company_name: 'TechCorp Inc.',
      url: 'https://example.com/jobs/1',
      description: 'We are looking for an experienced Frontend Developer to join our team. You will work with React, TypeScript, and modern web technologies.',
      location: 'San Francisco, CA',
      location_type: 'hybrid' as const,
      salary_min: 120000,
      salary_max: 180000,
      salary_period: 'year',
      employment_type: 'full-time',
      experience_years: 5,
      required_skills: 'React, TypeScript, JavaScript, HTML, CSS',
      platform: 'linkedin',
      is_saved: true,
    },
    {
      title: 'Full Stack Engineer',
      company_name: 'StartupXYZ',
      url: 'https://example.com/jobs/2',
      description: 'Join our fast-paced startup! We need a full stack engineer proficient in Node.js and React.',
      location: 'Remote',
      location_type: 'remote' as const,
      salary_min: 100000,
      salary_max: 150000,
      salary_period: 'year',
      employment_type: 'full-time',
      experience_years: 3,
      required_skills: 'Node.js, React, MongoDB, REST APIs',
      platform: 'indeed',
      is_saved: false,
    },
    {
      title: 'React Developer',
      company_name: 'Digital Agency',
      url: 'https://example.com/jobs/3',
      description: 'Looking for a React developer to build engaging user interfaces for our clients.',
      location: 'New York, NY',
      location_type: 'onsite' as const,
      salary_min: 90000,
      salary_max: 130000,
      salary_period: 'year',
      employment_type: 'full-time',
      experience_years: 2,
      required_skills: 'React, Redux, CSS, JavaScript',
      platform: 'glassdoor',
      is_saved: true,
    },
    {
      title: 'Junior Web Developer',
      company_name: 'WebSolutions Co.',
      url: 'https://example.com/jobs/4',
      description: 'Entry-level position for a motivated web developer eager to learn and grow.',
      location: 'Austin, TX',
      location_type: 'hybrid' as const,
      salary_min: 60000,
      salary_max: 80000,
      salary_period: 'year',
      employment_type: 'full-time',
      experience_years: 1,
      required_skills: 'HTML, CSS, JavaScript, Git',
      platform: 'linkedin',
      is_saved: false,
    },
    {
      title: 'UI/UX Developer',
      company_name: 'Design Studio',
      url: 'https://example.com/jobs/5',
      description: 'Create beautiful and intuitive user interfaces. Experience with Figma and modern CSS frameworks required.',
      location: 'Remote',
      location_type: 'remote' as const,
      salary_min: 85000,
      salary_max: 120000,
      salary_period: 'year',
      employment_type: 'contract',
      experience_years: 3,
      required_skills: 'Figma, CSS, React, Tailwind CSS',
      platform: 'indeed',
      is_saved: true,
    },
  ];

  for (const job of testJobs) {
    await jobsAPI.add(job);
  }

  console.log(`✅ Added ${testJobs.length} test jobs`);

  // Add test resume
  const testResume = {
    name: 'Main Resume 2024',
    full_text: `John Doe
Senior Software Engineer

SUMMARY
Experienced software engineer with 5+ years building modern web applications using React, TypeScript, and Node.js.

EXPERIENCE
Senior Frontend Developer | TechCorp (2021-Present)
- Built scalable React applications serving 1M+ users
- Mentored junior developers and led code reviews
- Improved performance by 40% through optimization

Frontend Developer | StartupCo (2019-2021)
- Developed responsive web applications with React and Redux
- Collaborated with designers to implement pixel-perfect UIs

SKILLS
Languages: JavaScript, TypeScript, HTML, CSS, Python
Frameworks: React, Node.js, Express, Next.js
Tools: Git, Docker, AWS, CI/CD

EDUCATION
B.S. Computer Science | University of Technology (2019)`,
    is_primary: true,
    hard_skills: 'React, TypeScript, JavaScript, Node.js, Express, HTML, CSS, Python, Git, Docker, AWS',
    soft_skills: 'Leadership, Mentoring, Communication, Problem Solving',
    tools_technologies: 'React, Redux, Next.js, Tailwind CSS, Git, Docker, AWS, CI/CD',
    years_of_experience: 5,
    current_title: 'Senior Frontend Developer',
    education: 'B.S. Computer Science',
  };

  await resumesAPI.add(testResume);
  console.log('✅ Added test resume');

  console.log('🎉 Test data seeding complete!');
  console.log('Refresh the page to see your data.');
}

// Also export a function to clear data
export async function clearAllData() {
  const { dataAPI } = await import('./database');
  await dataAPI.clearAll();
  console.log('🗑️ All data cleared!');
}

// Make functions available globally in dev mode
if (typeof window !== 'undefined') {
  (window as any).seedTestData = seedTestData;
  (window as any).clearAllData = clearAllData;
  console.log('💡 Test data functions available:');
  console.log('   - seedTestData() - Add sample jobs and resume');
  console.log('   - clearAllData() - Clear all data from database');
}
