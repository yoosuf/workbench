import { create } from 'zustand';

interface DiagramUIState {
  selectedNodeId: string | null;
  isDirty: boolean;
  collapsedTables: Record<string, boolean>;
  setSelectedNodeId: (id: string | null) => void;
  setDirty: (isDirty: boolean) => void;
  toggleTableCollapse: (tableId: string) => void;
  resetUIState: () => void;
}

export const useDiagramStore = create<DiagramUIState>((set) => ({
  selectedNodeId: null,
  isDirty: false,
  collapsedTables: {},
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setDirty: (isDirty) => set({ isDirty }),
  toggleTableCollapse: (tableId) =>
    set((state) => ({
      collapsedTables: {
        ...state.collapsedTables,
        [tableId]: !state.collapsedTables[tableId],
      },
    })),
  resetUIState: () =>
    set({
      selectedNodeId: null,
      isDirty: false,
      collapsedTables: {},
    }),
}));
