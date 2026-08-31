import React, { useRef, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  CheckCircle2, 
  Clock, 
  Database, 
  AlertTriangle, 
  Copy, 
  Check 
} from 'lucide-react';

interface VirtualizedResultGridProps {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
}

const COL_WIDTH = 190;
const ROW_NUM_WIDTH = 50;

export const VirtualizedResultGrid: React.FC<VirtualizedResultGridProps> = ({
  columns,
  rows,
  rowCount,
  executionTimeMs,
  truncated,
}) => {
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const formattedColumns = useMemo(() => {
    if (columns.length > 0) return columns;
    if (rows.length > 0 && rows[0]) return Object.keys(rows[0]);
    return [];
  }, [columns, rows]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 25,
  });

  const handleCopyCell = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  const totalTableWidth = useMemo(() => {
    return ROW_NUM_WIDTH + formattedColumns.length * COL_WIDTH;
  }, [formattedColumns]);

  const gridTemplateColumns = useMemo(() => {
    if (formattedColumns.length === 0) return `${ROW_NUM_WIDTH}px`;
    return `${ROW_NUM_WIDTH}px repeat(${formattedColumns.length}, ${COL_WIDTH}px)`;
  }, [formattedColumns]);

  if (formattedColumns.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#8b949e] bg-[#0d1117]">
        <CheckCircle2 className="w-8 h-8 text-[#3fb950] mb-2 opacity-80" />
        <p className="text-xs font-semibold text-[#c9d1d9]">Query executed successfully</p>
        <p className="text-[11px] text-[#8b949e] mt-0.5">
          {rowCount} row(s) affected in {executionTimeMs}ms
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0d1117] overflow-hidden font-mono select-text text-[#c9d1d9]">
      {/* Top Status & Metrics Bar */}
      <div className="h-8 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] select-none flex-shrink-0">
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-[#3fb950] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Success</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#8b949e]" />
            <span className="text-[#c9d1d9] font-medium">{executionTimeMs}ms</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-[#8b949e]" />
            <span className="text-[#c9d1d9] font-medium">{rowCount.toLocaleString()} rows</span>
          </span>
          {truncated && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#d29922] bg-[#d29922]/10 px-2 py-0.2 rounded border border-[#d29922]/30 text-[10px]">
                <AlertTriangle className="w-3 h-3" />
                <span>Capped at 10k rows</span>
              </span>
            </>
          )}
        </div>

        <div className="text-[10px] text-[#8b949e] font-mono">
          {formattedColumns.length} columns • TanStack Virtual Grid
        </div>
      </div>

      {/* Virtualized Table Scrollport */}
      <div ref={parentRef} className="flex-1 overflow-auto bg-[#0d1117] relative">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize() + 32}px`,
            width: `${totalTableWidth}px`,
            minWidth: '100%',
            position: 'relative',
          }}
        >
          {/* Sticky Header Grid Row */}
          <div
            className="sticky top-0 z-10 bg-[#161b22] text-[#8b949e] uppercase text-[10px] tracking-wider border-b border-[#30363d] shadow-sm font-semibold select-none"
            style={{
              display: 'grid',
              gridTemplateColumns,
              width: `${totalTableWidth}px`,
              minWidth: '100%',
            }}
          >
            <div className="py-2 px-2 text-center text-[#8b949e] border-r border-[#30363d] bg-[#161b22] flex items-center justify-center font-bold">
              #
            </div>
            {formattedColumns.map((col) => (
              <div
                key={col}
                className="py-2 px-3 border-r border-[#30363d] truncate text-[#c9d1d9] bg-[#161b22] flex items-center"
                style={{ width: `${COL_WIDTH}px` }}
                title={col}
              >
                <span className="truncate">{col}</span>
              </div>
            ))}
          </div>

          {/* Virtualized Body Rows */}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;

            return (
              <div
                key={virtualRow.index}
                className={`absolute left-0 top-0 text-[11px] border-b border-[#21262d] transition-colors ${
                  virtualRow.index % 2 === 0 ? 'bg-[#0d1117]' : 'bg-[#161b22]/50'
                } hover:bg-[#1f6feb]/15`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start + 32}px)`,
                  display: 'grid',
                  gridTemplateColumns,
                  width: `${totalTableWidth}px`,
                  minWidth: '100%',
                }}
              >
                {/* Row Number */}
                <div className="py-1.5 px-2 text-center text-[#8b949e] border-r border-[#21262d] flex items-center justify-center text-[10px] select-none">
                  {virtualRow.index + 1}
                </div>

                {/* Data Columns */}
                {formattedColumns.map((col) => {
                  const val = row[col];
                  const displayVal =
                    val === null
                      ? 'null'
                      : typeof val === 'object'
                      ? JSON.stringify(val)
                      : String(val);
                  const isNull = val === null;
                  const cellId = `${virtualRow.index}_${col}`;
                  const isCopied = copiedCell === cellId;

                  return (
                    <div
                      key={col}
                      onClick={() => handleCopyCell(displayVal, cellId)}
                      className="py-1 px-3 border-r border-[#21262d] flex items-center justify-between text-[#c9d1d9] cursor-pointer group relative overflow-hidden"
                      style={{ width: `${COL_WIDTH}px` }}
                      title={displayVal}
                    >
                      <span
                        className={`truncate ${
                          isNull
                            ? 'text-[#8b949e] italic'
                            : typeof val === 'number'
                            ? 'text-[#79c0ff]'
                            : typeof val === 'boolean'
                            ? 'text-[#bc8cff]'
                            : 'text-[#c9d1d9]'
                        }`}
                      >
                        {displayVal}
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 p-0.5 text-[#8b949e] hover:text-white transition-opacity ml-1 flex-shrink-0">
                        {isCopied ? (
                          <Check className="w-2.5 h-2.5 text-[#3fb950]" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
