import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  X,
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

interface CustomColumn {
  id: string;
  name: string;
  nativeType: string;
  nullable: boolean;
  defaultValue: string;
  isUnique: boolean;
}

interface AddTableModalProps {
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

export const AddTableModal: React.FC<AddTableModalProps> = ({
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

  if (!isOpen) return null;

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

    // Validate custom column names
    const filteredCols = columns
      .filter((c) => c.name.trim().length > 0)
      .map((c) => ({
        name: c.name.trim().toLowerCase(),
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
            tableName: tableName.trim().toLowerCase(),
            primaryKeyColumn: pkColumn.trim().toLowerCase() || 'id',
            primaryKeyType: pkType,
            columns: filteredCols.length > 0 ? filteredCols : undefined,
            autoTimestamps,
            diagramId,
            positionX: 150 + Math.floor(Math.random() * 200),
            positionY: 150 + Math.floor(Math.random() * 200),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-[#c9d1d9] font-sans flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Create New Table</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#21262d] text-[#58a6ff] border border-[#30363d]">
                  {schema}
                </span>
              </h3>
              <p className="text-[11px] text-[#8b949e]">
                Define table name, primary key, custom fields, and automatic timestamps.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs font-sans flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#2b0f14]/60 border border-[#f85149]/40 text-[#ff7b72] flex items-start space-x-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Table Name */}
          <div>
            <label className="block text-[#c9d1d9] font-semibold mb-1.5">
              Table Name <span className="text-[#f85149]">*</span>
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g. customers, products, audit_logs"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white font-mono placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
              required
              autoFocus
            />
          </div>

          {/* Primary Key Section */}
          <div className="p-3.5 rounded-xl bg-[#0d1117]/60 border border-[#30363d] space-y-2.5">
            <div className="flex items-center space-x-1.5 text-white font-semibold">
              <KeyRound className="w-3.5 h-3.5 text-[#d29922]" />
              <span>Primary Key Configuration</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8b949e] text-[11px] mb-1">Column Name</label>
                <input
                  type="text"
                  value={pkColumn}
                  onChange={(e) => setPkColumn(e.target.value)}
                  placeholder="id"
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-2.5 py-1.5 text-white font-mono placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div>
                <label className="block text-[#8b949e] text-[11px] mb-1">Key Generator Strategy</label>
                <select
                  value={pkType}
                  onChange={(e) => setPkType(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-[#58a6ff]"
                >
                  <option value="SERIAL">Auto Increment (SERIAL / INT)</option>
                  <option value="UUID">UUID (gen_random_uuid)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Custom Fields Generator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-white font-semibold">
                <Layers className="w-3.5 h-3.5 text-[#58a6ff]" />
                <span>Custom Fields & Columns ({columns.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddColumn}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] border border-[#30363d] hover:border-[#58a6ff]/40 text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Field</span>
              </button>
            </div>

            {columns.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#30363d] text-center text-[#8b949e]">
                No extra columns added yet. Click <span className="text-[#58a6ff] font-semibold">"+ Add Field"</span> to define attributes for this table.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {columns.map((col, index) => (
                  <div
                    key={col.id}
                    className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] flex flex-wrap sm:flex-nowrap items-center gap-2"
                  >
                    <span className="text-[10px] text-[#8b949e] font-mono w-4">{index + 1}.</span>
                    
                    {/* Name */}
                    <input
                      type="text"
                      placeholder="field_name"
                      value={col.name}
                      onChange={(e) => handleUpdateColumn(col.id, { name: e.target.value })}
                      className="flex-1 min-w-[120px] bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-white font-mono text-xs placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                    />

                    {/* Native Type */}
                    <select
                      value={col.nativeType}
                      onChange={(e) => handleUpdateColumn(col.id, { nativeType: e.target.value })}
                      className="w-32 bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#58a6ff]"
                    >
                      {COMMON_DATA_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>

                    {/* Default value */}
                    <input
                      type="text"
                      placeholder="default"
                      value={col.defaultValue}
                      onChange={(e) => handleUpdateColumn(col.id, { defaultValue: e.target.value })}
                      className="w-24 bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-white font-mono text-xs placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                    />

                    {/* Options: Nullable & Unique */}
                    <div className="flex items-center space-x-2 px-1">
                      <label className="flex items-center space-x-1 cursor-pointer" title="Allow NULL values">
                        <input
                          type="checkbox"
                          checked={col.nullable}
                          onChange={(e) => handleUpdateColumn(col.id, { nullable: e.target.checked })}
                          className="rounded bg-[#161b22] border-[#30363d] text-[#58a6ff] focus:ring-0"
                        />
                        <span className="text-[10px] text-[#8b949e]">Null</span>
                      </label>

                      <label className="flex items-center space-x-1 cursor-pointer" title="Enforce UNIQUE constraint">
                        <input
                          type="checkbox"
                          checked={col.isUnique}
                          onChange={(e) => handleUpdateColumn(col.id, { isUnique: e.target.checked })}
                          className="rounded bg-[#161b22] border-[#30363d] text-[#58a6ff] focus:ring-0"
                        />
                        <span className="text-[10px] text-[#8b949e]">Uniq</span>
                      </label>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(col.id)}
                      className="p-1 rounded text-[#8b949e] hover:text-[#f85149] hover:bg-[#21262d] transition-colors"
                      title="Remove Column"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auto-generate Timestamps Toggle */}
          <div className="p-3.5 rounded-xl bg-[#0d1117]/60 border border-[#30363d] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-white text-xs block">
                  Auto-generate created_at & updated_at
                </span>
                <span className="text-[11px] text-[#8b949e]">
                  Automatically creates standard audit timestamps with DEFAULT CURRENT_TIMESTAMP.
                </span>
              </div>
            </div>

            <input
              type="checkbox"
              checked={autoTimestamps}
              onChange={(e) => setAutoTimestamps(e.target.checked)}
              className="w-4 h-4 rounded bg-[#161b22] border-[#30363d] text-[#238636] focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#30363d] flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Table...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Table with {columns.length + 1 + (autoTimestamps ? 2 : 0)} Fields</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
