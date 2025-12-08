import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import type { Job } from '@services/database';
import { jobsAPI, applicationsAPI, resumesAPI, generatedMaterialsAPI } from '@services/database';
import { enhanceResumeForJob, getAISettings } from '../../services/resumeEnhancer';
import { generateResumeDocx, generateCoverLetterDocx, type BulletUpdateStatus } from '../../services/resumeGenerator';
import { calculateMatchScore, getMatchScoreColor, type MatchScoreBreakdown } from '../../services/matchScoreCalculator';

const Dashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matchScores, setMatchScores] = useState<Record<number, MatchScoreBreakdown>>({});
  const [showBreakdown, setShowBreakdown] = useState<number | null>(null);
  const [stats, setStats] = useState({
    jobsDetected: 0,
    jobsThisWeek: 0,
    applications: 0,
    interviews: 0,
  });

  // Load jobs on mount and when page becomes visible
  useEffect(() => {
    loadJobs();

    // Listen for jobs from browser extension (custom event)
    const handleJobDetected = () => {
      console.log('Dashboard: Job detected from extension, reloading...');
      loadJobs();
    };
    
    // Listen for page visibility changes (recalculate when user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Dashboard: Page visible, recalculating match scores...');
        loadJobs();
      }
    };
    
    window.addEventListener('jobDetected', handleJobDetected as EventListener);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('jobDetected', handleJobDetected as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty dependency array - only run once

  const loadJobs = async () => {
    try {
      const allJobs = await jobsAPI.getAll();
      setJobs(allJobs);
      
      // Calculate match scores for each job
      const primaryResume = await resumesAPI.getPrimary();
      console.log('Primary resume:', primaryResume ? 'Found' : 'Not found');
      
      const calculatedScores: Record<number, MatchScoreBreakdown> = {};
      
      if (primaryResume) {
        console.log('Calculating match scores for', allJobs.length, 'jobs');
        allJobs.forEach(job => {
          if (job.id) {
            const score = calculateMatchScore(primaryResume, job);
            calculatedScores[job.id] = score;
            console.log(`Job "${job.title}" - Match: ${score.overall}%`, score.details);
          }
        });
      } else {
        console.log('No primary resume - using neutral scores');
        // No resume uploaded - use neutral scores
        allJobs.forEach(job => {
          if (job.id) {
            calculatedScores[job.id] = {
              overall: 50,
              skills: 50,
              experience: 50,
              title: 50,
              keywords: 50,
              details: {
                matchedSkills: [],
                missingSkills: [],
                experienceGap: 0,
                titleSimilarity: 'No resume uploaded',
                keywordMatches: 0,
                totalKeywords: 0
              }
            };
          }
        });
      }
      setMatchScores(calculatedScores);
      
      // Calculate stats
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentJobs = allJobs.filter(j => 
        new Date(j.created_at) > oneWeekAgo
      );

      const applications = await applicationsAPI.getAll();

      setStats({
        jobsDetected: allJobs.length,
        jobsThisWeek: recentJobs.length,
        applications: applications.length,
        interviews: applications.filter(a => a.status === 'interview').length,
      });
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const handleSaveJob = async (jobId: number) => {
    await jobsAPI.markSaved(jobId, true);
    loadJobs();
  };

  const handleDismissJob = async (jobId: number) => {
    // Check if job is saved before dismissing
    const job = jobs.find(j => j.id === jobId);
    if (job?.is_saved) {
      const confirmed = window.confirm(
        '⚠️ This job is saved!\n\nAre you sure you want to dismiss it? This action cannot be undone.'
      );
      if (!confirmed) return;
    }
    
    await jobsAPI.delete(jobId);
    loadJobs();
  };

  const handleMarkApplied = async (jobId: number) => {
    // Create application record
    await applicationsAPI.add({
      job_id: jobId,
      status: 'applied',
      applied_date: new Date().toISOString()
    });
    await jobsAPI.markSaved(jobId, true);
    loadJobs();
  };

  const handleEnhanceResume = async (job: Job) => {
    try {
      // Confirm with user before generating (uses AI credits)
      const confirmed = window.confirm(
        `✨ Generate AI-Tailored Application Materials?\n\n` +
        `This will create:\n` +
        `• Tailored resume for ${job.company_name}\n` +
        `• Custom cover letter\n` +
        `• Optimized for: ${job.title}\n\n` +
        `Note: This uses AI credits. Continue?`
      );
      
      if (!confirmed) return;

      // Check if AI is enabled
      const aiSettings = getAISettings();
      if (!aiSettings.enabled) {
        alert('Please enable AI in Settings to use resume enhancement features.');
        return;
      }

      // Get primary resume
      const primaryResume = await resumesAPI.getPrimary();
      if (!primaryResume) {
        alert('Please upload a resume first in the Resumes page.');
        return;
      }

      // Show loading state
      alert('⏳ Generating tailored materials... This may take 10-20 seconds.');
      
      // Enhance resume for this job
      const enhanced = await enhanceResumeForJob(primaryResume, job);
      
      // Generate and download DOCX
      await generateResumeDocx(enhanced);
      
      alert('✅ Resume enhanced and downloaded successfully!');
    } catch (error) {
      console.error('Failed to enhance resume:', error);
      alert(`❌ Failed to enhance resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Track your job search progress and discover new opportunities
          </p>
        </div>

        {/* Stats Grid - 2x2 on smaller screens, 4 columns on large screens */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <StatCard
            title="Jobs Detected"
            value={stats.jobsDetected.toString()}
            change={`+${stats.jobsThisWeek} this week`}
            icon="🔍"
            color="blue"
          />
          <StatCard
            title="Applications"
            value={stats.applications.toString()}
            change="+0 this month"
            icon="📮"
            color="green"
          />
          <StatCard
            title="Interviews"
            value={stats.interviews.toString()}
            change="+0 scheduled"
            icon="💼"
            color="purple"
          />
          <StatCard
            title="Offers"
            value="0"
            change="0 pending"
            icon="🎉"
            color="yellow"
          />
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Jobs</h2>
          
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Jobaly!</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Your job search dashboard is empty. Start browsing job sites with the Jobaly browser extension installed, and jobs will automatically appear here!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.slice(0, 10).map(job => (
                <JobCard 
                  key={job.id} 
                  job={job}
                  matchScore={matchScores[job.id!]}
                  showBreakdown={showBreakdown === job.id}
                  onToggleBreakdown={() => setShowBreakdown(showBreakdown === job.id ? null : job.id!)}
                  onSave={() => handleSaveJob(job.id!)}
                  onDismiss={() => handleDismissJob(job.id!)}
                  onMarkApplied={() => handleMarkApplied(job.id!)}
                  onEnhanceResume={() => handleEnhanceResume(job)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface JobCardProps {
  job: Job;
  matchScore?: MatchScoreBreakdown;
  showBreakdown?: boolean;
  onToggleBreakdown?: () => void;
  onSave: () => void;
  onDismiss: () => void;
  onMarkApplied: () => void;
  onEnhanceResume: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, matchScore, showBreakdown, onToggleBreakdown, onSave, onDismiss, onMarkApplied, onEnhanceResume }) => {
  const [showMaterials, setShowMaterials] = React.useState(false);
  const [materials, setMaterials] = React.useState<any>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationProgress, setGenerationProgress] = React.useState({ step: '', percent: 0 });
  const [generatedResume, setGeneratedResume] = React.useState<any>(null);
  const [applicationStatus, setApplicationStatus] = React.useState<string | null>(null);
  const [showDetails, setShowDetails] = React.useState(false);
  const [tooltipPosition, setTooltipPosition] = React.useState({ top: 0, left: 0, maxHeight: 0 });
  const [expandedExperiences, setExpandedExperiences] = React.useState<Set<number>>(new Set());
  const breakdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Close breakdown when clicking outside
  React.useEffect(() => {
    if (!showBreakdown) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (breakdownRef.current && !breakdownRef.current.contains(event.target as Node)) {
        onToggleBreakdown?.();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBreakdown, onToggleBreakdown]);

  // Calculate tooltip position when shown - intelligently position above or below
  React.useEffect(() => {
    if (!showBreakdown || !buttonRef.current) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Get actual tooltip height if available, otherwise estimate
        const tooltipHeight = breakdownRef.current?.offsetHeight || 550;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Position above if not enough space below
        const positionAbove = spaceBelow < tooltipHeight + 16 && spaceAbove > spaceBelow;
        
        setTooltipPosition({
          top: positionAbove 
            ? rect.top + scrollTop - Math.min(tooltipHeight, spaceAbove - 16) - 8  // Position above with actual height
            : rect.bottom + scrollTop + 8,              // Position below
          left: Math.max(8, Math.min(rect.left + scrollLeft, window.innerWidth - 328)), // Keep within viewport (320px width + 8px margin)
          maxHeight: positionAbove ? spaceAbove - 16 : spaceBelow - 16 // Constrain height to available space
        });
      }
    };

    // Initial position (with slight delay to let tooltip render)
    setTimeout(updatePosition, 0);

    // Update position on scroll
    window.addEventListener('scroll', updatePosition, true); // Use capture phase to catch all scrolls
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showBreakdown]);

  // Check if there's an application for this job
  React.useEffect(() => {
    const checkApplication = async () => {
      if (!job.id) return;
      const apps = await applicationsAPI.getByJobId(job.id);
      if (apps && apps.length > 0) {
        setApplicationStatus(apps[0].status);
      }
    };
    checkApplication();
  }, [job.id]);

  // Load existing generated materials if available
  React.useEffect(() => {
    const loadExistingMaterials = async () => {
      if (!job.id) return;
      const materials = await generatedMaterialsAPI.getByJobId(job.id);
      if (materials) {
        setGeneratedResume(materials.enhanced_resume);
      }
    };
    loadExistingMaterials();
  }, [job.id]);

  const openMaterialsModal = async () => {
    // Open modal - will show existing materials if already generated
    setShowMaterials(true);
    setIsGenerating(false);
  };

  const handleGenerateMaterials = async () => {
    try {
      // Confirm with user before generating (uses AI credits)
      const confirmed = window.confirm(
        `✨ Generate AI-Tailored Application Materials?\n\n` +
        `This will create:\n` +
        `• Tailored resume for ${job.company_name}\n` +
        `• Custom cover letter\n` +
        `• Optimized for: ${job.title}\n\n` +
        `Note: This uses AI credits. Continue?`
      );
      
      if (!confirmed) return;

      setIsGenerating(true);
      setGenerationProgress({ step: 'Initializing...', percent: 5 });

      // Check if AI is enabled
      const aiSettings = getAISettings();
      if (!aiSettings.enabled) {
        alert('Please enable AI in Settings to use resume enhancement features.');
        setIsGenerating(false);
        return;
      }

      setGenerationProgress({ step: 'Loading resume...', percent: 15 });

      // Get primary resume
      const primaryResume = await resumesAPI.getPrimary();
      if (!primaryResume) {
        alert('Please upload a resume first in the Resumes page.');
        setIsGenerating(false);
        return;
      }

      setGenerationProgress({ step: 'Enhancing work experiences with AI...', percent: 30 });

      // Enhance resume for this job - this takes the most time
      const enhanced = await enhanceResumeForJob(primaryResume, job, (progress) => {
        // Update progress during enhancement
        setGenerationProgress({ 
          step: progress.step || 'Enhancing work experiences...', 
          percent: 30 + (progress.percent * 0.5) // 30% to 80%
        });
      });
      
      setGenerationProgress({ step: 'Saving materials...', percent: 90 });

      // Save generated materials to database
      if (job.id) {
        await generatedMaterialsAPI.save(job.id, enhanced);
      }
      
      setGeneratedResume(enhanced);
      setGenerationProgress({ step: 'Complete!', percent: 100 });
      
      // Wait a moment before hiding progress
      setTimeout(() => {
        setIsGenerating(false);
      }, 500);
      
      alert('✅ Materials generated successfully! You can now download them below.');
    } catch (error) {
      console.error('Failed to generate materials:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to generate materials'}`);
      setIsGenerating(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!generatedResume) return;
    try {
      const updateStatuses = await generateResumeDocx(generatedResume);
      
      // Store the update statuses in the generated resume for display
      const updatedResume = {
        ...generatedResume,
        bulletUpdateStatuses: updateStatuses
      };
      setGeneratedResume(updatedResume);
      
      // Save the update statuses to the database so they persist
      if (job.id) {
        await generatedMaterialsAPI.save(job.id, updatedResume);
      }
      
      alert('✅ Resume downloaded successfully!');
    } catch (error) {
      console.error('Failed to download resume:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to download resume'}`);
    }
  };

  const handleDownloadCoverLetter = async () => {
    if (!generatedResume) return;
    try {
      await generateCoverLetterDocx(generatedResume);
      alert('✅ Cover letter downloaded successfully!');
    } catch (error) {
      console.error('Failed to download cover letter:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to download cover letter'}`);
    }
  };

  const timeAgo = (date: Date | string) => {
    const detectedDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date().getTime();
    const detected = detectedDate.getTime();
    
    if (isNaN(detected)) return 'recently';
    
    const seconds = Math.floor((now - detected) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Use snake_case database fields
  const jobUrl = job.url;
  const companyName = job.company_name;
  const jobTitle = job.title && job.title !== 'Untitled Position' ? job.title : null;
  const isSaved = job.is_saved;
  const detectedAt = job.created_at;

  // Extract title from URL if not provided
  const displayTitle = jobTitle || extractTitleFromUrl(jobUrl, job.platform) || 'Job Posting';

  // Get match score color
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-500">{job.platform}</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-500">{timeAgo(detectedAt)}</span>
            {matchScore && (
              <>
                <span className="text-gray-300">•</span>
                {matchScore.overall === 50 && matchScore.details.matchedSkills?.length === 0 ? (
                  // No resume uploaded - show warning icon
                  <button
                    ref={buttonRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBreakdown?.();
                    }}
                    className="px-2 py-1 rounded-md border border-orange-200 bg-orange-50 text-orange-700 text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
                    title="Upload a resume to calculate match score"
                  >
                    <span className="text-base">⚠️</span>
                    <span>No Match Score</span>
                  </button>
                ) : (
                  // Resume uploaded - show match score
                  <button
                    ref={buttonRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBreakdown?.();
                    }}
                    className={`px-2 py-1 rounded-md border text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${getMatchColor(matchScore.overall)}`}
                    title="Click for match breakdown"
                  >
                    {matchScore.overall}% Match
                  </button>
                )}

                  
                {/* Match Score Breakdown Tooltip - Rendered via Portal */}
                {showBreakdown && ReactDOM.createPortal(
                  <div 
                    ref={breakdownRef} 
                    className="absolute w-80 bg-white border border-gray-300 rounded-lg shadow-xl p-4 z-50 overflow-y-auto"
                    style={{ 
                      top: `${tooltipPosition.top}px`, 
                      left: `${tooltipPosition.left}px`,
                      maxHeight: `${tooltipPosition.maxHeight}px`
                    }}
                  >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Match Breakdown</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBreakdown?.();
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                      
                      {/* Overall Score */}
                      <div className={`mb-3 p-2 rounded ${getMatchColor(matchScore.overall)}`}>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{matchScore.overall}%</div>
                          <div className="text-xs">Overall Match</div>
                        </div>
                      </div>
                      
                      {/* Component Scores */}
                      <div className="space-y-3">
                        {/* Skills */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">Skills (40%)</span>
                            <span className={`font-semibold ${matchScore.skills >= 70 ? 'text-green-600' : matchScore.skills >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {matchScore.skills}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div
                              className={`h-2 rounded-full ${matchScore.skills >= 70 ? 'bg-green-500' : matchScore.skills >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${matchScore.skills}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600">
                            {matchScore.details.matchedSkills?.length || 0} matched, {matchScore.details.missingSkills?.length || 0} missing
                          </div>
                          {matchScore.details.matchedSkills && matchScore.details.matchedSkills.length > 0 && (
                            <div className="text-xs text-green-700 mt-1">
                              ✓ {matchScore.details.matchedSkills.slice(0, 3).join(', ')}
                              {matchScore.details.matchedSkills.length > 3 && ` +${matchScore.details.matchedSkills.length - 3} more`}
                            </div>
                          )}
                          {matchScore.details.missingSkills && matchScore.details.missingSkills.length > 0 && (
                            <div className="text-xs text-red-700 mt-1">
                              ✗ {matchScore.details.missingSkills.slice(0, 3).join(', ')}
                              {matchScore.details.missingSkills.length > 3 && ` +${matchScore.details.missingSkills.length - 3} more`}
                            </div>
                          )}
                        </div>
                        
                        {/* Experience */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">Experience (25%)</span>
                            <span className={`font-semibold ${matchScore.experience >= 70 ? 'text-green-600' : matchScore.experience >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {matchScore.experience}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div
                              className={`h-2 rounded-full ${matchScore.experience >= 70 ? 'bg-green-500' : matchScore.experience >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${matchScore.experience}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600">
                            {matchScore.details.experienceGap}
                          </div>
                        </div>
                        
                        {/* Title */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">Title Match (20%)</span>
                            <span className={`font-semibold ${matchScore.title >= 70 ? 'text-green-600' : matchScore.title >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {matchScore.title}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div
                              className={`h-2 rounded-full ${matchScore.title >= 70 ? 'bg-green-500' : matchScore.title >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${matchScore.title}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600">
                            {matchScore.details.titleSimilarity}
                          </div>
                        </div>
                        
                        {/* Keywords */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">Keywords (15%)</span>
                            <span className={`font-semibold ${matchScore.keywords >= 70 ? 'text-green-600' : matchScore.keywords >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {matchScore.keywords}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div
                              className={`h-2 rounded-full ${matchScore.keywords >= 70 ? 'bg-green-500' : matchScore.keywords >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${matchScore.keywords}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600">
                            {matchScore.details.keywordMatches || 0} / {matchScore.details.totalKeywords || 0} keywords found
                          </div>
                        </div>
                      </div>
                      
                      {/* Info Message */}
                      {matchScore.overall === 50 && matchScore.details.matchedSkills?.length === 0 && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">⚠️</span>
                            <div>
                              <div className="font-semibold mb-1">No Resume Uploaded</div>
                              <div className="text-xs">Upload a resume in the Resumes page to calculate accurate match scores for your jobs.</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  , document.body
                )}
              </>
            )}
          </div>
          
          <div className="flex items-start gap-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 flex-1">
              {displayTitle}
            </h3>
            {/* Data quality warning for incomplete scraping */}
            {(displayTitle.includes('LinkedIn Job') || displayTitle.includes('Indeed Job') || 
              !job.description || job.description.length < 100) && (
              <span 
                className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md"
                title="Job data may be incomplete. This can affect match score accuracy."
              >
                ⚠️ Limited Info
              </span>
            )}
          </div>
          
          {companyName && companyName !== 'Unknown Company' && (
            <p className="text-gray-600 mb-2">{companyName}</p>
          )}
          
          {/* Location, Salary, and Work Type - More prominent */}
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            {job.location && (
              <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                <span>📍</span>
                <span>{job.location}</span>
              </div>
            )}

            {job.location_type && (
              <div className="flex items-center gap-1 text-sm font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                <span>
                  {job.location_type === 'remote' && '🏠'}
                  {job.location_type === 'hybrid' && '🔄'}
                  {job.location_type === 'onsite' && '🏢'}
                </span>
                <span className="capitalize">{job.location_type}</span>
              </div>
            )}

            {(job.salary_min || job.salary_max) && (
              <div className="flex items-center gap-1 text-sm font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <span>💰</span>
                <span>
                  {job.salary_min && job.salary_max 
                    ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
                    : job.salary_min 
                      ? `$${job.salary_min.toLocaleString()}+`
                      : job.salary_max
                        ? `Up to $${job.salary_max.toLocaleString()}`
                        : 'Salary available'
                  }
                  {job.salary_period && (
                    <span className="text-xs opacity-80">
                      /{job.salary_period === 'hourly' ? 'hr' : 'yr'}
                    </span>
                  )}
                </span>
              </div>
            )}

            {((job as any).required_experience_years) && (
              <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
                <span>⏱️</span>
                <span>{(job as any).required_experience_years}+ yrs exp</span>
              </div>
            )}
          </div>

          {job.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-2">
              {job.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0 w-32">
          {!isSaved && (
            <>
              <button
                onClick={onSave}
                className="px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap w-full"
              >
                💾 Save
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors w-full"
              >
                Dismiss
              </button>
            </>
          )}
          {isSaved && applicationStatus === 'applied' && (
            <>
              <span className="px-2 py-2 bg-blue-100 text-blue-700 text-xs rounded-lg font-medium text-center w-full">
                ✉️ Applied
              </span>
              <button
                onClick={onDismiss}
                className="px-2 py-2 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors w-full"
              >
                Dismiss
              </button>
            </>
          )}
          {isSaved && (!applicationStatus || applicationStatus === 'draft') && (
            <>
              <span className="px-2 py-2 bg-green-100 text-green-700 text-xs rounded-lg font-medium text-center w-full">
                ✓ Saved
              </span>
              <button
                onClick={openMaterialsModal}
                className={`px-2 py-2 text-white text-xs rounded-lg transition-colors w-full ${
                  job.has_generated_materials 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
                title={job.has_generated_materials 
                  ? "View & download your generated materials" 
                  : "Generate AI-tailored resume & cover letter for this job"}
              >
                {job.has_generated_materials ? '📄 Materials' : '✨ Generate'}
              </button>
              <button
                onClick={onMarkApplied}
                className="px-2 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors w-full"
              >
                ✉️ Applied
              </button>
              <button
                onClick={onDismiss}
                className="px-2 py-2 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors w-full"
              >
                Dismiss
              </button>
            </>
          )}

        </div>
      </div>

      {/* Materials Generation Modal */}
      {showMaterials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {generatedResume ? '✅ Application Materials Generated' : '✨ Generate Application Materials'}
              </h2>
              <button
                onClick={() => setShowMaterials(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isGenerating ? (
                // Progress Bar - During Generation
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-4 text-center">
                      ✨ Generating Your Application Materials
                    </h3>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-700 mb-2">
                        <span>{generationProgress.step}</span>
                        <span>{Math.round(generationProgress.percent)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${generationProgress.percent}%` }}
                        />
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 text-center mt-4">
                      Please wait while AI enhances your resume for this position...
                    </p>
                    
                    {/* Animated Dots */}
                    <div className="flex justify-center gap-2 mt-6">
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      💡 <strong>Tip:</strong> This may take 20-40 seconds depending on your resume length and API rate limits.
                    </p>
                  </div>
                </div>
              ) : !generatedResume ? (
                // Preview Section - Before Generation
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">📋 What will be generated:</h3>
                    <ul className="space-y-2 text-blue-800">
                      <li className="flex items-start gap-2">
                        <span className="text-lg">📄</span>
                        <div>
                          <strong>Tailored Resume</strong>
                          <p className="text-sm">AI-enhanced bullet points optimized for {job.title} at {job.company_name}</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-lg">✉️</span>
                        <div>
                          <strong>Custom Cover Letter</strong>
                          <p className="text-sm">Professional cover letter highlighting your relevant experience</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-lg">✨</span>
                        <div>
                          <strong>Formatting Preserved</strong>
                          <p className="text-sm">Your original resume style and formatting maintained</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Sample Preview */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">📄 Sample Resume Preview</h3>
                    <div className="bg-gray-50 p-4 rounded-lg border text-sm space-y-3">
                      <div>
                        <p className="font-semibold text-gray-900">Professional Summary</p>
                        <p className="text-gray-600 italic mt-1">
                          [AI will create a tailored summary highlighting your relevant skills and experience for this role]
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Work Experience</p>
                        <p className="text-gray-600 italic mt-1">
                          • [Your experience bullets will be enhanced with strong action verbs]<br/>
                          • [Quantifiable achievements will be emphasized]<br/>
                          • [Keywords from the job description will be naturally incorporated]
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">✉️ Sample Cover Letter Preview</h3>
                    <div className="bg-gray-50 p-4 rounded-lg border text-sm">
                      <p className="text-gray-600 italic">
                        [A professional cover letter will be generated that:<br/>
                        • Introduces you and your interest in the role<br/>
                        • Highlights 2-3 key relevant experiences<br/>
                        • Explains why you're a great fit for {job.company_name}<br/>
                        • Closes with a call to action]
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Generated Content - After Generation
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">
                      ✅ Your application materials have been generated! Download them below to use in your application.
                    </p>
                  </div>

                  {/* Resume Summary */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">📄 Tailored Resume</h3>
                    
                    {/* Professional Summary */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">✨ Professional Summary</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border text-sm">
                        <p className="text-gray-700">
                          {generatedResume.enhanced.tailored_summary || 'Professional summary generated'}
                        </p>
                      </div>
                    </div>

                    {/* Work Experience Changes */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">📝 Enhanced Work Experience</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        {generatedResume.enhanced.work_experiences?.length || 0} experience sections enhanced with AI
                      </p>
                      
                      {/* Show before/after for each experience */}
                      <div className="space-y-6">
                        {(() => {
                          let globalBulletIndex = 0;
                          
                          return generatedResume.enhanced.work_experiences?.map((enhancedExp: any, expIndex: number) => {
                            const originalExp = generatedResume.original.work_experiences?.[expIndex];
                            if (!originalExp || !enhancedExp) return null;

                            // Count status for this experience
                            let enhancedAndInDocx = 0;
                            let enhancedNotInDocx = 0;
                            let unchangedCount = 0;
                            
                            const bulletComparisons = enhancedExp.bulletPoints.map((enhancedBullet: string, bulletIndex: number) => {
                              const originalBullet = originalExp.bulletPoints?.[bulletIndex];
                              const currentGlobalIndex = globalBulletIndex++;
                              
                              // Get status from bulletUpdateStatuses if available
                              const updateStatus = generatedResume.bulletUpdateStatuses?.find(
                                (s: BulletUpdateStatus) => s.bulletIndex === currentGlobalIndex
                              );
                              
                              const aiEnhanced = updateStatus?.aiEnhanced ?? (originalBullet !== enhancedBullet);
                              const docxUpdated = updateStatus?.docxUpdated ?? false;
                              
                              // Determine state
                              let state: 'success' | 'warning' | 'unchanged';
                              if (!aiEnhanced) {
                                state = 'unchanged';
                                unchangedCount++;
                              } else if (docxUpdated) {
                                state = 'success';
                                enhancedAndInDocx++;
                              } else {
                                state = 'warning';
                                enhancedNotInDocx++;
                              }
                              
                              return {
                                original: originalBullet || '',
                                enhanced: enhancedBullet,
                                state,
                                aiEnhanced,
                                docxUpdated
                              };
                            });

                            const isExpanded = expandedExperiences.has(expIndex);
                            
                            return (
                              <div key={expIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                {/* Experience Header - Clickable */}
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedExperiences);
                                    if (isExpanded) {
                                      newExpanded.delete(expIndex);
                                    } else {
                                      newExpanded.add(expIndex);
                                    }
                                    setExpandedExperiences(newExpanded);
                                  }}
                                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-gray-900">{enhancedExp.company}</p>
                                      <p className="text-sm text-gray-600">{enhancedExp.title}</p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {enhancedAndInDocx > 0 && (
                                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                            ✅ {enhancedAndInDocx} in DOCX
                                          </span>
                                        )}
                                        {enhancedNotInDocx > 0 && (
                                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                            ⚠️ {enhancedNotInDocx} manual copy needed
                                          </span>
                                        )}
                                        {unchangedCount > 0 && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                            {unchangedCount} unchanged
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <svg 
                                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </button>

                                {/* Bullet Points Comparison - Collapsible */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                                  {bulletComparisons.map((comparison: any, bulletIndex: number) => (
                                    <div key={bulletIndex} className="text-sm">
                                      {comparison.state === 'success' ? (
                                        // AI Enhanced AND in DOCX - Green
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                          <div className="flex items-start gap-2 mb-2">
                                            <span className="text-red-500 font-bold">−</span>
                                            <p className="text-gray-500 line-through flex-1">{comparison.original}</p>
                                          </div>
                                          <div className="flex items-start gap-2">
                                            <span className="text-green-600 font-bold">+</span>
                                            <div className="flex-1">
                                              <p className="text-green-700 font-medium">{comparison.enhanced}</p>
                                              <p className="text-xs text-green-600 mt-1">✅ Updated in downloaded file</p>
                                            </div>
                                          </div>
                                        </div>
                                      ) : comparison.state === 'warning' ? (
                                        // AI Enhanced but NOT in DOCX - Yellow
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                          <div className="flex items-start gap-2 mb-2">
                                            <span className="text-red-500 font-bold">−</span>
                                            <p className="text-gray-500 line-through flex-1">{comparison.original}</p>
                                          </div>
                                          <div className="flex items-start gap-2">
                                            <span className="text-yellow-600 font-bold">+</span>
                                            <div className="flex-1">
                                              <p className="text-yellow-800 font-medium">{comparison.enhanced}</p>
                                              <p className="text-xs text-yellow-700 mt-1">
                                                ⚠️ <strong>Not in file</strong> - Copy this text manually to your resume
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        // Unchanged - Gray
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                          <div className="flex items-start gap-2 opacity-60">
                                            <span className="text-gray-400">•</span>
                                            <div className="flex-1">
                                              <p className="text-gray-600">{comparison.enhanced}</p>
                                              <p className="text-xs text-gray-400 mt-1 italic">No changes</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Cover Letter Preview */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">✉️ Cover Letter</h3>
                    <div className="bg-white p-6 rounded-lg border shadow-sm text-sm max-h-96 overflow-y-auto font-serif">
                      {/* Sender Info (Your Contact Info) - Traditional Business Letter Format */}
                      {(() => {
                        // Get user settings and resume data
                        const resume = generatedResume.original;
                        let name = '';
                        let address = '';
                        let city = '';
                        let state = '';
                        let zip = '';
                        let email = resume.email;
                        let phone = resume.phone;
                        const linkedin = resume.linkedin;
                        
                        // Extract name first
                        try {
                          const userSettings = localStorage.getItem('jobaly_user_settings');
                          if (userSettings) {
                            const parsed = JSON.parse(userSettings);
                            if (parsed.name) name = parsed.name;
                            if (parsed.address) address = parsed.address;
                            if (parsed.city) city = parsed.city;
                            if (parsed.state) state = parsed.state;
                            if (parsed.zip) zip = parsed.zip;
                            if (parsed.email) email = parsed.email;
                            if (parsed.phone) phone = parsed.phone;
                          }
                        } catch (error) {
                          // Use resume data if settings not available
                        }
                        
                        // If no name from settings, extract from resume
                        if (!name && resume.full_text) {
                          const lines = resume.full_text.split('\n');
                          for (let i = 0; i < Math.min(5, lines.length); i++) {
                            const line = lines[i].trim();
                            if (line.length > 0 && 
                                line.length < 50 &&
                                !line.includes('@') && 
                                !line.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) &&
                                !line.toLowerCase().includes('linkedin') &&
                                !line.toLowerCase().includes('http') &&
                                /^[A-Z][a-z]+(\s+[A-Z]\.?)?\s+[A-Z][a-z]+$/.test(line)) {
                              name = line;
                              break;
                            }
                          }
                        }
                        
                        return (
                          <div className="mb-4 text-gray-700">
                            {name && <div>{name}</div>}
                            {address && <div>{address}</div>}
                            {(city || state || zip) && (
                              <div>
                                {[city, state].filter(Boolean).join(', ')}
                                {zip && ` ${zip}`}
                              </div>
                            )}
                            {email && <div>{email}</div>}
                            {phone && <div>{phone}</div>}
                            {linkedin && <div>{linkedin}</div>}
                          </div>
                        );
                      })()}
                      
                      {/* Date - Always show */}
                      <div className="mb-4 text-gray-700">
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      
                      {/* Hiring Manager Address - Only show if we have company name */}
                      {job.company_name && (
                        <div className="mb-4 text-gray-700">
                          <div>Hiring Manager</div>
                          <div>{job.company_name}</div>
                          {job.location && <div>{job.location}</div>}
                        </div>
                      )}
                      
                      {/* Salutation */}
                      <div className="mb-4 text-gray-700">
                        Dear Hiring Manager,
                      </div>
                      
                      {/* Cover Letter Body */}
                      <div className="text-gray-700 whitespace-pre-wrap mb-4 text-justify">
                        {(() => {
                          const coverLetter = generatedResume.enhanced.cover_letter || 'Cover letter generated successfully';
                          
                          // Filter out any placeholder lines that AI might have included
                          const lines = coverLetter.split('\n');
                          const filteredLines = lines.filter((line: string) => {
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
                          
                          return filteredLines.join('\n').trim();
                        })()}
                      </div>
                      
                      {/* Signature */}
                      <div className="mt-4 text-gray-700">
                        <div>Sincerely,</div>
                        <div className="mt-1">
                          {(() => {
                            // Extract person's name (not filename)
                            const resume = generatedResume.original;
                            
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
                              // Continue to other methods
                            }
                            
                            // PRIORITY 1: Try to get name from full_text (first few lines)
                            if (resume.full_text) {
                              const lines = resume.full_text.split('\n');
                              for (let i = 0; i < Math.min(5, lines.length); i++) {
                                const line = lines[i].trim();
                                // Look for name pattern: "First Last" or "First M Last"
                                if (line.length > 0 && 
                                    line.length < 50 &&
                                    !line.includes('@') && 
                                    !line.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) &&
                                    !line.toLowerCase().includes('linkedin') &&
                                    !line.toLowerCase().includes('http') &&
                                    !line.toLowerCase().includes('resume') &&
                                    !line.toLowerCase().includes('.com') &&
                                    /^[A-Z][a-z]+(\s+[A-Z]\.?)?\s+[A-Z][a-z]+$/.test(line)) {
                                  return line;
                                }
                              }
                            }
                            
                            // PRIORITY 2: Try email-based extraction (with separators)
                            if (resume.email) {
                              const emailName = resume.email.split('@')[0];
                              const parts = emailName.split(/[._-]/);
                              if (parts.length >= 2) {
                                return parts
                                  .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                                  .join(' ');
                              }
                            }
                            
                            // PRIORITY 3: Better placeholder than filename
                            return 'Your Name';
                          })()}
                        </div>
                      </div>
                      
                      {/* Info message if missing data */}
                      {(!generatedResume.original.email && !generatedResume.original.phone && !generatedResume.original.name) && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                          💡 <strong>Tip:</strong> Add your contact info (email, phone) and name to your resume for a complete cover letter header.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              {!generatedResume ? (
                // Before Generation
                <>
                  <button
                    onClick={() => setShowMaterials(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateMaterials}
                    disabled={isGenerating}
                    className={`px-6 py-2 text-white rounded-lg transition-colors ${
                      isGenerating 
                        ? 'bg-purple-400 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {isGenerating ? '⏳ Generating...' : '✨ Generate Materials'}
                  </button>
                </>
              ) : (
                // After Generation
                <>
                  <button
                    onClick={() => setShowMaterials(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleDownloadResume}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    ⬇️ Download Resume
                  </button>
                  <button
                    onClick={handleDownloadCoverLetter}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    ⬇️ Download Cover Letter
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={() => setShowDetails(true)}
          className="text-sm text-gray-700 hover:text-gray-900 font-medium hover:underline"
        >
          📋 View Details
        </button>
        <a
          href={jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
        >
          View original posting →
        </a>
      </div>

      {/* Job Details Modal */}
      {showDetails && (
        <JobDetailsModal
          job={job}
          jobUrl={jobUrl}
          companyName={companyName}
          displayTitle={displayTitle}
          matchScore={matchScore}
          getMatchColor={getMatchColor}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
};

// Helper function to extract title from URL
function extractTitleFromUrl(url: string, platform?: string): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // LinkedIn: Try to get job ID and show a more descriptive title
    if (url.includes('linkedin.com') || platform === 'LinkedIn') {
      const jobId = url.match(/\/jobs\/view\/(\d+)/)?.[1];
      return jobId ? `LinkedIn Position #${jobId.slice(-6)}` : 'LinkedIn Job';
    }
    
    // Indeed: Check query params for job title
    if (url.includes('indeed.com') || platform === 'Indeed') {
      const title = urlObj.searchParams.get('q');
      if (title) return decodeURIComponent(title);
      const jobKey = urlObj.searchParams.get('jk');
      return jobKey ? `Indeed Position #${jobKey.slice(0, 8)}` : 'Indeed Job';
    }
    
    // Glassdoor: Extract from path
    if (url.includes('glassdoor.com') || platform === 'Glassdoor') {
      const pathMatch = urlObj.pathname.match(/\/job-listing\/([^\/]+)/);
      if (pathMatch) {
        return pathMatch[1].split('-').slice(0, -1).map(w => 
          w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' ');
      }
      return 'Glassdoor Job';
    }
    
    // Generic fallback
    return platform ? `${platform} Job` : 'Job Posting';
  } catch {
    return 'Job Posting';
  }
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm text-gray-500 mt-2">{change}</p>
    </div>
  );
};

interface JobDetailsModalProps {
  job: Job;
  jobUrl: string;
  companyName: string;
  displayTitle: string;
  matchScore?: MatchScoreBreakdown;
  getMatchColor: (score: number) => string;
  onClose: () => void;
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  jobUrl,
  companyName,
  displayTitle,
  matchScore,
  getMatchColor,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-primary-50 to-blue-50">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {displayTitle}
              </h2>
              {companyName && companyName !== 'Unknown Company' && (
                <p className="text-lg text-gray-700 mb-2">{companyName}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 border border-gray-200">
                  {job.platform}
                </span>
                {matchScore && (
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getMatchColor(matchScore.overall)}`}>
                    {matchScore.overall}% Match
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none ml-4"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {job.location && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Location</div>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <span>📍</span>
                    <span>{job.location}</span>
                  </div>
                </div>
              )}

              {job.location_type && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Work Type</div>
                  <div className="flex items-center gap-2 text-blue-900 font-medium">
                    <span>
                      {job.location_type === 'remote' && '🏠'}
                      {job.location_type === 'hybrid' && '🔄'}
                      {job.location_type === 'onsite' && '🏢'}
                    </span>
                    <span className="capitalize">{job.location_type}</span>
                  </div>
                </div>
              )}

              {(job as any).required_experience_years && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Experience Required</div>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <span>⏱️</span>
                    <span>{(job as any).required_experience_years}+ years</span>
                  </div>
                </div>
              )}

              {(job as any).education_level && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Education</div>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <span>🎓</span>
                    <span className="capitalize">{(job as any).education_level.replace('s', "'s")}</span>
                  </div>
                </div>
              )}

              {(job as any).posted_date && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Posted</div>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <span>📅</span>
                    <span>{new Date((job as any).posted_date).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Consolidated Salary, Benefits & Match Score Card */}
            {(matchScore || (job as any).salary_min || (job as any).benefits) && (
              <div className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Side: Salary & Benefits */}
                  <div className="space-y-4">
                    {/* Salary */}
                    {(job as any).salary_min && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-lg">
                          <span className="text-2xl">💰</span>
                          Salary Range
                        </h3>
                        <div className="text-2xl font-bold text-green-700">
                          {(job as any).salary_max 
                            ? `$${((job as any).salary_min).toLocaleString()} - $${((job as any).salary_max).toLocaleString()}`
                            : `$${((job as any).salary_min).toLocaleString()}+`
                          }
                          {(job as any).salary_period && (
                            <span className="text-lg text-gray-600 ml-2">
                              / {(job as any).salary_period === 'hourly' ? 'hour' : 'year'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Benefits */}
                    {(job as any).benefits && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <span className="text-xl">🎁</span>
                          Benefits
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const benefits = (job as any).benefits;
                            // Handle both string (comma-separated) and array formats
                            const benefitList = Array.isArray(benefits) 
                              ? benefits 
                              : typeof benefits === 'string' 
                                ? benefits.split(',') 
                                : [];
                            
                            return benefitList.map((benefit: string, index: number) => (
                              <span 
                                key={index}
                                className="px-3 py-1 bg-white text-green-700 rounded-full text-sm font-medium border border-green-200"
                              >
                                {typeof benefit === 'string' ? benefit.trim() : benefit}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Match Score Breakdown */}
                  {matchScore && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span>🎯</span>
                        Match Score Breakdown
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="text-sm text-gray-600 mb-1">Skills Match</div>
                          <div className="text-xl font-bold text-blue-700">{matchScore.skills}%</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="text-sm text-gray-600 mb-1">Experience</div>
                          <div className="text-xl font-bold text-blue-700">{matchScore.experience}%</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="text-sm text-gray-600 mb-1">Title Match</div>
                          <div className="text-xl font-bold text-blue-700">{matchScore.title}%</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-purple-200">
                          <div className="text-sm text-gray-600 mb-1">Overall</div>
                          <div className="text-xl font-bold text-purple-700">{matchScore.overall}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Job Description */}
            {job.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>📝</span>
                  Job Description
                </h3>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    {(() => {
                      const desc = job.description;
                      
                      // If description has line breaks, use them
                      if (desc.includes('\n')) {
                        return desc.split('\n').filter(line => line.trim()).map((line, index) => (
                          <p key={index} className="mb-2">{line}</p>
                        ));
                      }
                      
                      // Otherwise, intelligently break into sentences/sections
                      // Split on sentence boundaries followed by capital letters (likely new thoughts)
                      const sections = desc.split(/(?<=[.!?])\s+(?=[A-Z])/);
                      
                      // Group sentences into paragraphs (every 3-4 sentences)
                      const paragraphs: string[] = [];
                      let currentParagraph = '';
                      let sentenceCount = 0;
                      
                      sections.forEach((sentence, index) => {
                        currentParagraph += (currentParagraph ? ' ' : '') + sentence;
                        sentenceCount++;
                        
                        // Create paragraph after 3-4 sentences or if next sentence looks like a heading
                        const nextSentence = sections[index + 1];
                        const isNextHeading = nextSentence && (
                          nextSentence.endsWith(':') || 
                          nextSentence.length < 60 ||
                          nextSentence.match(/^(About|Why|What|Your|Requirements|Responsibilities)/i)
                        );
                        
                        if (sentenceCount >= 3 || isNextHeading || index === sections.length - 1) {
                          paragraphs.push(currentParagraph);
                          currentParagraph = '';
                          sentenceCount = 0;
                        }
                      });
                      
                      return paragraphs.map((para, index) => {
                        // Check if paragraph is a heading
                        const isHeading = para.endsWith(':') || 
                          (para.split(/[.!?]/).length === 1 && para.length < 100);
                        
                        if (isHeading) {
                          return (
                            <h4 key={index} className="font-semibold text-gray-900 mt-4 mb-2 text-base">
                              {para}
                            </h4>
                          );
                        }
                        
                        return (
                          <p key={index} className="mb-3 text-justify">
                            {para}
                          </p>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Required Skills */}
            {(job as any).required_skills && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>⚡</span>
                  Required Skills
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{(job as any).required_skills}</p>
                </div>
              </div>
            )}

            {/* Preferred Skills */}
            {(job as any).preferred_skills && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>✨</span>
                  Preferred Skills
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{(job as any).preferred_skills}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center gap-3">
          <a
            href={jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            🔗 View Original Posting
          </a>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
