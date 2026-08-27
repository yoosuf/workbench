import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import {
  Building2,
  ChevronDown,
  Plus,
  Users,
  Check,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { LIST_WORKSPACES_QUERY } from '../../graphql/workspaces';
import { useWorkspaceStore, WorkspaceItem } from '../../stores/workspaceStore';
import { NewWorkspaceModal } from './NewWorkspaceModal';
import { TeamMembersModal } from './TeamMembersModal';

export const WorkspaceSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [newWorkspaceModalOpen, setNewWorkspaceModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { activeWorkspaceId, setActiveWorkspaceId, setWorkspaces } = useWorkspaceStore();

  const { data, loading } = useQuery(LIST_WORKSPACES_QUERY);
  const workspaces: WorkspaceItem[] = data?.listWorkspaces || [];

  useEffect(() => {
    if (workspaces.length > 0) {
      setWorkspaces(workspaces);
      if (!activeWorkspaceId || !workspaces.some((w) => w.id === activeWorkspaceId)) {
        setActiveWorkspaceId(workspaces[0].id);
      }
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspaceId, setWorkspaces]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <div className="flex items-center space-x-1">
        {/* Workspace Selector Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs text-white transition-colors"
          title="Switch Workspace"
        >
          <Building2 className="w-3.5 h-3.5 text-[#58a6ff]" />
          <span className="font-semibold max-w-[130px] truncate">
            {activeWorkspace?.name || 'Workspace'}
          </span>
          <ChevronDown className="w-3 h-3 text-[#8b949e]" />
        </button>

        {/* Team Members Button */}
        {activeWorkspace && (
          <button
            onClick={() => setTeamModalOpen(true)}
            className="p-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-white transition-colors"
            title="Team Members & Connection Permissions"
          >
            <Users className="w-3.5 h-3.5 text-[#3fb950]" />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-[#161b22] border border-[#30363d] shadow-2xl py-1.5 z-50 animate-fadeIn text-xs text-[#c9d1d9]">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8b949e] border-b border-[#21262d]">
            Your Workspaces
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {workspaces.map((ws) => {
              const isSelected = ws.id === activeWorkspace?.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspaceId(ws.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#21262d] transition-colors ${
                    isSelected ? 'bg-[#1f6feb]/15 text-[#58a6ff] font-semibold' : 'text-[#c9d1d9]'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-[#8b949e]" />
                    <span className="truncate">{ws.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#58a6ff] flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#21262d] pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setNewWorkspaceModalOpen(true);
              }}
              className="w-full px-3 py-2 text-left flex items-center space-x-2 text-[#58a6ff] hover:bg-[#21262d] transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewWorkspaceModal
        isOpen={newWorkspaceModalOpen}
        onClose={() => setNewWorkspaceModalOpen(false)}
      />

      {activeWorkspace && (
        <TeamMembersModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          currentUserRole={activeWorkspace.currentUserRole}
        />
      )}
    </div>
  );
};
