import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  Zap,
  Play,
  StopCircle,
  Plus,
  X,
  History,
  Bookmark,
  Save,
  Loader2,
  Database,
  AlertCircle,
  Clock,
  CheckCircle2,
  Trash2,
  FolderOpen,
  Sparkles,
  Table as TableIcon,
  Code2,
  FileCode,
  Check,
  Search,
  ChevronRight,
  ChevronDown,
  Info,
  Wrench,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { LIST_CONNECTIONS_QUERY } from '../graphql/connections';
import { CONNECTION_SCHEMAS_QUERY, SCHEMA_TABLES_QUERY } from '../graphql/schema';
import {
  EXECUTE_QUERY_MUTATION,
  QUERY_HISTORY_QUERY,
  SAVE_QUERY_MUTATION,
  LIST_SAVED_QUERIES_QUERY,
  DELETE_SAVED_QUERY_MUTATION,
} from '../graphql/editor';
import { useEditorStore } from '../stores/editorStore';
import { SqlMonacoEditor } from '../components/editor/SqlMonacoEditor';
import { VirtualizedResultGrid } from '../components/editor/VirtualizedResultGrid';

interface ConnectionItem {
  id: string;
  name: string;
  engine: string;
  database: string;
}

export const SqlEditorPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConnectionId = searchParams.get('connectionId') || '';
  const initialSql = searchParams.get('sql') || '';

  const { data: connData } = useQuery(LIST_CONNECTIONS_QUERY);
  const connections: ConnectionItem[] = connData?.listConnections || [];

  const {
    tabs,
    activeTabId,
    addTab,
    closeTab,
    setActiveTabId,
    updateTabSql,
    updateTabConnection,
  } = useEditorStore();

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeConnectionId = activeTab?.connectionId || (connections[0]?.id ?? '');

  const [limitOption, setLimitOption] = useState<number>(1000);
  const [overrideLimits, setOverrideLimits] = useState<boolean>(false);
  const [activeOutputTab, setActiveOutputTab] = useState<'grid' | 'output' | 'history' | 'saved'>('grid');
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [savedQueryName, setSavedQueryName] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [sidebarFilter, setSidebarFilter] = useState<string>('');

  // Execution Result State
  const [queryResult, setQueryResult] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    executionTimeMs: number;
    truncated: boolean;
  } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Queries & Mutations
  const [executeQuery, { loading: executing }] = useMutation(EXECUTE_QUERY_MUTATION);
  const [saveQueryMutation, { loading: savingQuery }] = useMutation(SAVE_QUERY_MUTATION);
  const [deleteSavedQueryMutation] = useMutation(DELETE_SAVED_QUERY_MUTATION);

  // Fetch Schemas for Sidebar Navigator
  const { data: schemasData } = useQuery(CONNECTION_SCHEMAS_QUERY, {
    variables: { connectionId: activeConnectionId },
    skip: !activeConnectionId,
  });
  const schemas = schemasData?.connectionSchemas || [];
  const currentSchemaName = schemas[0]?.name || (connections.find(c => c.id === activeConnectionId)?.engine === 'MYSQL' ? 'sample_ecommerce' : 'public');

  // Fetch Tables for Sidebar Navigator
  const { data: tablesData } = useQuery(SCHEMA_TABLES_QUERY, {
    variables: { connectionId: activeConnectionId, schema: currentSchemaName },
    skip: !activeConnectionId || !currentSchemaName,
  });
  const schemaTables = tablesData?.schemaTables || [];

  // Fetch Query History
  const { data: historyData, refetch: refetchHistory } = useQuery(QUERY_HISTORY_QUERY, {
    variables: { connectionId: activeConnectionId, limit: 50 },
    skip: !activeConnectionId,
    fetchPolicy: 'network-only',
  });
  const queryHistory = historyData?.queryHistory || [];

  // Fetch Saved Queries
  const { data: savedData, refetch: refetchSaved } = useQuery(LIST_SAVED_QUERIES_QUERY, {
    variables: { connectionId: activeConnectionId },
    skip: !activeConnectionId,
    fetchPolicy: 'network-only',
  });
  const savedQueries = savedData?.listSavedQueries || [];

  // Handle URL params & persistent connection
  useEffect(() => {
    if (connections.length > 0) {
      if (!activeTab?.connectionId || !connections.some((c) => c.id === activeTab.connectionId)) {
        const targetId =
          initialConnectionId ||
          localStorage.getItem('workbench_last_conn_id') ||
          connections[0].id;
        updateTabConnection(activeTab.id, targetId);
        localStorage.setItem('workbench_last_conn_id', targetId);
      }
      if (initialSql && activeTab && activeTab.sql.includes('Run SQL against')) {
        updateTabSql(activeTab.id, decodeURIComponent(initialSql));
      }
    }
  }, [connections, initialConnectionId, initialSql, activeTab]);

  // Execute SQL
  const handleExecute = async () => {
    if (!activeConnectionId || !activeTab?.sql.trim()) return;

    setQueryError(null);
    try {
      const res = await executeQuery({
        variables: {
          input: {
            connectionId: activeConnectionId,
            sql: activeTab.sql,
            overrideLimits: overrideLimits || limitOption === 0,
          },
        },
      });

      if (res.data?.executeQuery) {
        setQueryResult(res.data.executeQuery);
        setActiveOutputTab('grid');
        refetchHistory();
      }
    } catch (err: any) {
      setQueryError(err.message || 'Query execution failed');
      setQueryResult(null);
      setActiveOutputTab('output');
      refetchHistory();
    }
  };

  // Quick Table Query
  const handleQuickSelectTable = (tableName: string) => {
    const sql = `SELECT * FROM ${currentSchemaName}.${tableName} LIMIT ${limitOption || 1000};\n`;
    addTab(activeConnectionId, sql, tableName);
  };

  // Save Query
  const handleSaveQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedQueryName.trim() || !activeTab?.sql) return;

    try {
      await saveQueryMutation({
        variables: {
          input: {
            connectionId: activeConnectionId,
            name: savedQueryName,
            sql: activeTab.sql,
          },
        },
      });
      setSaveModalOpen(false);
      setSavedQueryName('');
      refetchSaved();
      setActiveOutputTab('saved');
    } catch (err: any) {
      alert(`Failed to save query: ${err.message}`);
    }
  };

  // Delete Saved Query
  const handleDeleteSavedQuery = async (id: string) => {
    try {
      await deleteSavedQueryMutation({ variables: { id } });
      refetchSaved();
    } catch (err: any) {
      alert(`Error deleting saved query: ${err.message}`);
    }
  };

  const filteredTables = schemaTables.filter((t: any) =>
    t.name.toLowerCase().includes(sidebarFilter.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-5.5rem)] bg-[#0d1117] overflow-hidden select-none font-sans text-[#c9d1d9]">
      {/* MySQL Workbench Signature SQL Action Toolbar */}
      <div className="h-10 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center space-x-2">
          {/* Toggle Sidebar */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
            title="Toggle Schemas Navigator Sidebar"
          >
            {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <span className="text-[#30363d]">|</span>

          {/* Connection Picker */}
          <div className="flex items-center space-x-1.5">
            <Database className="w-3.5 h-3.5 text-[#58a6ff]" />
            <select
              value={activeConnectionId}
              onChange={(e) => {
                updateTabConnection(activeTab.id, e.target.value);
                localStorage.setItem('workbench_last_conn_id', e.target.value);
                setSearchParams({ connectionId: e.target.value });
              }}
              className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[#58a6ff] font-medium"
            >
              {connections.map((c: ConnectionItem) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.engine})
                </option>
              ))}
            </select>
          </div>

          <span className="text-[#30363d]">|</span>

          {/* The Iconic Yellow Lightning Bolt Execution Button */}
          <button
            onClick={handleExecute}
            disabled={executing || !activeTab?.sql.trim()}
            className="wb-lightning inline-flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-bold text-black transition-all disabled:opacity-50"
            title="Execute entire query or selected text (Cmd+Enter / Ctrl+Enter)"
          >
            {executing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Execute</span>
          </button>

          {/* Limit rows dropdown */}
          <div className="flex items-center space-x-1 pl-2">
            <span className="text-[11px] text-[#8b949e]">Limit:</span>
            <select
              value={limitOption}
              onChange={(e) => setLimitOption(Number(e.target.value))}
              className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-0.5 text-[11px] text-white focus:outline-none focus:border-[#58a6ff]"
            >
              <option value={100}>Limit 100 rows</option>
              <option value={1000}>Limit 1000 rows</option>
              <option value={10000}>Limit 10,000 rows</option>
              <option value={0}>Don't Limit</option>
            </select>
          </div>
        </div>

        {/* Right Tools (Save, History, Formatter) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSaveModalOpen(true)}
            className="wb-button inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs"
            title="Save SQL snippet"
          >
            <Save className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Save Query</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area with Collapsible Left Navigator */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Schemas Navigator Sidebar */}
        {showSidebar && (
          <div className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col flex-shrink-0">
            {/* Sidebar Tabs: SCHEMAS */}
            <div className="h-8 px-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8b949e]">
              <span>Navigator / Schemas</span>
              <span className="text-[10px] font-mono text-[#58a6ff] lowercase">
                {currentSchemaName}
              </span>
            </div>

            {/* Filter Tables Search */}
            <div className="p-2 border-b border-[#30363d]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter tables..."
                  value={sidebarFilter}
                  onChange={(e) => setSidebarFilter(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded pl-8 pr-2 py-1 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
            </div>

            {/* Schema Tables Tree */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 text-xs font-mono">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
                Tables ({filteredTables.length})
              </div>
              {filteredTables.map((t: any) => (
                <div
                  key={t.name}
                  className="group flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#21262d] text-[#c9d1d9] hover:text-white cursor-pointer transition-colors"
                >
                  <div
                    onClick={() => handleQuickSelectTable(t.name)}
                    className="flex items-center space-x-2 truncate flex-1"
                  >
                    <TableIcon className="w-3.5 h-3.5 text-[#388bfd] flex-shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </div>

                  {/* Classic MySQL Workbench 3-Action Quick Hover Buttons */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 pl-1 transition-opacity">
                    <button
                      onClick={() => handleQuickSelectTable(t.name)}
                      className="p-0.5 rounded hover:bg-[#30363d] text-[#d29922]"
                      title="Quick SELECT * (Lightning)"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                    </button>
                    <button
                      onClick={() => {
                        const sql = `SELECT * FROM ${currentSchemaName}.${t.name};\n`;
                        addTab(activeConnectionId, sql, t.name);
                      }}
                      className="p-0.5 rounded hover:bg-[#30363d] text-[#58a6ff]"
                      title="Table Inspector"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Object Info Widget */}
            <div className="p-3 border-t border-[#30363d] bg-[#0d1117] text-[11px] font-mono text-[#8b949e] space-y-1">
              <div className="font-bold text-[#c9d1d9]">Object Info</div>
              <div>Schema: <span className="text-[#58a6ff]">{currentSchemaName}</span></div>
              <div>Active Connection: <span className="text-white">{connections.find(c => c.id === activeConnectionId)?.name || 'Default'}</span></div>
            </div>
          </div>
        )}

        {/* Central Work Area (Editor + Result Grid Split) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PanelGroup direction="vertical" className="flex-1">
            {/* Top Multi-Tab SQL Editor Panel */}
            <Panel defaultSize={50} minSize={20}>
              <div className="h-full flex flex-col bg-[#0d1117]">
                {/* Workbench Query Tabs Strip */}
                <div className="h-8 bg-[#161b22] border-b border-[#30363d] flex items-center px-1 space-x-0.5 overflow-x-auto select-none">
                  {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (
                      <div
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`group flex items-center space-x-2 px-3 py-1.5 text-xs cursor-pointer transition-all font-mono border-r border-[#30363d] ${
                          isActive
                            ? 'wb-tab-active'
                            : 'wb-tab hover:bg-[#21262d] hover:text-[#c9d1d9]'
                        }`}
                      >
                        <FileCode className={`w-3 h-3 ${isActive ? 'text-[#58a6ff]' : 'text-[#8b949e]'}`} />
                        <span>{tab.title}</span>
                        {tabs.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTab(tab.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-opacity ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Query Tab Button */}
                  <button
                    type="button"
                    onClick={() => addTab(activeConnectionId)}
                    className="p-1.5 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d] transition-colors ml-1"
                    title="New SQL Tab"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1 overflow-hidden">
                  <SqlMonacoEditor
                    value={activeTab?.sql || ''}
                    onChange={(sql) => updateTabSql(activeTab.id, sql)}
                    onExecute={handleExecute}
                    schemaTables={schemaTables}
                  />
                </div>
              </div>
            </Panel>

            {/* Resizable Divider */}
            <PanelResizeHandle className="h-1.5 bg-[#21262d] hover:bg-[#58a6ff] transition-colors cursor-row-resize relative group">
              <div className="absolute inset-x-0 -top-1 -bottom-1" />
            </PanelResizeHandle>

            {/* Bottom Multi-Tab Output Panel (Result Grid / Action Output / History / Saved) */}
            <Panel defaultSize={50} minSize={20}>
              <div className="h-full bg-[#0d1117] flex flex-col overflow-hidden">
                {/* Output Dock Tab Strip */}
                <div className="h-8 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-2 flex-shrink-0 text-xs font-medium">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setActiveOutputTab('grid')}
                      className={`px-3 py-1 rounded text-xs flex items-center space-x-1.5 transition-colors ${
                        activeOutputTab === 'grid'
                          ? 'bg-[#21262d] text-[#58a6ff] font-semibold border border-[#388bfd]/30'
                          : 'text-[#8b949e] hover:text-white'
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Result Grid</span>
                      {queryResult && (
                        <span className="text-[10px] bg-[#0d1117] px-1.5 py-0.2 rounded text-[#3fb950] font-mono">
                          {queryResult.rowCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveOutputTab('output')}
                      className={`px-3 py-1 rounded text-xs flex items-center space-x-1.5 transition-colors ${
                        activeOutputTab === 'output'
                          ? 'bg-[#21262d] text-[#58a6ff] font-semibold border border-[#388bfd]/30'
                          : 'text-[#8b949e] hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Action Output</span>
                      {queryError && (
                        <span className="w-2 h-2 rounded-full bg-[#f85149]" />
                      )}
                    </button>

                    <button
                      onClick={() => setActiveOutputTab('history')}
                      className={`px-3 py-1 rounded text-xs flex items-center space-x-1.5 transition-colors ${
                        activeOutputTab === 'history'
                          ? 'bg-[#21262d] text-[#58a6ff] font-semibold border border-[#388bfd]/30'
                          : 'text-[#8b949e] hover:text-white'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Execution History</span>
                    </button>

                    <button
                      onClick={() => setActiveOutputTab('saved')}
                      className={`px-3 py-1 rounded text-xs flex items-center space-x-1.5 transition-colors ${
                        activeOutputTab === 'saved'
                          ? 'bg-[#21262d] text-[#58a6ff] font-semibold border border-[#388bfd]/30'
                          : 'text-[#8b949e] hover:text-white'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5 text-[#d29922]" />
                      <span>Saved Queries ({savedQueries.length})</span>
                    </button>
                  </div>
                </div>

                {/* Tab Output Views */}
                <div className="flex-1 overflow-hidden">
                  {activeOutputTab === 'grid' && (
                    queryResult ? (
                      <VirtualizedResultGrid
                        columns={queryResult.columns}
                        rows={queryResult.rows}
                        rowCount={queryResult.rowCount}
                        executionTimeMs={queryResult.executionTimeMs}
                        truncated={queryResult.truncated}
                      />
                    ) : queryError ? (
                      <div className="p-5 h-full overflow-auto bg-[#2b0f14]/30 border-t border-[#f85149]/40 text-xs font-mono space-y-2">
                        <div className="flex items-center space-x-2 text-[#f85149] font-bold">
                          <AlertCircle className="w-4 h-4" />
                          <span>SQL Execution Error</span>
                        </div>
                        <pre className="p-3 rounded bg-[#0d1117] border border-[#f85149]/30 text-[#ff7b72] whitespace-pre-wrap leading-relaxed">
                          {queryError}
                        </pre>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#8b949e] font-mono text-xs">
                        <Zap className="w-6 h-6 mb-2 text-[#30363d]" />
                        <span>Execute a query using the yellow lightning bolt to inspect results</span>
                      </div>
                    )
                  )}

                  {activeOutputTab === 'output' && (
                    <div className="h-full overflow-auto bg-[#0d1117] font-mono text-xs select-text">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d] text-[10px] uppercase font-semibold">
                            <th className="py-2 px-3 w-10 text-center">Status</th>
                            <th className="py-2 px-3 w-24">Time</th>
                            <th className="py-2 px-3">Action</th>
                            <th className="py-2 px-3 w-28">Duration</th>
                            <th className="py-2 px-3 w-28">Rows</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#21262d]">
                          {queryHistory.map((item: any) => (
                            <tr key={item.id} className="hover:bg-[#161b22] transition-colors">
                              <td className="py-2 px-3 text-center">
                                {item.success ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950] mx-auto" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-[#f85149] mx-auto" />
                                )}
                              </td>
                              <td className="py-2 px-3 text-[#8b949e] text-[11px]">
                                {new Date(item.executedAt).toLocaleTimeString()}
                              </td>
                              <td className="py-2 px-3 font-mono text-white truncate max-w-[400px]" title={item.sql}>
                                {item.sql}
                              </td>
                              <td className="py-2 px-3 text-[#8b949e] text-[11px]">
                                {(item.durationMs / 1000).toFixed(3)} sec
                              </td>
                              <td className="py-2 px-3 text-[#58a6ff] text-[11px]">
                                {item.rowCount ?? 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeOutputTab === 'history' && (
                    <div className="h-full overflow-y-auto p-3 space-y-2 font-mono">
                      {queryHistory.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => updateTabSql(activeTab.id, item.sql)}
                          className="p-2.5 rounded bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] cursor-pointer transition-colors space-y-1 group"
                        >
                          <div className="flex items-center justify-between text-[10px] text-[#8b949e]">
                            <span className="flex items-center gap-1">
                              {item.success ? (
                                <CheckCircle2 className="w-3 h-3 text-[#3fb950]" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-[#f85149]" />
                              )}
                              <span className={item.success ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                                {item.durationMs}ms
                              </span>
                            </span>
                            <span>{new Date(item.executedAt).toLocaleTimeString()}</span>
                          </div>
                          <pre className="text-xs text-white truncate">{item.sql}</pre>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeOutputTab === 'saved' && (
                    <div className="h-full overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {savedQueries.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-3 rounded bg-[#161b22] border border-[#30363d] space-y-2 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Bookmark className="w-3.5 h-3.5 text-[#d29922]" />
                              <span>{item.name}</span>
                            </span>
                            <button
                              onClick={() => handleDeleteSavedQuery(item.id)}
                              className="p-1 text-[#8b949e] hover:text-[#f85149] rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <pre
                            onClick={() => updateTabSql(activeTab.id, item.sql)}
                            className="p-2 rounded bg-[#0d1117] border border-[#21262d] text-xs text-[#58a6ff] font-mono truncate cursor-pointer hover:border-[#58a6ff]"
                          >
                            {item.sql}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>

      {/* Save Query Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-[#161b22] border border-[#30363d] shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#d29922]" />
              <span>Save SQL Snippet</span>
            </h3>

            <form onSubmit={handleSaveQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">Snippet Name</label>
                <input
                  type="text"
                  required
                  value={savedQueryName}
                  onChange={(e) => setSavedQueryName(e.target.value)}
                  placeholder="e.g. Total Revenue by Customer"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-[#8b949e] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuery || !savedQueryName.trim()}
                  className="px-4 py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {savingQuery ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Snippet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
