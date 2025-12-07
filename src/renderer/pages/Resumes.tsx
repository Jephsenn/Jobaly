import React, { useState, useEffect, useCallback } from 'react';
import { resumesAPI, type Resume } from '../../services/database';
import { parsePDFResume } from '../../services/pdfParser';
import { parseDOCXResume } from '../../services/docxParser';

export default function Resumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ step: '', percent: 0 });
  const [uploadSuccess, setUploadSuccess] = useState<{
    fileName: string;
    experiencesCount: number;
    bulletsCount: number;
    skillsCount: number;
    educationCount: number;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [editingResume, setEditingResume] = useState<Resume | null>(null);

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
    setUploadProgress({ step: 'Reading file...', percent: 10 });

    try {
      // Convert file to base64 for storage
      const arrayBuffer = await file.arrayBuffer();
      setUploadProgress({ step: 'Encoding file...', percent: 20 });
      
      const base64File = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      setUploadProgress({ step: 'Parsing resume content...', percent: 30 });
      
      let resumeData: Omit<Resume, 'id' | 'created_at'>;
      
      // Parse based on file type
      if (fileExt === '.pdf') {
        setUploadProgress({ step: 'Extracting text from PDF...', percent: 40 });
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
          website: parsed.website,
          // Set current title from most recent work experience
          current_title: parsed.workExperiences.length > 0 ? parsed.workExperiences[0].title : undefined
        };
      } else if (fileExt === '.docx' || fileExt === '.doc') {
        setUploadProgress({ step: 'Extracting text from DOCX...', percent: 40 });
        const parsed = await parseDOCXResume(file);
        
        setUploadProgress({ step: 'Parsing work experiences...', percent: 60 });
        
        let workExperiences = parsed.workExperiences;
        
        // Log what we found
        if (workExperiences.length > 0) {
          console.log(`✅ Parsed ${workExperiences.length} work experience(s)`);
          const totalBullets = workExperiences.reduce((sum, exp) => sum + (exp.bulletPoints?.length || 0), 0);
          console.log(`📝 Total bullet points: ${totalBullets}`);
        } else {
          console.warn('⚠️ No work experiences found in resume');
        }
        
        setUploadProgress({ step: 'Extracting education and skills...', percent: 80 });
        
        // Format education entries into a readable string (for backward compatibility)
        const educationText = parsed.education.map(edu => {
          const parts = [];
          if (edu.degree) parts.push(edu.degree);
          if (edu.field) parts.push(`in ${edu.field}`);
          if (edu.school) parts.push(`from ${edu.school}`);
          if (edu.graduationDate) parts.push(`(${edu.graduationDate})`);
          if (edu.gpa) parts.push(`GPA: ${edu.gpa}`);
          return parts.join(' ');
        }).join('\n');
        
        resumeData = {
          name: file.name,
          full_text: parsed.fullText,
          is_primary: resumes.length === 0,
          original_file: base64File,
          file_type: 'docx',
          sections: parsed.sections,
          work_experiences: workExperiences,
          education_entries: parsed.education,
          hard_skills: parsed.skills.join(', '),
          education: educationText || undefined,
          email: parsed.email,
          phone: parsed.phone,
          linkedin: parsed.linkedin,
          website: parsed.website,
          // Set current title from most recent work experience
          current_title: workExperiences.length > 0 ? workExperiences[0].title : undefined
        };
      } else {
        // Text file
        setUploadProgress({ step: 'Reading text file...', percent: 50 });
        const fullText = await file.text();
        resumeData = {
          name: file.name,
          full_text: fullText,
          is_primary: resumes.length === 0,
          original_file: base64File,
          file_type: 'txt'
        };
      }

      setUploadProgress({ step: 'Saving resume to database...', percent: 90 });
      await resumesAPI.add(resumeData);
      
      setUploadProgress({ step: 'Finalizing...', percent: 95 });
      await loadResumes();
      
      setUploadProgress({ step: 'Complete!', percent: 100 });
      
      // Small delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Calculate stats for success modal
      const experiencesCount = resumeData.work_experiences?.length || 0;
      const bulletsCount = resumeData.work_experiences?.reduce((sum, exp) => sum + (exp.bulletPoints?.length || 0), 0) || 0;
      const skillsCount = resumeData.hard_skills?.split(',').filter(s => s.trim()).length || 0;
      const educationCount = resumeData.education_entries?.length || 0;
      
      // Show success modal
      setUploadSuccess({
        fileName: file.name,
        experiencesCount,
        bulletsCount,
        skillsCount,
        educationCount
      });
    } catch (error) {
      console.error('Failed to upload resume:', error);
      alert(`Failed to upload resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress({ step: '', percent: 0 });
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

                    {/* Primary Resume: Show detailed info */}
                    {resume.is_primary ? (
                      <>
                        {/* Skills - Show first */}
                        {resume.hard_skills && (
                          {resume.hard_skills && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">🎯 Skills:</p>
                            <div className="flex flex-wrap gap-1">
                              {resume.hard_skills.split(',').map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200"
                                >
                                  {skill.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                          )}

                        {/* Work Experience - Show job titles */}
                        {resume.work_experiences && resume.work_experiences.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">💼 Experience:</p>
                            <div className="space-y-1">
                              {resume.work_experiences.map((exp, idx) => (
                                <div key={idx} className="text-sm text-gray-600">
                                  <span className="font-medium">{exp.title}</span>
                                  {exp.company && <span className="text-gray-500"> at {exp.company}</span>}
                                  {exp.startDate && (
                                    <span className="text-gray-400 text-xs ml-2">
                                      ({exp.startDate} - {exp.current ? 'Present' : exp.endDate || 'N/A'})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Education */}
                        {((resume.education_entries && resume.education_entries.length > 0) || resume.education) && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">🎓 Education:</p>
                            {resume.education_entries && resume.education_entries.length > 0 ? (
                              <div className="space-y-1">
                                {resume.education_entries.map((edu, idx) => (
                                  <div key={idx} className="text-sm text-gray-600">
                                    <span className="font-medium">{edu.degree}</span>
                                    {edu.field && <span> in {edu.field}</span>}
                                    {edu.school && <span> - {edu.school}</span>}
                                    {edu.graduationDate && <span className="text-gray-500"> ({edu.graduationDate})</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">
                                {resume.education}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Skills - Moved to top, this block can be removed */}
                        {false && resume.hard_skills && (
                          <div className="mb-2">
                            <p className="text-sm font-medium text-gray-700 mb-2">� Skills:</p>
                            <div className="flex flex-wrap gap-1">
                              {resume.hard_skills.split(',').map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200"
                                >
                                  {skill.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Non-Primary Resume: Show only skills */
                      <>
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
                      </>
                    )}

                    <p className="text-xs text-gray-500">
                      Uploaded {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingResume(resume)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      ✏️ Edit
                    </button>
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

      {/* Upload Progress Modal */}
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Uploading Resume</h3>
              <p className="text-sm text-gray-600">{uploadProgress.step}</p>
            </div>
            
            {/* Progress Bar */}
            <div className="relative">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out relative"
                  style={{ width: `${uploadProgress.percent}%` }}
                >
                  <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs font-medium text-gray-600">
                <span>0%</span>
                <span className="text-blue-600">{uploadProgress.percent}%</span>
                <span>100%</span>
              </div>
            </div>
            
            {/* Loading Animation */}
            <div className="flex justify-center mt-6 space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Success Modal */}
      {uploadSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Resume Uploaded Successfully!</h3>
              <p className="text-sm text-gray-600 mb-4">{uploadSuccess.fileName}</p>
            </div>

            {/* Stats */}
            <div className="space-y-3 mb-6">
              {uploadSuccess.experiencesCount > 0 ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📋</span>
                      <span className="text-sm font-medium text-gray-700">Work Experiences</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{uploadSuccess.experiencesCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">•</span>
                      <span className="text-sm font-medium text-gray-700">Bullet Points</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">{uploadSuccess.bulletsCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎯</span>
                      <span className="text-sm font-medium text-gray-700">Skills Detected</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{uploadSuccess.skillsCount}</span>
                  </div>
                  {uploadSuccess.educationCount > 0 && (
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🎓</span>
                        <span className="text-sm font-medium text-gray-700">Education Entries</span>
                      </div>
                      <span className="text-lg font-bold text-indigo-600">{uploadSuccess.educationCount}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">No work experiences detected</p>
                      <p className="text-xs text-yellow-700">You can add them manually by clicking "Edit" on your resume.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info message */}
            {uploadSuccess.experiencesCount > 0 && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  💡 You can edit these details anytime by clicking the "Edit" button on your resume card.
                </p>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={() => setUploadSuccess(null)}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Edit Resume Modal */}
      {editingResume && (
        <ResumeEditModal
          resume={editingResume}
          onClose={() => setEditingResume(null)}
          onSave={async (updated) => {
            await resumesAPI.update(updated.id!, updated);
            await loadResumes();
            setEditingResume(null);
          }}
        />
      )}
    </div>
  );
}

// Resume Edit Modal Component
interface ResumeEditModalProps {
  resume: Resume;
  onClose: () => void;
  onSave: (resume: Resume) => Promise<void>;
}

function ResumeEditModal({ resume, onClose, onSave }: ResumeEditModalProps) {
  // Initialize education_entries if it doesn't exist but legacy education field does
  const initialResume = {
    ...resume,
    education_entries: resume.education_entries || []
  };
  
  const [editedResume, setEditedResume] = useState<Resume>(initialResume);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sync legacy education field with structured entries for backward compatibility
      const educationText = (editedResume.education_entries || []).map(edu => {
        const parts = [];
        if (edu.degree) parts.push(edu.degree);
        if (edu.field) parts.push(`in ${edu.field}`);
        if (edu.school) parts.push(`from ${edu.school}`);
        if (edu.graduationDate) parts.push(`(${edu.graduationDate})`);
        if (edu.gpa) parts.push(`GPA: ${edu.gpa}`);
        return parts.join(' ');
      }).join('\n');
      
      const updatedResume = {
        ...editedResume,
        education: educationText || undefined
      };
      
      await onSave(updatedResume);
    } catch (error) {
      console.error('Failed to save resume:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const addExperience = () => {
    const newExp = {
      company: '',
      title: '',
      startDate: '',
      endDate: '',
      current: false,
      location: '',
      bulletPoints: ['']
    };
    setEditedResume({
      ...editedResume,
      work_experiences: [...(editedResume.work_experiences || []), newExp]
    });
  };

  const updateExperience = (index: number, field: string, value: any) => {
    const updated = [...(editedResume.work_experiences || [])];
    updated[index] = { ...updated[index], [field]: value };
    setEditedResume({ ...editedResume, work_experiences: updated });
  };

  const deleteExperience = (index: number) => {
    const updated = [...(editedResume.work_experiences || [])];
    updated.splice(index, 1);
    setEditedResume({ ...editedResume, work_experiences: updated });
  };

  const addBullet = (expIndex: number) => {
    const updated = [...(editedResume.work_experiences || [])];
    updated[expIndex].bulletPoints = [...(updated[expIndex].bulletPoints || []), ''];
    setEditedResume({ ...editedResume, work_experiences: updated });
  };

  const updateBullet = (expIndex: number, bulletIndex: number, value: string) => {
    const updated = [...(editedResume.work_experiences || [])];
    updated[expIndex].bulletPoints[bulletIndex] = value;
    setEditedResume({ ...editedResume, work_experiences: updated });
  };

  const deleteBullet = (expIndex: number, bulletIndex: number) => {
    const updated = [...(editedResume.work_experiences || [])];
    updated[expIndex].bulletPoints.splice(bulletIndex, 1);
    setEditedResume({ ...editedResume, work_experiences: updated });
  };

  const addEducation = () => {
    const newEdu = {
      school: '',
      degree: '',
      field: '',
      graduationDate: '',
      gpa: '',
      location: ''
    };
    setEditedResume({
      ...editedResume,
      education_entries: [...(editedResume.education_entries || []), newEdu]
    });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updated = [...(editedResume.education_entries || [])];
    updated[index] = { ...updated[index], [field]: value };
    setEditedResume({ ...editedResume, education_entries: updated });
  };

  const deleteEducation = (index: number) => {
    const updated = [...(editedResume.education_entries || [])];
    updated.splice(index, 1);
    setEditedResume({ ...editedResume, education_entries: updated });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Resume</h2>
          <p className="text-sm text-gray-600 mt-1">{resume.name}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editedResume.email || ''}
                    onChange={(e) => setEditedResume({ ...editedResume, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editedResume.phone || ''}
                    onChange={(e) => setEditedResume({ ...editedResume, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                  <input
                    type="url"
                    value={editedResume.linkedin || ''}
                    onChange={(e) => setEditedResume({ ...editedResume, linkedin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website / Portfolio</label>
                  <input
                    type="url"
                    value={editedResume.website || ''}
                    onChange={(e) => setEditedResume({ ...editedResume, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills</h3>
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hard Skills / Technical Skills</label>
                  <textarea
                    value={editedResume.hard_skills || ''}
                    onChange={(e) => setEditedResume({ ...editedResume, hard_skills: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="JavaScript, Python, React, SQL, Machine Learning, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of technical skills</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soft Skills</label>
                  <textarea
                    value={editedResume.soft_skills || ''}
                    onChange={(e) => setEditedResume({ ...editedResume, soft_skills: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                    placeholder="Leadership, Communication, Problem Solving, Team Collaboration, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of soft skills</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tools & Technologies</label>
                  <textarea
                    value={editedResume.tools_technologies || ''}
                    onChange={(e) => setEditedResume({ ...editedResume, tools_technologies: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                    placeholder="Git, Docker, AWS, Jenkins, Jira, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of tools and technologies</p>
                </div>
              </div>
            </div>

            {/* Education */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Education</h3>
                <button
                  onClick={addEducation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  + Add Education
                </button>
              </div>

              {!editedResume.education_entries || editedResume.education_entries.length === 0 ? (
                <div className="p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                  <p className="text-gray-500 mb-2">No education entries yet</p>
                  <button
                    onClick={addEducation}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Add your first education entry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {editedResume.education_entries.map((edu, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Education {index + 1}</h4>
                        <button
                          onClick={() => deleteEducation(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* School Name */}
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            School/University <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={edu.school || ''}
                            onChange={(e) => updateEducation(index, 'school', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., Montclair State University"
                          />
                        </div>

                        {/* Degree Level */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Degree Level <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={edu.degree || ''}
                            onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Select degree...</option>
                            <option value="High School Diploma">High School Diploma</option>
                            <option value="Associate's Degree">Associate's Degree</option>
                            <option value="Bachelor's Degree">Bachelor's Degree</option>
                            <option value="Bachelor of Science">Bachelor of Science (B.S.)</option>
                            <option value="Bachelor of Arts">Bachelor of Arts (B.A.)</option>
                            <option value="Master's Degree">Master's Degree</option>
                            <option value="Master of Science">Master of Science (M.S.)</option>
                            <option value="Master of Arts">Master of Arts (M.A.)</option>
                            <option value="MBA">MBA</option>
                            <option value="Doctorate">Doctorate (Ph.D.)</option>
                            <option value="Professional Degree">Professional Degree (J.D., M.D., etc.)</option>
                            <option value="Certificate">Certificate</option>
                            <option value="Bootcamp">Bootcamp</option>
                          </select>
                        </div>

                        {/* Field of Study */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field of Study
                          </label>
                          <input
                            type="text"
                            value={edu.field || ''}
                            onChange={(e) => updateEducation(index, 'field', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., Computer Science"
                          />
                        </div>

                        {/* Graduation Date */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Graduation Date
                          </label>
                          <input
                            type="text"
                            value={edu.graduationDate || ''}
                            onChange={(e) => updateEducation(index, 'graduationDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., May 2023 or 2023"
                          />
                        </div>

                        {/* GPA */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            GPA (Optional)
                          </label>
                          <input
                            type="text"
                            value={edu.gpa || ''}
                            onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., 3.8 or 3.8/4.0"
                          />
                        </div>

                        {/* Location */}
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location (Optional)
                          </label>
                          <input
                            type="text"
                            value={edu.location || ''}
                            onChange={(e) => updateEducation(index, 'location', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., Montclair, NJ"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certifications */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <textarea
                  value={editedResume.certifications || ''}
                  onChange={(e) => setEditedResume({ ...editedResume, certifications: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="AWS Certified Solutions Architect, 2023&#10;PMP Certification, 2022"
                />
                <p className="text-xs text-gray-500 mt-1">List your certifications with year obtained</p>
              </div>
            </div>

            {/* Work Experiences */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Work Experience</h3>
                <button
                  onClick={addExperience}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  + Add Experience
                </button>
              </div>

              {!editedResume.work_experiences || editedResume.work_experiences.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-600 mb-2">No work experiences yet</p>
                  <p className="text-sm text-gray-500">Click "Add Experience" to get started</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {editedResume.work_experiences.map((exp, expIndex) => (
                    <div key={expIndex} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => updateExperience(expIndex, 'company', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Company Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                          <input
                            type="text"
                            value={exp.title}
                            onChange={(e) => updateExperience(expIndex, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Job Title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                          <input
                            type="text"
                            value={exp.startDate || ''}
                            onChange={(e) => updateExperience(expIndex, 'startDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="January 2020"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={exp.endDate || ''}
                              onChange={(e) => updateExperience(expIndex, 'endDate', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Present"
                              disabled={exp.current}
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={exp.current}
                                onChange={(e) => {
                                  updateExperience(expIndex, 'current', e.target.checked);
                                  if (e.target.checked) {
                                    updateExperience(expIndex, 'endDate', 'Present');
                                  }
                                }}
                                className="rounded"
                              />
                              Current
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                        <input
                          type="text"
                          value={exp.location || ''}
                          onChange={(e) => updateExperience(expIndex, 'location', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="City, State"
                        />
                      </div>

                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Bullet Points</label>
                          <button
                            onClick={() => addBullet(expIndex)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            + Add Bullet
                          </button>
                        </div>
                        <div className="space-y-2">
                          {exp.bulletPoints?.map((bullet, bulletIndex) => (
                            <div key={bulletIndex} className="flex gap-2">
                              <textarea
                                value={bullet}
                                onChange={(e) => updateBullet(expIndex, bulletIndex, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                rows={2}
                                placeholder="Describe your responsibility or achievement..."
                              />
                              <button
                                onClick={() => deleteBullet(expIndex, bulletIndex)}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteExperience(expIndex)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        🗑️ Delete Experience
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
