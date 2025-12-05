import React, { useEffect, useState } from 'react';

interface Application {
  id: number;
  job_id: number;
  resume_id: number;
  status: 'draft' | 'applied' | 'interviewing' | 'offer' | 'rejected';
  applied_date: string;
  updated_at: string;
  resume_version_snapshot: string;
  cover_letter_text: string;
  notes?: string;
  // Job details from join
  job_title?: string;
  company_name?: string;
  job_url?: string;
  platform?: string;
}

const Applications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    if (!window.electronAPI) return;
    
    try {
      setLoading(true);
      const apps = await window.electronAPI.applications.getAll();
      setApplications(apps);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId: number, newStatus: string) => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI.applications.updateStatus(appId, newStatus);
      await loadApplications();
    } catch (error) {
      console.error('Failed to update application status:', error);
    }
  };

  const handleAddNote = async (appId: number, note: string) => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI.applications.addNote(appId, note);
      await loadApplications();
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const statusCounts = {
    all: applications.length,
    draft: applications.filter(a => a.status === 'draft').length,
    applied: applications.filter(a => a.status === 'applied').length,
    interviewing: applications.filter(a => a.status === 'interviewing').length,
    offer: applications.filter(a => a.status === 'offer').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'applied':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'interviewing':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'offer':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-2">
            Track your job applications and their progress
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <FilterPill
            label="All"
            count={statusCounts.all}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterPill
            label="Draft"
            count={statusCounts.draft}
            active={filter === 'draft'}
            onClick={() => setFilter('draft')}
            color="gray"
          />
          <FilterPill
            label="Applied"
            count={statusCounts.applied}
            active={filter === 'applied'}
            onClick={() => setFilter('applied')}
            color="blue"
          />
          <FilterPill
            label="Interviewing"
            count={statusCounts.interviewing}
            active={filter === 'interviewing'}
            onClick={() => setFilter('interviewing')}
            color="purple"
          />
          <FilterPill
            label="Offer"
            count={statusCounts.offer}
            active={filter === 'offer'}
            onClick={() => setFilter('offer')}
            color="green"
          />
          <FilterPill
            label="Rejected"
            count={statusCounts.rejected}
            active={filter === 'rejected'}
            onClick={() => setFilter('rejected')}
            color="red"
          />
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📮</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {filter !== 'all' ? filter : ''} applications yet
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {filter === 'all'
                  ? 'Save jobs from the Dashboard and mark them as applied to track them here.'
                  : `You don't have any applications with the "${filter}" status yet.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredApplications.map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onStatusChange={handleUpdateStatus}
                  onViewDetails={setSelectedApp}
                  getStatusColor={getStatusColor}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedApp && (
        <ApplicationDetailsModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChange={handleUpdateStatus}
          onAddNote={handleAddNote}
          getStatusColor={getStatusColor}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

interface FilterPillProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, count, active, onClick, color = 'primary' }) => {
  const colorClasses = {
    primary: active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    gray: active ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    purple: active ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    green: active ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200',
    red: active ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        colorClasses[color as keyof typeof colorClasses] || colorClasses.primary
      }`}
    >
      {label} <span className="ml-1">({count})</span>
    </button>
  );
};

interface ApplicationCardProps {
  application: Application;
  onStatusChange: (id: number, status: string) => void;
  onViewDetails: (app: Application) => void;
  getStatusColor: (status: string) => string;
  formatDate: (date: string) => string;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onStatusChange,
  onViewDetails,
  getStatusColor,
  formatDate,
}) => {
  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {application.job_title || 'Untitled Position'}
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(application.status)}`}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </span>
          </div>

          {application.company_name && (
            <p className="text-gray-600 mb-2">{application.company_name}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            {application.platform && (
              <span className="flex items-center gap-1">
                <span>🌐</span>
                {application.platform}
              </span>
            )}
            {application.applied_date && (
              <span className="flex items-center gap-1">
                <span>📅</span>
                Applied {formatDate(application.applied_date)}
              </span>
            )}
          </div>

          {application.notes && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-gray-700">{application.notes}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <select
            value={application.status}
            onChange={(e) => onStatusChange(application.id, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="draft">Draft</option>
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={() => onViewDetails(application)}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-white transition-colors"
          >
            View Details
          </button>

          {application.job_url && (
            <a
              href={application.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-white transition-colors text-center"
            >
              View Job
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

interface ApplicationDetailsModalProps {
  application: Application;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onAddNote: (id: number, note: string) => void;
  getStatusColor: (status: string) => string;
  formatDate: (date: string) => string;
}

const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
  application,
  onClose,
  onStatusChange,
  onAddNote,
  getStatusColor,
  formatDate,
}) => {
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const handleSaveNote = () => {
    if (noteText.trim()) {
      const timestamp = new Date().toISOString();
      const newNote = application.notes
        ? `${application.notes}\n\n[${formatDate(timestamp)}] ${noteText}`
        : `[${formatDate(timestamp)}] ${noteText}`;
      onAddNote(application.id, newNote);
      setNoteText('');
      setShowNoteInput(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {application.job_title || 'Untitled Position'}
            </h2>
            {application.company_name && (
              <p className="text-gray-600 mb-2">{application.company_name}</p>
            )}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(application.status)}`}>
                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
              </span>
              {application.applied_date && (
                <span className="text-sm text-gray-500">
                  Applied {formatDate(application.applied_date)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Status Update */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Status
              </label>
              <select
                value={application.status}
                onChange={(e) => {
                  onStatusChange(application.id, e.target.value);
                  onClose();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="draft">Draft</option>
                <option value="applied">Applied</option>
                <option value="interviewing">Interviewing</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Notes & Timeline
                </label>
                <button
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {showNoteInput ? 'Cancel' : '+ Add Note'}
                </button>
              </div>

              {showNoteInput && (
                <div className="mb-4">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note about this application..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                    rows={3}
                  />
                  <button
                    onClick={handleSaveNote}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Save Note
                  </button>
                </div>
              )}

              {application.notes ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {application.notes}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No notes yet</p>
              )}
            </div>

            {/* Tailored Resume */}
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                📄 Tailored Resume
              </h3>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-mono border max-h-96 overflow-y-auto">
                {application.resume_version_snapshot}
              </pre>
            </div>

            {/* Cover Letter */}
            <div>
              <h3 className="text-lg font-semibold mb-2">✉️ Cover Letter</h3>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-serif border max-h-96 overflow-y-auto">
                {application.cover_letter_text}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={async () => {
              try {
                await window.electronAPI.applications.downloadResume(application.job_id);
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
                await window.electronAPI.applications.downloadCoverLetter(application.job_id);
              } catch (error) {
                console.error('Failed to download cover letter:', error);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ⬇️ Download Cover Letter
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(application.resume_version_snapshot)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
          >
            Copy Resume
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(application.cover_letter_text)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
          >
            Copy Cover Letter
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Applications;
