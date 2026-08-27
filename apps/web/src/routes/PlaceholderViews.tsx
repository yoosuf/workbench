import React from 'react';
import { Layers, Network, Table, Code2, GitGraph } from 'lucide-react';

export const ConnectionsPlaceholder: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3">
      <Network className="w-6 h-6" />
    </div>
    <h2 className="text-lg font-bold text-white">Connections Management</h2>
    <p className="text-xs text-slate-400 max-w-sm mt-1">
      M1 Milestone will enable configuring, testing, and managing MySQL & PostgreSQL database connections.
    </p>
  </div>
);

export const SchemaPlaceholder: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-3">
      <Table className="w-6 h-6" />
    </div>
    <h2 className="text-lg font-bold text-white">Schema Browser</h2>
    <p className="text-xs text-slate-400 max-w-sm mt-1">
      M2 Milestone will implement the lazy-loading schema tree, table/column inspector, and DataLoader batching.
    </p>
  </div>
);

export const EditorPlaceholder: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-3">
      <Code2 className="w-6 h-6" />
    </div>
    <h2 className="text-lg font-bold text-white">SQL Query Editor</h2>
    <p className="text-xs text-slate-400 max-w-sm mt-1">
      M4 Milestone will provide multi-tab Monaco SQL editor, autocomplete, query limits, and virtualized TanStack grid.
    </p>
  </div>
);

export const DiagramPlaceholder: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center mb-3">
      <GitGraph className="w-6 h-6" />
    </div>
    <h2 className="text-lg font-bold text-white">ER Diagram Canvas</h2>
    <p className="text-xs text-slate-400 max-w-sm mt-1">
      M3 Milestone will reverse-engineer schemas into interactive React Flow diagrams with auto-layout and live FK edges.
    </p>
  </div>
);
