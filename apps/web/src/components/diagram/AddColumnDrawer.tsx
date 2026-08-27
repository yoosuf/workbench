import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Plus, Loader2, AlertCircle, ListTree, Sparkles } from 'lucide-react';
import { ADD_COLUMN_MUTATION } from '../../graphql/schemaDesigner';
import { Drawer } from '../ui/drawer';

export interface AddColumnDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  schema: string;
  tableName: string;
  diagramId?: string;
  onColumnAdded?: (diagramView: any) => void;
}

const COMMON_DATA_TYPES = [
  'VARCHAR(255)',
  'TEXT',
  'INT',
  'BIGINT',
  'BOOLEAN',
  'DECIMAL(10,2)',
  'TIMESTAMP',
  'DATE',
  'JSON',
  'UUID',
];

export const AddColumnDrawer: React.FC<AddColumnDrawerProps> = ({
  isOpen,
  onClose,
  connectionId,
  schema,
  tableName,
  diagramId,
  onColumnAdded,
}) => {
  const [columnName, setColumnName] = useState('');
  const [nativeType, setNativeType] = useState('VARCHAR(255)');
  const [customType, setCustomType] = useState('');
  const [nullable, setNullable] = useState(true);
  const [isPrimaryKey, setIsPrimaryKey] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [addColumnMutation, { loading }] = useMutation(ADD_COLUMN_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnName.trim()) {
      setErrorMsg('Column name is required');
      return;
    }
    setErrorMsg(null);

    const typeToUse = nativeType === 'CUSTOM' ? customType.trim() : nativeType;
    if (!typeToUse) {
      setErrorMsg('Please specify a data type');
      return;
    }

    try {
      const res = await addColumnMutation({
        variables: {
          input: {
            connectionId,
            schema,
            tableName,
            columnName: columnName.trim().toLowerCase(),
            nativeType: typeToUse,
            nullable,
            defaultValue: defaultValue.trim() || undefined,
            isPrimaryKey,
            diagramId,
          },
        },
      });

      if (res.data?.addColumn) {
        onColumnAdded?.(res.data.addColumn);
        setColumnName('');
        setDefaultValue('');
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add column');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add Column"
      description={`Table: ${schema || 'public'}.${tableName}`}
      icon={<ListTree className="w-5 h-5 text-[#3fb950]" />}
      width="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !columnName.trim()}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Adding Column...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Column</span>
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

        <div>
          <label className="block text-[#8b949e] font-semibold mb-1">
            Column Name <span className="text-[#f85149]">*</span>
          </label>
          <input
            type="text"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="e.g. email, status, total_amount"
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[#8b949e] font-semibold mb-1">
              Data Type
            </label>
            <select
              value={nativeType}
              onChange={(e) => setNativeType(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#58a6ff]"
            >
              {COMMON_DATA_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
              <option value="CUSTOM">Custom Type...</option>
            </select>
          </div>

          <div>
            <label className="block text-[#8b949e] font-semibold mb-1">
              Default Value
            </label>
            <input
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="e.g. 0, 'active', NOW()"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>
        </div>

        {nativeType === 'CUSTOM' && (
          <div>
            <label className="block text-[#8b949e] font-semibold mb-1">
              Custom Data Type String
            </label>
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="e.g. INET, NUMERIC(12,4)"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
              required
            />
          </div>
        )}

        <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={nullable}
              onChange={(e) => setNullable(e.target.checked)}
              className="rounded border-[#30363d] text-[#58a6ff] focus:ring-0 bg-[#161b22]"
            />
            <span className="text-[#c9d1d9]">Nullable (Allow NULL)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPrimaryKey}
              onChange={(e) => setIsPrimaryKey(e.target.checked)}
              className="rounded border-[#30363d] text-[#d29922] focus:ring-0 bg-[#161b22]"
            />
            <span className="text-[#d29922] font-semibold">Primary Key</span>
          </label>
        </div>
      </form>
    </Drawer>
  );
};

export const AddColumnModal = AddColumnDrawer;
