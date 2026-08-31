import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { 
  Key, 
  Link2, 
  ListTree, 
  Table as TableIcon, 
  GitFork, 
  Loader2, 
  Layers, 
  ArrowRight,
  Database,
  FileCode,
  Zap,
  Check,
  Copy,
  Plus
} from 'lucide-react';
import { TABLE_DETAILS_QUERY } from '../graphql/schema';
import { useNavigate } from 'react-router-dom';
import { TableDataBrowser } from './TableDataBrowser';
import { AddColumnModal } from './diagram/AddColumnModal';

interface ColumnItem {
  name: string;
  nativeType: string;
  dataKind: string;
  nullable: boolean;
  defaultValue: string | null;
  isAutoIncrement: boolean;
  ordinalPosition: number;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

interface ForeignKeyItem {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: string;
  onUpdate: string | null;
}

interface IndexItem {
  name: string;
  columns: string[];
  isUnique: boolean;
  type: string;
}

interface TableInspectorProps {
  connectionId: string;
  schema: string;
  table: string;
}

export const TableInspector: React.FC<TableInspectorProps> = ({
  connectionId,
  schema,
  table,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'columns' | 'data' | 'keys' | 'indexes' | 'ddl'>('columns');
  const [ddlCopied, setDdlCopied] = useState(false);
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery(TABLE_DETAILS_QUERY, {
    variables: { connectionId, schema, table },
    skip: !connectionId || !table,
    fetchPolicy: 'cache-and-network',
  });

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-[#8b949e] space-y-2 bg-[#0d1117]">
        <Loader2 className="w-8 h-8 text-[#58a6ff] animate-spin" />
        <span className="text-xs font-mono">Inspecting table schema & relationships...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-[#f85149] space-y-2 text-center bg-[#0d1117]">
        <span className="text-sm font-semibold">Failed to inspect table metadata</span>
        <span className="text-xs text-[#8b949e] font-mono">{error.message}</span>
      </div>
    );
  }

  const tableDetails = data?.tableDetails;
  if (!tableDetails) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-[#8b949e] text-center font-mono text-xs bg-[#0d1117]">
        <TableIcon className="w-8 h-8 mb-2 opacity-40 text-[#58a6ff]" />
        <p>Select a table in the Navigator to inspect columns and preview data</p>
      </div>
    );
  }

  const columns: ColumnItem[] = tableDetails.columns || [];
  const primaryKey: string[] = tableDetails.primaryKey || [];
  const foreignKeys: ForeignKeyItem[] = tableDetails.foreignKeys || [];
  const indexes: IndexItem[] = tableDetails.indexes || [];

  // Generate synthetic CREATE TABLE DDL
  const generateDdl = () => {
    let ddl = `CREATE TABLE ${schema}.${table} (\n`;
    const colDefs = columns.map((col) => {
      let def = `  ${col.name} ${col.nativeType.toUpperCase()}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      if (col.isAutoIncrement) def += ' AUTO_INCREMENT';
      return def;
    });

    if (primaryKey.length > 0) {
      colDefs.push(`  PRIMARY KEY (${primaryKey.join(', ')})`);
    }

    foreignKeys.forEach((fk) => {
      colDefs.push(
        `  CONSTRAINT ${fk.name} FOREIGN KEY (${fk.columns.join(', ')}) REFERENCES ${fk.referencedTable} (${fk.referencedColumns.join(', ')}) ON DELETE ${fk.onDelete}`,
      );
    });

    ddl += colDefs.join(',\n');
    ddl += '\n);';
    return ddl;
  };

  const handleCopyDdl = () => {
    void navigator.clipboard.writeText(generateDdl());
    setDdlCopied(true);
    setTimeout(() => setDdlCopied(false), 1500);
  };

  const getDataKindBadge = (kind: string) => {
    switch (kind) {
      case 'NUMERIC':
        return 'bg-[#1f6feb]/20 text-[#58a6ff] border-[#388bfd]/30';
      case 'STRING':
        return 'bg-[#238636]/20 text-[#3fb950] border-[#2ea043]/30';
      case 'BOOLEAN':
        return 'bg-[#8957e5]/20 text-[#bc8cff] border-[#8957e5]/30';
      case 'DATETIME':
        return 'bg-[#d29922]/20 text-[#d29922] border-[#d29922]/30';
      case 'JSON':
        return 'bg-[#00758f]/20 text-[#38bdf8] border-[#00758f]/30';
      default:
        return 'bg-[#21262d] text-[#8b949e] border-[#30363d]';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117] overflow-hidden select-text font-sans text-[#c9d1d9]">
      {/* MySQL Workbench Style Table Header */}
      <div className="p-3.5 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-[#58a6ff]/10 text-[#58a6ff] border border-[#388bfd]/30 flex items-center justify-center">
            <TableIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-[#8b949e]">{schema}.</span>
              <h2 className="text-sm font-bold text-white font-mono">{table}</h2>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                {tableDetails.kind}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-[#8b949e] mt-0.5 font-mono">
              <span>{columns.length} columns</span>
              <span>•</span>
              <span className="text-[#d29922]">
                {primaryKey.length > 0 ? `PK: (${primaryKey.join(', ')})` : 'No PK'}
              </span>
              <span>•</span>
              <span className="text-[#38bdf8]">{foreignKeys.length} FK relations</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddColumnModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-xs font-semibold text-white shadow-sm transition-all"
            title="Add a new column to this table"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Column</span>
          </button>
          <button
            onClick={() =>
              navigate(
                `/editor?connectionId=${connectionId}&sql=${encodeURIComponent(
                  `SELECT * FROM ${schema}.${table} LIMIT 1000;\n`,
                )}`,
              )
            }
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-xs font-medium text-white border border-[#30363d] transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-[#d29922] fill-current" />
            <span>Open in SQL Tab</span>
          </button>
          <button
            onClick={() => navigate(`/diagram?connectionId=${connectionId}&schema=${schema}`)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold text-white border border-[#30363d] transition-colors"
          >
            <GitFork className="w-3.5 h-3.5 text-[#bc8cff]" />
            <span>EER Model</span>
          </button>
        </div>
      </div>

      {/* MySQL Workbench Inspector Tab Navigation */}
      <div className="px-3 border-b border-[#30363d] bg-[#161b22] flex items-center space-x-2 text-xs font-medium flex-shrink-0">
        <button
          onClick={() => setActiveTab('columns')}
          className={`py-2 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
            activeTab === 'columns'
              ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <ListTree className="w-3.5 h-3.5" />
          <span>Columns ({columns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('data')}
          className={`py-2 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
            activeTab === 'data'
              ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>Data Preview</span>
        </button>

        <button
          onClick={() => setActiveTab('indexes')}
          className={`py-2 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
            activeTab === 'indexes'
              ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Indexes ({indexes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('keys')}
          className={`py-2 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
            activeTab === 'keys'
              ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5 text-[#d29922]" />
          <span>Foreign Keys ({foreignKeys.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ddl')}
          className={`py-2 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
            activeTab === 'ddl'
              ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-[#7ee787]" />
          <span>DDL Script</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className={`flex-1 ${activeTab === 'data' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto p-4'}`}>
        {activeTab === 'columns' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-[#8b949e]">
                {columns.length} columns defined on <span className="font-mono text-white font-semibold">{schema}.{table}</span>
              </span>
              <button
                onClick={() => setIsAddColumnModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-xs font-semibold text-white shadow-sm transition-all"
                title="Add a new column to this table"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Column</span>
              </button>
            </div>
            <div className="rounded border border-[#30363d] overflow-x-auto bg-[#161b22]">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#30363d] bg-[#0d1117] text-[#8b949e] uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-4 min-w-[160px]">Column Name</th>
                    <th className="py-2.5 px-4 min-w-[120px]">Data Type</th>
                    <th className="py-2.5 px-4 min-w-[100px]">Category</th>
                    <th className="py-2.5 px-4 w-16 text-center">PK</th>
                    <th className="py-2.5 px-4 w-24 text-center">Not Null</th>
                    <th className="py-2.5 px-4 min-w-[120px]">Default</th>
                    <th className="py-2.5 px-4 w-24">Extra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] font-mono">
                  {columns.map((col) => (
                    <tr key={col.name} className="hover:bg-[#21262d] transition-colors">
                      <td className="py-2 px-3 text-center text-[#8b949e] text-[11px]">
                        {col.ordinalPosition}
                      </td>
                      <td className="py-2 px-4 font-medium text-white flex items-center space-x-2">
                        {col.isPrimaryKey && (
                          <span title="Primary Key">
                            <Key className="w-3.5 h-3.5 text-[#d29922] flex-shrink-0" />
                          </span>
                        )}
                        {col.isForeignKey && (
                          <span title="Foreign Key">
                            <Link2 className="w-3.5 h-3.5 text-[#38bdf8] flex-shrink-0" />
                          </span>
                        )}
                        <span className={col.isPrimaryKey ? 'text-[#d29922] font-bold' : ''}>
                          {col.name}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-[#c9d1d9]">{col.nativeType}</td>
                      <td className="py-2 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getDataKindBadge(
                            col.dataKind,
                          )}`}
                        >
                          {col.dataKind}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        {col.isPrimaryKey ? (
                          <span className="text-[#d29922] font-bold">YES</span>
                        ) : (
                          <span className="text-[#30363d]">-</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {!col.nullable ? (
                          <span className="text-[#3fb950] font-semibold">YES</span>
                        ) : (
                          <span className="text-[#8b949e]">NO</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-[#8b949e] truncate max-w-[120px]">
                        {col.defaultValue || 'null'}
                      </td>
                      <td className="py-2 px-4 text-[#8b949e]">
                        {col.isAutoIncrement ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#238636]/20 text-[#3fb950] border border-[#2ea043]/30 text-[10px]">
                            auto_inc
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <TableDataBrowser
            connectionId={connectionId}
            schema={schema}
            tableName={table}
          />
        )}

        {activeTab === 'indexes' && (
          <div className="rounded border border-[#30363d] overflow-x-auto bg-[#161b22]">
            <table className="w-full text-left text-xs border-collapse font-mono min-w-[500px]">
              <thead>
                <tr className="border-b border-[#30363d] bg-[#0d1117] text-[#8b949e] uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-4">Index Name</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Unique</th>
                  <th className="py-2.5 px-4">Columns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]">
                {indexes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[#8b949e] italic">
                      No explicit indexes found.
                    </td>
                  </tr>
                ) : (
                  indexes.map((idx) => (
                    <tr key={idx.name} className="hover:bg-[#21262d] transition-colors">
                      <td className="py-2.5 px-4 text-white font-medium">{idx.name}</td>
                      <td className="py-2.5 px-4 text-[#8b949e]">{idx.type}</td>
                      <td className="py-2.5 px-4">
                        {idx.isUnique ? (
                          <span className="px-2 py-0.5 rounded bg-[#238636]/20 text-[#3fb950] border border-[#2ea043]/30 text-[10px] font-semibold">
                            UNIQUE
                          </span>
                        ) : (
                          <span className="text-[#8b949e] text-[10px]">NON-UNIQUE</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[#58a6ff]">{idx.columns.join(', ')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'keys' && (
          <div className="space-y-3">
            {foreignKeys.length === 0 ? (
              <div className="p-6 rounded bg-[#161b22] border border-[#30363d] text-center text-xs text-[#8b949e] italic">
                No foreign key relationships configured on this table.
              </div>
            ) : (
              foreignKeys.map((fk) => (
                <div
                  key={fk.name}
                  className="p-3.5 rounded bg-[#161b22] border border-[#30363d] space-y-2 font-mono text-xs"
                >
                  <div className="flex items-between justify-between">
                    <span className="text-[#38bdf8] font-bold">{fk.name}</span>
                    <span className="text-[10px] text-[#8b949e]">
                      ON DELETE: <span className="text-white font-semibold">{fk.onDelete}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#0d1117] p-2.5 rounded border border-[#21262d]">
                    <span className="text-white font-semibold">{table}</span>
                    <span className="text-[#8b949e]">({fk.columns.join(', ')})</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#58a6ff] flex-shrink-0" />
                    <span className="text-[#38bdf8] font-semibold">{fk.referencedTable}</span>
                    <span className="text-[#8b949e]">({fk.referencedColumns.join(', ')})</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'ddl' && (
          <div className="rounded border border-[#30363d] overflow-hidden bg-[#0d1117] flex flex-col">
            <div className="p-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
              <span className="text-xs font-mono text-[#8b949e]">CREATE TABLE DDL (Autogenerated)</span>
              <button
                onClick={handleCopyDdl}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-xs text-[#c9d1d9] transition-colors border border-[#30363d]"
              >
                {ddlCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#3fb950]" />
                    <span className="text-[#3fb950]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy DDL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 font-mono text-xs text-[#7ee787] overflow-x-auto leading-relaxed">
              {generateDdl()}
            </pre>
          </div>
        )}
      </div>

      {/* Add Column Modal */}
      <AddColumnModal
        isOpen={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        connectionId={connectionId}
        schema={schema}
        tableName={table}
        onColumnAdded={() => {
          void refetch();
        }}
      />
    </div>
  );
};
