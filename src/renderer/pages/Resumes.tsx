import React, { useState, useEffect, useCallback } from 'react';
import { resumesAPI, type Resume } from '../../services/database';
import { parsePDFResume } from '../../services/pdfParser';
import { parseDOCXResume } from '../../services/docxParser';

export default function Resumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Load resumes from database
  const loadResumes = useCallback(async () => {
    try {
      const result = await resumesAPI.getAll();
      setResumes(result);
    } catch (error) {
      console.error('Failed to load resumes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      alert('Please upload a PDF, DOCX, DOC, or TXT file');
      return;
    }

    setUploading(true);

    try {
      // Convert file to base64 for storage
      const arrayBuffer = await file.arrayBuffer();
      const base64File = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      let resumeData: Omit<Resume, 'id' | 'created_at'>;
      
      // Parse based on file type
      if (fileExt === '.pdf') {
        const parsed = await parsePDFResume(file);
        resumeData = {
          name: file.name,
          full_text: parsed.fullText,
          is_primary: resumes.length === 0,
          original_file: base64File,
          file_type: 'pdf',
          sections: parsed.sections,
          work_experiences: parsed.workExperiences,
          hard_skills: parsed.skills.join(', '),
          email: parsed.email,
          phone: parsed.phone,
          linkedin: parsed.linkedin,
          website: parsed.website
        };
      } else if (fileExt === '.docx' || fileExt === '.doc') {
        const parsed = await parseDOCXResume(file);
        resumeData = {
          name: file.name,
          full_text: parsed.fullText,
          is_primary: resumes.length === 0,
          original_file: base64File,
          file_type: 'docx',
          sections: parsed.sections,
          work_experiences: parsed.workExperiences,
          hard_skills: parsed.skills.join(', '),
          email: parsed.email,
          phone: parsed.phone,
          linkedin: parsed.linkedin,
          website: parsed.website
        };
      } else {
        // Text file
        const fullText = await file.text();
        resumeData = {
          name: file.name,
          full_text: fullText,
          is_primary: resumes.length === 0,
          original_file: base64File,
          file_type: 'txt'
        };
      }

      await resumesAPI.add(resumeData);
      await loadResumes();
      
      alert(`Resume uploaded and parsed successfully! ${resumeData.work_experiences?.length || 0} work experiences and ${resumeData.hard_skills?.split(',').length || 0} skills detected.`);
    } catch (error) {
      console.error('Failed to upload resume:', error);
      alert(`Failed to upload resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Set primary resume
  const setPrimaryResume = async (resumeId: number | undefined) => {
    if (!resumeId) return;
    
    try {
      await resumesAPI.update(resumeId, { is_primary: true });
      await loadResumes();
    } catch (error) {
      console.error('Failed to set primary resume:', error);
    }
  };

  // Delete resume
  const deleteResume = async (resumeId: number | undefined) => {
    if (!resumeId) return;
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      await resumesAPI.delete(resumeId);
      await loadResumes();
    } catch (error) {
      console.error('Failed to delete resume:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading resumes...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Resumes</h1>
        <p className="text-gray-600">
          Upload your resume to automatically calculate match scores for job postings
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center mb-8 transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-gray-600 mb-4">
          <p className="text-lg font-medium mb-1">
            {uploading ? 'Uploading...' : 'Drop your resume here'}
          </p>
          <p className="text-sm">
            or{' '}
            <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
              browse files
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleChange}
                disabled={uploading}
              />
            </label>
          </p>
        </div>
        <p className="text-sm text-gray-500">
          Supports PDF, DOCX, DOC, and TXT files
        </p>
      </div>

      {/* Resume List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Your Resumes ({resumes.length})
        </h2>

        {resumes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No resumes uploaded yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Upload your first resume to start matching with jobs
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow ${
                  resume.is_primary ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {resume.name}
                      </h3>
                      {resume.is_primary && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Primary
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      {resume.current_title && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Title:</span>
                          <span>{resume.current_title}</span>
                        </div>
                      )}
                      {resume.years_of_experience !== null && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Experience:</span>
                          <span>{resume.years_of_experience} years</span>
                        </div>
                      )}
                    </div>

                    {resume.hard_skills && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {resume.hard_skills.split(',').slice(0, 8).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {skill.trim()}
                            </span>
                          ))}
                          {resume.hard_skills.split(',').length > 8 && (
                            <span className="px-2 py-1 text-xs text-gray-500">
                              +{resume.hard_skills.split(',').length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Uploaded {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {!resume.is_primary && (
                      <button
                        onClick={() => setPrimaryResume(resume.id)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Set as Primary
                      </button>
                    )}
                    <button
                      onClick={() => deleteResume(resume.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      {resumes.length > 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            💡 How Resume Matching Works
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Jobs are automatically matched against your primary resume</li>
            <li>• Match scores are calculated based on skills, experience, and job requirements</li>
            <li>• Higher scores mean better alignment with your background</li>
            <li>• Upload an updated resume anytime to recalculate all match scores</li>
          </ul>
        </div>
      )}
    </div>
  );
}
