import React, { useEffect, useState } from 'react';
import type { Job } from '@shared/types';

interface MatchScore {
  overall: number;
  skills: number;
  experience: number;
  title: number;
}

const Dashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matchScores, setMatchScores] = useState<Record<number, MatchScore>>({});
  const [stats, setStats] = useState({
    jobsDetected: 0,
    jobsThisWeek: 0,
    applications: 0,
    interviews: 0,
  });

  // Load jobs on mount
  useEffect(() => {
    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI not available - preload script may not have loaded');
      return;
    }

    loadJobs();

    // Listen for new jobs (only set up listener once)
    const handleJobAdded = (job: any) => {
      setJobs(prev => {
        // Avoid duplicates
        if (prev.some(j => j.id === job.id)) return prev;
        return [job, ...prev];
      });
      setStats(prev => ({
        ...prev,
        jobsDetected: prev.jobsDetected + 1,
        jobsThisWeek: prev.jobsThisWeek + 1,
      }));
    };
    
    window.electronAPI.jobs.onJobAdded(handleJobAdded);
  }, []); // Empty dependency array - only run once

  const loadJobs = async () => {
    if (!window.electronAPI) return;
    
    try {
      const allJobs = await window.electronAPI.jobs.getAll();
      setJobs(allJobs);
      
      // Load match scores
      try {
        const matches = await window.electronAPI.matches.getJobMatches();
        setMatchScores(matches || {});
      } catch (error) {
        console.error('Failed to load match scores:', error);
      }
      
      // Calculate stats
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentJobs = allJobs.filter(j => 
        new Date(j.detectedAt) > oneWeekAgo
      );

      setStats({
        jobsDetected: allJobs.length,
        jobsThisWeek: recentJobs.length,
        applications: allJobs.filter(j => j.status === 'applied').length,
        interviews: 0, // TODO: Track interviews
      });
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const handleSaveJob = async (jobId: number) => {
    if (!window.electronAPI) return;
    await window.electronAPI.jobs.updateStatus(jobId, 'saved');
    loadJobs();
  };

  const handleDismissJob = async (jobId: number) => {
    if (!window.electronAPI) return;
    await window.electronAPI.jobs.updateStatus(jobId, 'dismissed');
    loadJobs();
  };

  const handleMarkApplied = async (jobId: number) => {
    if (!window.electronAPI) return;
    await window.electronAPI.jobs.markApplied(jobId);
    loadJobs();
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs detected yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Copy a job URL from LinkedIn, Indeed, or any job platform to get started.
                The app will automatically detect it and show you how well it matches your resume.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> The app is now monitoring your clipboard. 
                  Just browse jobs normally and copy URLs - we'll automatically capture them!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.slice(0, 10).map(job => (
                <JobCard 
                  key={job.id} 
                  job={job}
                  matchScore={matchScores[job.id!]}
                  onSave={() => handleSaveJob(job.id!)}
                  onDismiss={() => handleDismissJob(job.id!)}
                  onMarkApplied={() => handleMarkApplied(job.id!)}
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
  matchScore?: MatchScore;
  onSave: () => void;
  onDismiss: () => void;
  onMarkApplied: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, matchScore, onSave, onDismiss, onMarkApplied }) => {
  const [showMaterials, setShowMaterials] = React.useState(false);
  const [materials, setMaterials] = React.useState<any>(null);

  const loadMaterials = async () => {
    if (!window.electronAPI || !job.id) return;
    const mats = await window.electronAPI.applications.getMaterials(job.id);
    setMaterials(mats);
    setShowMaterials(true);
  };

  const handleRegenerateMaterials = async () => {
    if (!window.electronAPI || !job.id) return;
    const success = await window.electronAPI.applications.regenerateMaterials(job.id);
    if (success) {
      // Reload materials if modal is open
      if (showMaterials) {
        const mats = await window.electronAPI.applications.getMaterials(job.id);
        setMaterials(mats);
      }
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

  // Database uses job_url and company_name, not url and company
  const jobUrl = (job as any).job_url || job.url;
  const companyName = (job as any).company_name || job.company;
  const jobTitle = job.title && job.title !== 'Untitled Position' ? job.title : null;
  const isSaved = (job as any).is_saved === 1;
  const isArchived = (job as any).is_archived === 1;
  const detectedAt = (job as any).detected_at || job.detectedAt;

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
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-500">{job.platform}</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-500">{timeAgo(detectedAt)}</span>
            {matchScore && (
              <>
                <span className="text-gray-300">•</span>
                <div className={`px-2 py-1 rounded-md border text-xs font-semibold ${getMatchColor(matchScore.overall)}`}>
                  {matchScore.overall}% Match
                </div>
              </>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {displayTitle}
          </h3>
          
          {companyName && companyName !== 'Unknown Company' && (
            <p className="text-gray-600 mb-2">{companyName}</p>
          )}
          
          {job.location && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
              <span>📍</span>
              <span>{job.location}</span>
            </div>
          )}

          {job.salary && (
            <div className="flex items-center gap-1 text-sm text-green-600 mb-2">
              <span>💰</span>
              <span>{job.salary}</span>
            </div>
          )}

          {job.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-2">
              {job.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-4">
          {!isSaved && !isArchived && (
            <>
              <button
                onClick={onSave}
                className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
              >
                💾 Save
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            </>
          )}
          {isSaved && !isArchived && (
            <>
              <span className="px-4 py-2 bg-green-100 text-green-700 text-sm rounded-lg font-medium text-center">
                ✓ Saved
              </span>
              <button
                onClick={onMarkApplied}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                ✉️ Mark Applied
              </button>
              <button
                onClick={handleRegenerateMaterials}
                className="px-3 py-2 border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-50 transition-colors whitespace-nowrap"
              >
                🔄 Regenerate
              </button>
              <button
                onClick={loadMaterials}
                className="px-3 py-2 border border-blue-300 text-blue-700 text-sm rounded-lg hover:bg-blue-50 transition-colors"
              >
                📄 View Materials
              </button>
            </>
          )}
          {isArchived && (
            <span className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg font-medium">
              Dismissed
            </span>
          )}
        </div>
      </div>

      {/* Materials Modal */}
      {showMaterials && materials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">Application Materials</h2>
              <button
                onClick={() => setShowMaterials(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                {/* Tailored Resume */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    📄 Tailored Resume
                    {materials.status === 'applied' && (
                      <span className="text-sm text-green-600 font-normal">(Applied)</span>
                    )}
                  </h3>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-mono border">
                    {materials.tailored_resume}
                  </pre>
                </div>

                {/* Cover Letter */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">✉️ Cover Letter</h3>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-serif border">
                    {materials.cover_letter}
                  </pre>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={async () => {
                  try {
                    await window.electronAPI.applications.downloadResume(job.id);
                  } catch (error) {
                    console.error('Failed to download resume:', error);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ⬇️ Download Resume
              </button>
              <button
                onClick={async () => {
                  try {
                    await window.electronAPI.applications.downloadCoverLetter(job.id);
                  } catch (error) {
                    console.error('Failed to download cover letter:', error);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ⬇️ Download Cover Letter
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(materials.tailored_resume)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
              >
                Copy Resume
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(materials.cover_letter)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
              >
                Copy Cover Letter
              </button>
              <button
                onClick={() => setShowMaterials(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <a
          href={jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
        >
          View original posting →
        </a>
      </div>
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

export default Dashboard;
