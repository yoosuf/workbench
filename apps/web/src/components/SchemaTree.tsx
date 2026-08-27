import React, { useState, useEffect } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronDown, 
  Table as TableIcon, 
  Eye, 
  Search, 
  Database, 
  Folder, 
  FolderOpen, 
  Loader2, 
  RefreshCw,
  Zap,
  Info,
  Plus,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { Engine } from '@workbench/shared-types';
import { CONNECTION_SCHEMAS_QUERY, SCHEMA_TABLES_QUERY } from '../graphql/schema';
import { CreateSchemaDrawer } from './schema/CreateSchemaDrawer';
import { SchemaPermissionsDrawer } from './schema/SchemaPermissionsDrawer';

interface ConnectionItem {
  id: string;
  name: string;
  engine: Engine;
  database: string;
}

interface TableItem {
  name: string;
  kind: string;
  schema: string;
}

interface SchemaTreeProps {
  connections: ConnectionItem[];
  selectedConnectionId: string;
  onSelectConnection: (id: string) => void;
  selectedTable: { schema: string; table: string } | null;
  onSelectTable: (schema: string, table: string) => void;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({
  connections,
  selectedConnectionId,
  onSelectConnection,
  selectedTable,
  onSelectTable,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});
  const [tablesBySchema, setTablesBySchema] = useState<Record<string, TableItem[]>>({});
  
  // Drawers state
  const [isCreateSchemaOpen, setIsCreateSchemaOpen] = useState(false);
  const [permSchema, setPermSchema] = useState<string | null>(null);

  const activeConnection = connections.find((c) => c.id === selectedConnectionId);

  const { data: schemasData, loading: loadingSchemas, refetch: refetchSchemas } = useQuery(
    CONNECTION_SCHEMAS_QUERY,
    {
      variables: { connectionId: selectedConnectionId },
      skip: !selectedConnectionId,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [fetchTables, { loading: loadingTables }] = useLazyQuery(SCHEMA_TABLES_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const schemas: { name: string }[] = schemasData?.connectionSchemas || [];

  // Auto-expand the primary schema
  useEffect(() => {
    if (schemas.length > 0) {
      const defaultSchema =
        schemas.find((s) => s.name === 'public' || s.name === activeConnection?.database) ||
        schemas[0];
      if (defaultSchema && !expandedSchemas[defaultSchema.name]) {
        toggleSchema(defaultSchema.name);
      }
    }
  }, [schemasData]);

  const toggleSchema = async (schemaName: string) => {
    const isCurrentlyExpanded = !!expandedSchemas[schemaName];
    setExpandedSchemas((prev) => ({ ...prev, [schemaName]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !tablesBySchema[schemaName]) {
      try {
        const res = await fetchTables({
          variables: {
            connectionId: selectedConnectionId,
            schema: schemaName,
          },
        });
        if (res.data?.schemaTables) {
          setTablesBySchema((prev) => ({
            ...prev,
            [schemaName]: res.data.schemaTables,
          }));

          // Auto-select first table if none selected
          if (!selectedTable && res.data.schemaTables.length > 0) {
            onSelectTable(schemaName, res.data.schemaTables[0].name);
          }
        }
      } catch (err) {
        console.error('Error fetching tables:', err);
      }
    }
  };

  const handleRefresh = async () => {
    setTablesBySchema({});
    await refetchSchemas();
  };

  const handleQuickQuery = (schema: string, table: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(
      `/editor?connectionId=${selectedConnectionId}&sql=${encodeURIComponent(
        `SELECT * FROM ${schema}.${table} LIMIT 1000;\n`,
      )}`,
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#161b22] border-r border-[#30363d] select-none overflow-hidden font-sans text-[#c9d1d9]">
      {/* Navigator Top Bar */}
      <div className="p-3 border-b border-[#30363d] space-y-2 bg-[#0d1117]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#8b949e] tracking-wider uppercase flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>SCHEMAS ({schemas.length})</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCreateSchemaOpen(true)}
              className="p-1 text-[#8b949e] hover:text-[#58a6ff] rounded hover:bg-[#21262d] transition-colors"
              title="Create New Schema"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d] transition-colors"
              title="Refresh schemas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSchemas ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Connection Selector */}
        <div className="relative">
          <select
            value={selectedConnectionId}
            onChange={(e) => {
              setExpandedSchemas({});
              setTablesBySchema({});
              onSelectConnection(e.target.value);
            }}
            className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-white appearance-none focus:outline-none focus:border-[#58a6ff] font-medium"
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.engine})
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-2 pointer-events-none text-[#8b949e]">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter tables..."
            className="w-full bg-[#161b22] border border-[#30363d] rounded pl-8 pr-2.5 py-1 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
          />
        </div>
      </div>

      {/* Schemas & Tables Tree View */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 font-mono text-xs">
        {loadingSchemas && schemas.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-[#8b949e]">
            <Loader2 className="w-4 h-4 animate-spin text-[#58a6ff]" />
            <span className="text-[11px]">Loading schemas...</span>
          </div>
        ) : schemas.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8b949e] space-y-2">
            <div>No schemas found.</div>
            <button
              onClick={() => setIsCreateSchemaOpen(true)}
              className="text-[11px] text-[#58a6ff] hover:underline"
            >
              + Create First Schema
            </button>
          </div>
        ) : (
          schemas.map((s) => {
            const isExpanded = !!expandedSchemas[s.name];
            const allTables = tablesBySchema[s.name] || [];
            const filteredTables = allTables.filter((t) =>
              t.name.toLowerCase().includes(searchTerm.toLowerCase()),
            );

            return (
              <div key={s.name} className="space-y-0.5">
                {/* Schema Folder Header */}
                <div className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#21262d] text-xs font-semibold text-[#c9d1d9] group transition-colors">
                  <button
                    onClick={() => toggleSchema(s.name)}
                    className="flex items-center space-x-1.5 flex-1 text-left truncate"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#8b949e]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#8b949e]" />
                    )}
                    {isExpanded ? (
                      <FolderOpen className="w-4 h-4 text-[#d29922] flex-shrink-0" />
                    ) : (
                      <Folder className="w-4 h-4 text-[#d29922]/80 flex-shrink-0" />
                    )}
                    <span className="truncate text-[11px]">{s.name}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {allTables.length > 0 && (
                      <span className="text-[10px] text-[#8b949e] px-1 py-0.2 rounded bg-[#0d1117]">
                        {allTables.length}
                      </span>
                    )}
                    {/* Schema Security Permissions Gear */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPermSchema(s.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-[#58a6ff] transition-opacity"
                      title={`Schema Permissions & Security (${s.name})`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Nested Tables */}
                {isExpanded && (
                  <div className="pl-3 space-y-0.5 border-l border-[#30363d] ml-3.5">
                    {loadingTables && !tablesBySchema[s.name] ? (
                      <div className="py-2 pl-2 flex items-center space-x-2 text-[11px] text-[#8b949e]">
                        <Loader2 className="w-3 h-3 animate-spin text-[#58a6ff]" />
                        <span>Loading tables...</span>
                      </div>
                    ) : filteredTables.length === 0 ? (
                      <div className="py-1.5 pl-2 text-[11px] text-[#8b949e] italic">
                        {searchTerm ? 'No matches' : 'No tables in schema'}
                      </div>
                    ) : (
                      filteredTables.map((t) => {
                        const isSelected =
                          selectedTable?.schema === t.schema && selectedTable?.table === t.name;
                        const isView = t.kind === 'VIEW';

                        return (
                          <div
                            key={`${t.schema}.${t.name}`}
                            onClick={() => onSelectTable(t.schema, t.name)}
                            className={`group flex items-center justify-between px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#388bfd]/20 text-[#58a6ff] font-semibold border border-[#388bfd]/40'
                                : 'text-[#c9d1d9] hover:text-white hover:bg-[#21262d]'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate flex-1">
                              {isView ? (
                                <Eye className="w-3.5 h-3.5 text-[#38bdf8] flex-shrink-0" />
                              ) : (
                                <TableIcon className="w-3.5 h-3.5 text-[#58a6ff] flex-shrink-0" />
                              )}
                              <span className="truncate text-[11px]">{t.name}</span>
                            </div>

                            {/* Classic 3-Action Quick Buttons on Hover */}
                            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 pl-1 transition-opacity">
                              <button
                                onClick={(e) => handleQuickQuery(t.schema, t.name, e)}
                                className="p-0.5 rounded hover:bg-[#30363d] text-[#d29922]"
                                title="Quick SELECT * (Lightning)"
                              >
                                <Zap className="w-3 h-3 fill-current" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectTable(t.schema, t.name);
                                }}
                                className="p-0.5 rounded hover:bg-[#30363d] text-[#58a6ff]"
                                title="Table Inspector"
                              >
                                <Info className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Object Info Widget */}
      <div className="p-3 border-t border-[#30363d] bg-[#0d1117] text-[11px] font-mono text-[#8b949e] space-y-1">
        <div className="font-bold text-[#c9d1d9]">Object Info</div>
        <div className="truncate">
          Table: <span className="text-[#58a6ff]">{selectedTable ? `${selectedTable.schema}.${selectedTable.table}` : 'None'}</span>
        </div>
        <div>
          Engine: <span className="text-white">{activeConnection?.engine}</span>
        </div>
      </div>

      {/* Drawers */}
      <CreateSchemaDrawer
        isOpen={isCreateSchemaOpen}
        onClose={() => setIsCreateSchemaOpen(false)}
        connectionId={selectedConnectionId}
        onSchemaCreated={(newSchema) => {
          handleRefresh();
          toggleSchema(newSchema);
        }}
      />

      {permSchema && (
        <SchemaPermissionsDrawer
          isOpen={!!permSchema}
          onClose={() => setPermSchema(null)}
          connectionId={selectedConnectionId}
          schema={permSchema}
          onSchemaDropped={() => {
            handleRefresh();
            setPermSchema(null);
          }}
        />
      )}
    </div>
  );
};
