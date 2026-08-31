import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  Database,
  LogOut,
  Zap,
  TableProperties,
  GitFork,
  Server,
  Home,
  SlidersHorizontal,
  Plus,
  Radio
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { HEALTH_QUERY, LOGOUT_MUTATION } from '../graphql/auth';
import { apolloClient } from '../lib/apollo';
import { WorkspaceSwitcher } from './workspace/WorkspaceSwitcher';
import { FeatureFlagsDevModal } from './common/FeatureFlagsDevModal';
import { ThemeToggle } from './ui/theme-toggle';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const [isFlagsModalOpen, setIsFlagsModalOpen] = useState(false);

  const { data: healthData, error: healthError } = useQuery(HEALTH_QUERY, {
    pollInterval: 10000,
  });

  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  const handleLogout = async () => {
    try {
      await logoutMutation();
    } catch {
      // Ignore network errors during logout
    }
    clearAuth();
    await apolloClient.clearStore();
    void navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/', icon: Home },
    { label: 'SQL Query', path: '/editor', icon: Zap },
    { label: 'Schema Browser', path: '/schema', icon: TableProperties },
    { label: 'EER Diagram', path: '/diagram', icon: GitFork },
    { label: 'Connections', path: '/connections', icon: Server },
  ];

  return (
    <aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col justify-between select-none flex-shrink-0 z-30 font-sans text-[#c9d1d9] transition-colors">
      {/* Top Brand & Workspace Section */}
      <div className="p-3.5 border-b border-[#30363d] space-y-3 bg-[#0d1117]/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1f6feb] to-[#58a6ff] flex items-center justify-center text-white shadow-md shadow-[#1f6feb]/25">
            <Database className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Workbench</span>
              <span className="text-[9px] font-mono font-semibold text-[#58a6ff] bg-[#58a6ff]/10 px-1.5 py-0.5 rounded border border-[#58a6ff]/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-[#8b949e] truncate">Universal Database IDE</p>
          </div>
        </div>

        {/* Workspace Switcher */}
        <WorkspaceSwitcher />
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto">
        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
          Platform Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#1f6feb]/15 text-[#58a6ff] font-semibold border border-[#388bfd]/30 shadow-sm'
                  : 'text-[#c9d1d9] hover:bg-[#21262d] hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#58a6ff]' : 'text-[#8b949e]'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
          Quick Workspace Launch
        </div>
        <Link
          to="/editor"
          className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs bg-[#21262d] hover:bg-[#30363d] text-white font-medium border border-[#30363d] transition-all group"
        >
          <Plus className="w-3.5 h-3.5 text-[#3fb950] group-hover:scale-110 transition-transform" />
          <span>New Query Editor</span>
        </Link>
      </div>

      {/* Sidebar Bottom Footer: Status, User Profile & Actions */}
      <div className="p-3 border-t border-[#30363d] bg-[#0d1117]/80 space-y-2.5">
        {/* Live Server / Connection Health Status */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[11px] font-mono">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                healthData && !healthError
                  ? 'bg-[#3fb950] animate-pulse shadow-sm shadow-[#3fb950]/50'
                  : 'bg-[#f85149]'
              }`}
            />
            <span className={healthData && !healthError ? 'text-[#3fb950] font-semibold' : 'text-[#f85149]'}>
              {healthData ? 'Server Online' : 'Offline'}
            </span>
          </div>
          <span className="text-[10px] text-[#8b949e] flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 text-[#58a6ff]" /> :4000
          </span>
        </div>

        {/* User Profile & Actions Strip */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#21262d] to-[#30363d] border border-[#30363d] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs text-white font-medium truncate">{user?.email || 'User'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              onClick={() => setIsFlagsModalOpen(true)}
              className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
              title="Feature Flags & Capabilities"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <FeatureFlagsDevModal
        isOpen={isFlagsModalOpen}
        onClose={() => setIsFlagsModalOpen(false)}
      />
    </aside>
  );
};
