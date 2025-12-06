import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Resumes from './pages/Resumes';
import Applications from './pages/Applications';
import Settings from './pages/Settings';
import SidebarComponent from './components/SidebarComponent';

// Import test data helpers (makes them available in console)
import '../services/testData';
import { initExtensionListener } from '../services/extensionListener';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'resumes' | 'applications' | 'settings'>('dashboard');

  // Initialize extension listener on mount
  useEffect(() => {
    initExtensionListener();
    console.log('✅ Jobaly app ready - extension listener active');
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarComponent currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'resumes' && <Resumes />}
        {currentPage === 'applications' && <Applications />}
        {currentPage === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default App;
