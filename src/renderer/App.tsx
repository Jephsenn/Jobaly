import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Resumes from './pages/Resumes';
import Applications from './pages/Applications';
import Settings from './pages/Settings';
import SidebarComponent from './components/SidebarComponent';
import { UpdateNotification } from './components/UpdateNotification';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'resumes' | 'applications' | 'settings'>('dashboard');

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarComponent currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'resumes' && <Resumes />}
        {currentPage === 'applications' && <Applications />}
        {currentPage === 'settings' && <Settings />}
      </main>
      <UpdateNotification />
    </div>
  );
}

export default App;
