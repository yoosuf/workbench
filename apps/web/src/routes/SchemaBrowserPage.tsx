import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Database, Table, ArrowUpRight, Loader2 } from 'lucide-react';
import { LIST_CONNECTIONS_QUERY } from '../graphql/connections';
import { SchemaTree } from '../components/SchemaTree';
import { TableInspector } from '../components/TableInspector';
import { Link } from 'react-router-dom';

export const SchemaBrowserPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const connectionIdParam = searchParams.get('connectionId') || localStorage.getItem('workbench_last_conn_id') || '';
  const schemaParam = searchParams.get('schema') || '';
  const tableParam = searchParams.get('table') || '';

  const { data, loading } = useQuery(LIST_CONNECTIONS_QUERY);
  const connections = data?.listConnections || [];

  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(connectionIdParam);
  const [selectedTable, setSelectedTable] = useState<{ schema: string; table: string } | null>(
    schemaParam && tableParam ? { schema: schemaParam, table: tableParam } : null
  );

  useEffect(() => {
    if (connections.length > 0) {
      if (connectionIdParam && connections.some((c: any) => c.id === connectionIdParam)) {
        setSelectedConnectionId(connectionIdParam);
      } else if (!selectedConnectionId) {
        const defaultId = connections[0].id;
        setSelectedConnectionId(defaultId);
        localStorage.setItem('workbench_last_conn_id', defaultId);
      }
    }
  }, [connections, connectionIdParam]);

  const handleSelectConnection = (id: string) => {
    setSelectedConnectionId(id);
    setSelectedTable(null);
    localStorage.setItem('workbench_last_conn_id', id);
    setSearchParams({ connectionId: id });
  };

  const handleSelectTable = (schema: string, table: string) => {
    setSelectedTable({ schema, table });
    setSearchParams({ connectionId: selectedConnectionId, schema, table });
  };

  if (loading && connections.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-[#0d1117]">
        <Loader2 className="w-8 h-8 text-[#58a6ff] animate-spin" />
        <p className="text-xs text-[#8b949e] font-mono">Loading database connections...</p>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#0d1117]">
        <div className="w-14 h-14 rounded-2xl bg-[#58a6ff]/10 text-[#58a6ff] border border-[#388bfd]/30 flex items-center justify-center mb-4">
          <Database className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white">No Database Connections Found</h2>
        <p className="text-xs text-[#8b949e] max-w-sm mt-1 mb-5">
          You need to add at least one database connection before browsing schemas.
        </p>
        <Link
          to="/connections"
          className="inline-flex items-center space-x-2 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all"
        >
          <span>Configure Connections</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[#0d1117]">
      <PanelGroup direction="horizontal" className="flex-1">
        {/* Left Navigator Panel */}
        <Panel defaultSize={24} minSize={16} maxSize={40}>
          <SchemaTree
            connections={connections}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={handleSelectConnection}
            selectedTable={selectedTable}
            onSelectTable={handleSelectTable}
          />
        </Panel>

        {/* Resizable Divider Handle */}
        <PanelResizeHandle className="w-1 bg-[#30363d] hover:bg-[#58a6ff] transition-colors cursor-col-resize relative group">
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </PanelResizeHandle>

        {/* Right Table Inspector Panel */}
        <Panel defaultSize={76}>
          {selectedTable && selectedConnectionId ? (
            <TableInspector
              connectionId={selectedConnectionId}
              schema={selectedTable.schema}
              table={selectedTable.table}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-[#0d1117] text-[#8b949e]">
              <div className="w-12 h-12 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-center mb-3">
                <Table className="w-6 h-6 text-[#8b949e]" />
              </div>
              <h3 className="text-sm font-semibold text-white">No Table Selected</h3>
              <p className="text-xs text-[#8b949e] max-w-xs mt-1">
                Select any table or view from the Navigator on the left to inspect its columns, keys, indexes, and live data.
              </p>
            </div>
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
};
