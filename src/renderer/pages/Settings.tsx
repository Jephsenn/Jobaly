import React, { useState, useEffect } from 'react';
import { getMatchScoreSettings, saveMatchScoreSettings, type MatchScoreSettings } from '../../services/matchScoreCalculator';
import { dataAPI } from '../../services/database';

interface UserSettings {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    phone: ''
  });
  const [matchSettings, setMatchSettings] = useState<MatchScoreSettings>(getMatchScoreSettings());
  const [desiredTitlesInput, setDesiredTitlesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = localStorage.getItem('jobaly_user_settings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
      
      const matchScoreSettings = getMatchScoreSettings();
      setMatchSettings(matchScoreSettings);
      setDesiredTitlesInput(matchScoreSettings.desiredJobTitles.join(', '));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // Parse desired job titles
      const titlesArray = desiredTitlesInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      const updatedMatchSettings = {
        ...matchSettings,
        desiredJobTitles: titlesArray
      };
      
      localStorage.setItem('jobaly_user_settings', JSON.stringify(settings));
      saveMatchScoreSettings(updatedMatchSettings);
      setMatchSettings(updatedMatchSettings);
      
      setMessage('✅ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Failed to save settings');
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      await dataAPI.exportAll();
      setMessage('✅ Data exported successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleImportData = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          const data = JSON.parse(text);
          await dataAPI.importData(data);
          setMessage('✅ Data imported successfully!');
          setTimeout(() => setMessage(''), 3000);
        }
      };
      input.click();
    } catch (error) {
      setMessage('❌ Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
      
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Job Matching Preferences Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">🎯 Job Matching Preferences</h2>
        <p className="text-gray-600 mb-6">
          Configure your job search preferences to improve match scores and AI-tailored resumes.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desired Job Titles
            </label>
            <input
              type="text"
              value={desiredTitlesInput}
              onChange={(e) => setDesiredTitlesInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Software Engineer, Full Stack Developer, Frontend Engineer"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter comma-separated job titles you're targeting. This helps calculate better match scores and tailor your resume more effectively.
            </p>
          </div>

          {matchSettings.desiredJobTitles.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Your target roles:</p>
              <div className="flex flex-wrap gap-2">
                {matchSettings.desiredJobTitles.map((title, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              💡 How Match Scores Work
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Skills (40%):</strong> Matches your resume skills with job requirements</li>
              <li>• <strong>Experience (25%):</strong> Compares your years of experience with job needs</li>
              <li>• <strong>Title (20%):</strong> How well the job matches your desired roles</li>
              <li>• <strong>Keywords (15%):</strong> Relevant terms from job description found in your resume</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">Contact Information</h2>
        <p className="text-gray-600 mb-6">
          This information will be used in your tailored resumes and cover letters.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={settings.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              name="address"
              value={settings.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              name="city"
              value={settings.city}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="New York"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              name="state"
              value={settings.state}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="NY"
              maxLength={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              name="zip"
              value={settings.zip}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10001"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={settings.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={settings.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {/* Development Settings (only show in development) */}
      {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">🔧 Development Settings</h2>
          <p className="text-gray-700 mb-4">
            These settings only appear in development mode (localhost).
          </p>

          <div className="bg-white p-4 rounded border border-amber-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key (Development Only)
            </label>
            <input
              type="password"
              value={localStorage.getItem('jobaly_dev_openai_key') || ''}
              onChange={(e) => {
                if (e.target.value) {
                  localStorage.setItem('jobaly_dev_openai_key', e.target.value);
                  setMessage('✅ Development API key saved! Refresh to use.');
                } else {
                  localStorage.removeItem('jobaly_dev_openai_key');
                  setMessage('✅ Development API key removed!');
                }
                setTimeout(() => setMessage(''), 3000);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
              placeholder="sk-proj-..."
            />
            <p className="text-xs text-gray-600 mt-2">
              ⚠️ <strong>Development only!</strong> This allows AI features to work without deploying to Vercel.
              <br />
              In production, the API key is stored securely on the server.
            </p>
            <p className="text-xs text-blue-600 mt-2">
              💡 Get your key from: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com/api-keys</a>
            </p>
          </div>
        </div>
      )}

      {/* Data Management Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-2">💾 Data Management</h2>
        <p className="text-gray-600 mb-6">
          Export your data for backup or import data from a previous export.
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleExportData}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            📥 Export Data
          </button>
          <button
            onClick={handleImportData}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            📤 Import Data
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            💡 About Your Data
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• All data is stored locally in your browser using IndexedDB</li>
            <li>• Export creates a JSON backup file you can save anywhere</li>
            <li>• Import will replace all current data with the imported data</li>
            <li>• Your data is never sent to any server (except AI APIs when enabled)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
