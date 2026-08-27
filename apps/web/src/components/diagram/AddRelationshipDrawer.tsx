import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import {
  GitFork,
  Loader2,
  AlertCircle,
  Link2,
  ArrowRight,
  Boxes,
  FolderTree,
  Check
} from 'lucide-react';
import { ADD_FOREIGN_KEY_MUTATION, CREATE_TABLE_MUTATION } from '../../graphql/schemaDesigner';
import { Drawer } from '../ui/drawer';

interface DiagramTable {
  id: string;
  tableName: string;
  schema: string;
  columns: { name: string; nativeType: string; isPrimaryKey: boolean }[];
}

export type RelationshipKind = 'ONE_TO_MANY' | 'ONE_TO_ONE' | 'IDENTIFYING_CONTAINER' | 'MANY_TO_MANY';

export interface AddRelationshipDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  schema: string;
  tables: DiagramTable[];
  initialSourceTable?: string;
  initialTargetTable?: string;
  initialKind?: RelationshipKind;
  diagramId?: string;
  onRelationshipCreated?: (diagramView: any) => void;
}

export const AddRelationshipDrawer: React.FC<AddRelationshipDrawerProps> = ({
  isOpen,
  onClose,
  connectionId,
  schema,
  tables,
  initialSourceTable,
  initialTargetTable,
  initialKind = 'ONE_TO_MANY',
  diagramId,
  onRelationshipCreated,
}) => {
  const [relKind, setRelKind] = useState<RelationshipKind>(initialKind);
  const [sourceTable, setSourceTable] = useState('');
  const [sourceColumn, setSourceColumn] = useState('');
  const [referencedTable, setReferencedTable] = useState('');
  const [referencedColumn, setReferencedColumn] = useState('');
  const [constraintName, setConstraintName] = useState('');
  const [onDelete, setOnDelete] = useState('CASCADE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Junction table state for N:M Many-to-Many
  const [junctionTableName, setJunctionTableName] = useState('');

  const [addForeignKeyMutation, { loading: loadingFk }] = useMutation(ADD_FOREIGN_KEY_MUTATION);
  const [createTableMutation, { loading: loadingTable }] = useMutation(CREATE_TABLE_MUTATION);

  const loading = loadingFk || loadingTable;

  useEffect(() => {
    if (isOpen) {
      const src = initialSourceTable || (tables[0]?.tableName ?? '');
      const tgt = initialTargetTable || (tables[1]?.tableName ?? tables[0]?.tableName ?? '');
      setSourceTable(src);
      setReferencedTable(tgt);
      setRelKind(initialKind);

      const srcObj = tables.find((t) => t.tableName === src);
      const tgtObj = tables.find((t) => t.tableName === tgt);

      // Default FK column on source
      const defSrcCol = srcObj?.columns.find((c) => !c.isPrimaryKey)?.name || srcObj?.columns[0]?.name || 'id';
      setSourceColumn(defSrcCol);

      // Default PK on target
      const tgtPk = tgtObj?.columns.find((c) => c.isPrimaryKey)?.name || tgtObj?.columns[0]?.name || 'id';
      setReferencedColumn(tgtPk);

      setConstraintName(`fk_${src}_${tgt}`);
      setJunctionTableName(`${src}_${tgt}`);
    }
  }, [isOpen, initialSourceTable, initialTargetTable, initialKind, tables]);

  const currentSourceTableObj = tables.find((t) => t.tableName === sourceTable);
  const currentReferencedTableObj = tables.find((t) => t.tableName === referencedTable);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!sourceTable || !referencedTable) {
      setErrorMsg('Please select both tables for the relationship');
      return;
    }

    try {
      if (relKind === 'MANY_TO_MANY') {
        const jName = junctionTableName.trim() || `${sourceTable}_${referencedTable}`;
        const srcPk = currentSourceTableObj?.columns.find((c) => c.isPrimaryKey)?.name || 'id';
        const tgtPk = currentReferencedTableObj?.columns.find((c) => c.isPrimaryKey)?.name || 'id';

        const res = await createTableMutation({
          variables: {
            input: {
              connectionId,
              schema,
              tableName: jName,
              primaryKeyType: 'SERIAL',
              columns: [
                { name: `${sourceTable}_id`, nativeType: 'INT', nullable: false },
                { name: `${referencedTable}_id`, nativeType: 'INT', nullable: false },
              ],
              autoTimestamps: true,
              diagramId,
            },
          },
        });

        if (res.data?.createTable) {
          await addForeignKeyMutation({
            variables: {
              input: {
                connectionId,
                schema,
                tableName: jName,
                columnName: `${sourceTable}_id`,
                referencedTable: sourceTable,
                referencedColumn: srcPk,
                onDelete: 'CASCADE',
                diagramId,
              },
            },
          });

          const finalRes = await addForeignKeyMutation({
            variables: {
              input: {
                connectionId,
                schema,
                tableName: jName,
                columnName: `${referencedTable}_id`,
                referencedTable: referencedTable,
                referencedColumn: tgtPk,
                onDelete: 'CASCADE',
                diagramId,
              },
            },
          });

          if (finalRes.data?.addForeignKey) {
            onRelationshipCreated?.(finalRes.data.addForeignKey);
          } else {
            onRelationshipCreated?.(res.data.createTable);
          }
          onClose();
        }
      } else {
        const res = await addForeignKeyMutation({
          variables: {
            input: {
              connectionId,
              schema,
              sourceTable,
              sourceColumn,
              referencedTable,
              referencedColumn,
              constraintName: constraintName.trim() || undefined,
              onDelete: relKind === 'IDENTIFYING_CONTAINER' ? 'CASCADE' : onDelete,
              diagramId,
            },
          },
        });

        if (res.data?.addForeignKey) {
          onRelationshipCreated?.(res.data.addForeignKey);
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create relationship');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Relationship Designer"
      description="Define foreign keys, cardinalities & container relations"
      icon={<GitFork className="w-5 h-5 text-[#38bdf8]" />}
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
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating Relationship...</span>
              </>
            ) : (
              <>
                <GitFork className="w-3.5 h-3.5" />
                <span>
                  {relKind === 'MANY_TO_MANY'
                    ? 'Create Junction & Link Tables'
                    : 'Create Relationship'}
                </span>
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

        {/* Relationship Cardinality Cards */}
        <div>
          <label className="block text-[#8b949e] font-semibold mb-2 uppercase text-[10px] tracking-wider">
            Select Cardinality
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1:N Non-Identifying */}
            <button
              type="button"
              onClick={() => {
                setRelKind('ONE_TO_MANY');
                setOnDelete('CASCADE');
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                relKind === 'ONE_TO_MANY'
                  ? 'border-[#38bdf8] bg-[#38bdf8]/10 text-white shadow-md'
                  : 'border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]/50 text-[#8b949e]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5 font-bold font-mono text-xs text-[#38bdf8]">
                  <GitFork className="w-3.5 h-3.5" />
                  <span>1 : N (One-to-Many)</span>
                </div>
                {relKind === 'ONE_TO_MANY' && <Check className="w-3.5 h-3.5 text-[#38bdf8]" />}
              </div>
              <p className="text-[10px] text-[#8b949e] leading-snug">
                Standard foreign key. Child references Parent (Dashed connector).
              </p>
            </button>

            {/* 1:N Identifying Container */}
            <button
              type="button"
              onClick={() => {
                setRelKind('IDENTIFYING_CONTAINER');
                setOnDelete('CASCADE');
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                relKind === 'IDENTIFYING_CONTAINER'
                  ? 'border-[#3fb950] bg-[#3fb950]/10 text-white shadow-md'
                  : 'border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]/50 text-[#8b949e]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5 font-bold font-mono text-xs text-[#3fb950]">
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>1 : N Identifying</span>
                </div>
                {relKind === 'IDENTIFYING_CONTAINER' && <Check className="w-3.5 h-3.5 text-[#3fb950]" />}
              </div>
              <p className="text-[10px] text-[#8b949e] leading-snug">
                Child lifecycle contained in Parent. Strict Cascade Delete (Solid connector).
              </p>
            </button>

            {/* 1:1 One-to-One */}
            <button
              type="button"
              onClick={() => {
                setRelKind('ONE_TO_ONE');
                setOnDelete('CASCADE');
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                relKind === 'ONE_TO_ONE'
                  ? 'border-[#bc8cff] bg-[#bc8cff]/10 text-white shadow-md'
                  : 'border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]/50 text-[#8b949e]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5 font-bold font-mono text-xs text-[#bc8cff]">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>1 : 1 (One-to-One)</span>
                </div>
                {relKind === 'ONE_TO_ONE' && <Check className="w-3.5 h-3.5 text-[#bc8cff]" />}
              </div>
              <p className="text-[10px] text-[#8b949e] leading-snug">
                Unique foreign key. Exactly one matching record between Table A and Table B.
              </p>
            </button>

            {/* N:M Many-to-Many */}
            <button
              type="button"
              onClick={() => {
                setRelKind('MANY_TO_MANY');
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                relKind === 'MANY_TO_MANY'
                  ? 'border-[#d29922] bg-[#d29922]/10 text-white shadow-md'
                  : 'border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]/50 text-[#8b949e]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5 font-bold font-mono text-xs text-[#d29922]">
                  <Boxes className="w-3.5 h-3.5" />
                  <span>N : M (Many-to-Many)</span>
                </div>
                {relKind === 'MANY_TO_MANY' && <Check className="w-3.5 h-3.5 text-[#d29922]" />}
              </div>
              <p className="text-[10px] text-[#8b949e] leading-snug">
                Provisions a Junction / Bridge table with dual foreign key constraints.
              </p>
            </button>
          </div>
        </div>

        {/* Table Selectors */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[#8b949e] font-semibold mb-1">
              {relKind === 'MANY_TO_MANY' ? 'Table A' : 'Child / Source Table'}
            </label>
            <select
              value={sourceTable}
              onChange={(e) => {
                setSourceTable(e.target.value);
                setConstraintName(`fk_${e.target.value}_${referencedTable}`);
                setJunctionTableName(`${e.target.value}_${referencedTable}`);
              }}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#58a6ff]"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.tableName}>
                  {t.tableName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#8b949e] font-semibold mb-1">
              {relKind === 'MANY_TO_MANY' ? 'Table B' : 'Parent / Referenced Table'}
            </label>
            <select
              value={referencedTable}
              onChange={(e) => {
                setReferencedTable(e.target.value);
                setConstraintName(`fk_${sourceTable}_${e.target.value}`);
                setJunctionTableName(`${sourceTable}_${e.target.value}`);
              }}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#58a6ff]"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.tableName}>
                  {t.tableName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Conditional Fields */}
        {relKind === 'MANY_TO_MANY' ? (
          <div>
            <label className="block text-[#8b949e] font-semibold mb-1">
              Junction Table Name <span className="text-[#d29922]">*</span>
            </label>
            <input
              type="text"
              value={junctionTableName}
              onChange={(e) => setJunctionTableName(e.target.value)}
              placeholder="e.g. user_roles, order_items"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#d29922]"
              required
            />
            <p className="text-[10px] text-[#8b949e] mt-1">
              Workbench will automatically provision <span className="font-mono text-white">{junctionTableName || `${sourceTable}_${referencedTable}`}</span> with <span className="font-mono text-[#38bdf8]">{sourceTable}_id</span> and <span className="font-mono text-[#38bdf8]">{referencedTable}_id</span>.
            </p>
          </div>
        ) : (
          <>
            {/* Column Mapping */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8b949e] font-semibold mb-1">
                  FK Column on <span className="text-white">{sourceTable}</span>
                </label>
                <select
                  value={sourceColumn}
                  onChange={(e) => setSourceColumn(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#58a6ff]"
                >
                  {currentSourceTableObj?.columns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.nativeType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#8b949e] font-semibold mb-1">
                  Referenced PK on <span className="text-white">{referencedTable}</span>
                </label>
                <select
                  value={referencedColumn}
                  onChange={(e) => setReferencedColumn(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#58a6ff]"
                >
                  {currentReferencedTableObj?.columns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} {col.isPrimaryKey ? '(PK)' : ''} ({col.nativeType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Constraint & Cascade Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8b949e] font-semibold mb-1">Constraint Name</label>
                <input
                  type="text"
                  value={constraintName}
                  onChange={(e) => setConstraintName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div>
                <label className="block text-[#8b949e] font-semibold mb-1">ON DELETE Action</label>
                <select
                  value={onDelete}
                  onChange={(e) => setOnDelete(e.target.value)}
                  disabled={relKind === 'IDENTIFYING_CONTAINER'}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#58a6ff] disabled:opacity-60"
                >
                  <option value="CASCADE">CASCADE (Delete children)</option>
                  <option value="RESTRICT">RESTRICT (Prevent delete)</option>
                  <option value="SET NULL">SET NULL</option>
                  <option value="NO ACTION">NO ACTION</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Visual Relationship Preview */}
        <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-between font-mono text-xs">
          <div className="flex items-center space-x-2 text-[#38bdf8]">
            <span className="font-bold">{sourceTable}</span>
            {relKind !== 'MANY_TO_MANY' && (
              <span className="text-[10px] text-[#8b949e]">({sourceColumn})</span>
            )}
          </div>

          <div className="flex flex-col items-center px-3">
            <span className="text-[9px] uppercase font-bold text-[#d29922]">
              {relKind === 'ONE_TO_MANY'
                ? '1 : N (Non-Identifying)'
                : relKind === 'IDENTIFYING_CONTAINER'
                ? '1 : N (Identifying Container)'
                : relKind === 'ONE_TO_ONE'
                ? '1 : 1 (One-to-One)'
                : 'N : M (Many-to-Many)'}
            </span>
            <div className="w-20 h-px bg-[#30363d] relative my-1">
              <ArrowRight className="w-3 h-3 text-[#58a6ff] absolute -top-1.5 right-0" />
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[#3fb950]">
            <span className="font-bold">{referencedTable}</span>
            {relKind !== 'MANY_TO_MANY' && (
              <span className="text-[10px] text-[#8b949e]">({referencedColumn})</span>
            )}
          </div>
        </div>
      </form>
    </Drawer>
  );
};

export const AddRelationshipModal = AddRelationshipDrawer;
