import React from 'react';
import { useLocation } from 'react-router-dom';
import { NotificationBell } from './notifications/NotificationBell';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/':
        return 'Connections & Workspace Overview';
      case '/editor':
        return 'Interactive SQL Query Editor';
      case '/schema':
        return 'Database Schema Inspector & Table Browser';
      case '/diagram':
        return 'Visual EER Diagram & Relationship Designer';
      case '/connections':
        return 'Database Connections & Drivers';
      default:
        return 'Database Workbench';
    }
  };

  return (
    <header className="h-10 px-4 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between select-none flex-shrink-0 z-20 font-sans text-[#c9d1d9]">
      <div className="flex items-center space-x-2">
        <span className="text-xs font-semibold text-white tracking-tight">
          {getPageTitle(location.pathname)}
        </span>
      </div>

      <div className="flex items-center space-x-3">
        <NotificationBell />
      </div>
    </header>
  );
};
