import React, { useState } from 'react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: 'dashboard' | 'resumes' | 'applications' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'resumes', label: 'Resumes', icon: '📄' },
    { id: 'applications', label: 'Applications', icon: '📮' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Header with Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <img 
            src="/icon.png" 
            alt="Jobaly" 
            className="w-10 h-10 rounded-lg flex-shrink-0"
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">Jobaly</h1>
              <p className="text-xs text-gray-500">AI Job Assistant</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as any)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentPage === item.id
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="text-2xl">{item.icon}</span>
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer with Collapse Toggle */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="text-xs text-gray-500">
              <p>Version 0.1.0</p>
              <p>Local-first & Private</p>
            </div>
          )}
          
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900 ${isCollapsed ? 'mx-auto' : 'ml-auto'}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
