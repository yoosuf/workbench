import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'READONLY';
export type ConnectionAccessLevel = 'ADMIN' | 'WRITE' | 'READ';

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  currentUserRole?: WorkspaceRole;
  createdAt: string;
}

interface WorkspaceState {
  activeWorkspaceId: string | null;
  workspaces: WorkspaceItem[];
  setActiveWorkspaceId: (id: string | null) => void;
  setWorkspaces: (workspaces: WorkspaceItem[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      workspaces: [],
      setActiveWorkspaceId: (activeWorkspaceId) => set({ activeWorkspaceId }),
      setWorkspaces: (workspaces) => set({ workspaces }),
    }),
    {
      name: 'workbench_workspace_store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
