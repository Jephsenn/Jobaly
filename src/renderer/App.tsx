import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Resumes from './pages/Resumes';
import Settings from './pages/Settings';
import SidebarComponent from './components/SidebarComponent';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'resumes' | 'applications' | 'settings'>('dashboard');

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarComponent currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'resumes' && <Resumes />}
        {currentPage === 'applications' && <div className="p-8">Applications (Coming Soon)</div>}
        {currentPage === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default App;
