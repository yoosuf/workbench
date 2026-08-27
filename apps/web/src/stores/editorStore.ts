import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface EditorTab {
  id: string;
  title: string;
  sql: string;
  connectionId: string;
}

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string;
  addTab: (connectionId: string, initialSql?: string, title?: string) => string;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string) => void;
  updateTabSql: (id: string, sql: string) => void;
  updateTabConnection: (id: string, connectionId: string) => void;
  updateTabTitle: (id: string, title: string) => void;
}

const defaultInitialTab: EditorTab = {
  id: 'tab_1',
  title: 'Query 1',
  sql: '-- Run SQL against PostgreSQL or MySQL\nSELECT * FROM products LIMIT 50;\n',
  connectionId: '',
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      tabs: [defaultInitialTab],
      activeTabId: 'tab_1',

      addTab: (connectionId, initialSql = 'SELECT * FROM products LIMIT 50;\n', title) => {
        const tabs = get().tabs;
        const nextIndex = tabs.length + 1;
        const newId = `tab_${Date.now()}`;
        const newTab: EditorTab = {
          id: newId,
          title: title || `Query ${nextIndex}`,
          sql: initialSql,
          connectionId: connectionId || tabs[0]?.connectionId || '',
        };
        set({
          tabs: [...tabs, newTab],
          activeTabId: newId,
        });
        return newId;
      },

      closeTab: (id) => {
        const { tabs, activeTabId } = get();
        if (tabs.length === 1) return; // Keep at least one tab open

        const newTabs = tabs.filter((t) => t.id !== id);
        let newActiveId = activeTabId;
        if (activeTabId === id) {
          const closedIndex = tabs.findIndex((t) => t.id === id);
          const nextTab = newTabs[Math.max(0, closedIndex - 1)];
          newActiveId = nextTab.id;
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveId,
        });
      },

      setActiveTabId: (activeTabId) => set({ activeTabId }),

      updateTabSql: (id, sql) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === id ? { ...t, sql } : t)),
        }));
      },

      updateTabConnection: (id, connectionId) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === id ? { ...t, connectionId } : t)),
        }));
      },

      updateTabTitle: (id, title) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
        }));
      },
    }),
    {
      name: 'workbench_editor_store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
