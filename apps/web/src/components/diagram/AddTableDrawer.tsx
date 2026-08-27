import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Table as TableIcon,
  Loader2,
  Plus,
  AlertCircle,
  Trash2,
  Clock,
  KeyRound,
  Layers,
  Sparkles
} from 'lucide-react';
import { CREATE_TABLE_MUTATION } from '../../graphql/schemaDesigner';
import { Drawer } from '../ui/drawer';

interface CustomColumn {
  id: string;
  name: string;
  nativeType: string;
  nullable: boolean;
  defaultValue: string;
  isUnique: boolean;
}

export interface AddTableDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  schema: string;
  diagramId?: string;
  onTableCreated?: (diagramView: any) => void;
}

const COMMON_DATA_TYPES = [
  { label: 'VARCHAR(255)', value: 'VARCHAR(255)' },
  { label: 'TEXT', value: 'TEXT' },
  { label: 'INTEGER', value: 'INTEGER' },
  { label: 'BIGINT', value: 'BIGINT' },
  { label: 'DECIMAL(10,2)', value: 'DECIMAL(10,2)' },
  { label: 'BOOLEAN', value: 'BOOLEAN' },
  { label: 'JSON / JSONB', value: 'JSON' },
  { label: 'DATE', value: 'DATE' },
  { label: 'TIMESTAMP', value: 'TIMESTAMP' },
  { label: 'UUID', value: 'UUID' },
];

export const AddTableDrawer: React.FC<AddTableDrawerProps> = ({
  isOpen,
  onClose,
  connectionId,
  schema,
  diagramId,
  onTableCreated,
}) => {
  const [tableName, setTableName] = useState('');
  const [pkColumn, setPkColumn] = useState('id');
  const [pkType, setPkType] = useState('SERIAL');
  const [autoTimestamps, setAutoTimestamps] = useState(true);
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [createTableMutation, { loading }] = useMutation(CREATE_TABLE_MUTATION);

  const handleAddColumn = () => {
    setColumns((prev) => [
      ...prev,
      {
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        nativeType: 'VARCHAR(255)',
        nullable: true,
        defaultValue: '',
        isUnique: false,
      },
    ]);
  };

  const handleRemoveColumn = (id: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== id));
  };

  const handleUpdateColumn = (id: string, updates: Partial<CustomColumn>) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, ...updates } : col)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName.trim()) {
      setErrorMsg('Table name is required');
      return;
    }

    const filteredCols = columns
      .filter((c) => c.name.trim().length > 0)
      .map((c) => ({
        name: c.name.trim(),
        nativeType: c.nativeType,
        nullable: c.nullable,
        defaultValue: c.defaultValue.trim() || undefined,
        isUnique: c.isUnique,
      }));

    setErrorMsg(null);

    try {
      const res = await createTableMutation({
        variables: {
          input: {
            connectionId,
            schema,
            tableName: tableName.trim(),
            primaryKeyName: pkColumn.trim() || 'id',
            primaryKeyType: pkType,
            columns: filteredCols,
            autoTimestamps,
            diagramId,
          },
        },
      });

      if (res.data?.createTable) {
        onTableCreated?.(res.data.createTable);
        setTableName('');
        setColumns([]);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create table');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Database Table"
      description={`Designing table schema on database schema: ${schema || 'public'}`}
      icon={<TableIcon className="w-5 h-5 text-[#58a6ff]" />}
      width="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !tableName.trim()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing DDL...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Create Table</span>
              </>
            )}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#2b0f14]/50 border border-[#f85149]/40 text-[#ff7b72] flex items-start space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Table Name */}
        <div>
          <label className="block text-[#8b949e] font-semibold mb-1">
            Table Name <span className="text-[#f85149]">*</span>
          </label>
          <input
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="e.g. customers, products, transactions"
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#58a6ff]"
            required
            autoFocus
          />
        </div>

        {/* Primary Key Settings */}
        <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3">
          <div className="flex items-center space-x-2 text-[#d29922] font-semibold">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Primary Key Configuration</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8b949e] mb-1">PK Column Name</label>
              <input
                type="text"
                value={pkColumn}
                onChange={(e) => setPkColumn(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-[#d29922]"
              />
            </div>
            <div>
              <label className="block text-[#8b949e] mb-1">PK Strategy</label>
              <select
                value={pkType}
                onChange={(e) => setPkType(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-[#d29922]"
              >
                <option value="SERIAL">Auto-Increment (SERIAL / INT)</option>
                <option value="UUID">UUID v4 (Globally Unique)</option>
                <option value="BIGSERIAL">BIGSERIAL (64-bit int)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Columns Builder */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[#8b949e] font-semibold uppercase text-[10px] tracking-wider">
              Columns ({columns.length})
            </label>
            <button
              type="button"
              onClick={handleAddColumn}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] hover:text-white border border-[#30363d] transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Field</span>
            </button>
          </div>

          {columns.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-[#30363d] text-center text-[#8b949e]">
              No custom fields added yet. Click "+ Add Field" to define schema columns.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="p-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) => handleUpdateColumn(col.id, { name: e.target.value })}
                      placeholder="column_name"
                      className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#58a6ff]"
                    />
                    <select
                      value={col.nativeType}
                      onChange={(e) =>
                        handleUpdateColumn(col.id, { nativeType: e.target.value })
                      }
                      className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#58a6ff]"
                    >
                      {COMMON_DATA_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(col.id)}
                      className="p-1 text-[#8b949e] hover:text-[#f85149] rounded hover:bg-[#21262d]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-4 text-[11px] text-[#8b949e]">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={col.nullable}
                        onChange={(e) =>
                          handleUpdateColumn(col.id, { nullable: e.target.checked })
                        }
                        className="rounded border-[#30363d] bg-[#161b22] text-[#58a6ff]"
                      />
                      <span>Nullable</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={col.isUnique}
                        onChange={(e) =>
                          handleUpdateColumn(col.id, { isUnique: e.target.checked })
                        }
                        className="rounded border-[#30363d] bg-[#161b22] text-[#58a6ff]"
                      />
                      <span>Unique</span>
                    </label>

                    <input
                      type="text"
                      value={col.defaultValue}
                      onChange={(e) =>
                        handleUpdateColumn(col.id, { defaultValue: e.target.value })
                      }
                      placeholder="Default val (optional)"
                      className="flex-1 bg-[#161b22] border border-[#30363d] rounded px-2 py-0.5 text-white font-mono text-[10px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto Timestamps Checkbox */}
        <label className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-between cursor-pointer">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />
            <div>
              <div className="font-semibold text-white">Auto Timestamps</div>
              <div className="text-[10px] text-[#8b949e]">
                Automatically adds <span className="font-mono text-[#38bdf8]">created_at</span> and <span className="font-mono text-[#38bdf8]">updated_at</span>
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoTimestamps}
            onChange={(e) => setAutoTimestamps(e.target.checked)}
            className="w-4 h-4 rounded border-[#30363d] bg-[#161b22] text-[#58a6ff]"
          />
        </label>
      </form>
    </Drawer>
  );
};

export const AddTableModal = AddTableDrawer;
