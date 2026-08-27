import React, { useState, useRef, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  RefreshCw,
  Clock,
  Database,
  Copy,
  Check,
  Table as TableIcon
} from 'lucide-react';
import { TABLE_DATA_QUERY } from '../graphql/tableData';

interface TableDataBrowserProps {
  connectionId: string;
  schema: string;
  tableName: string;
}

const COL_WIDTH = 190;
const ROW_NUM_WIDTH = 50;

export const TableDataBrowser: React.FC<TableDataBrowserProps> = ({
  connectionId,
  schema,
  tableName,
}) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | undefined>(undefined);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  const { data, loading, error, refetch } = useQuery(TABLE_DATA_QUERY, {
    variables: {
      input: {
        connectionId,
        schema,
        table: tableName,
        limit: pageSize,
        offset: page * pageSize,
        sortColumn,
        sortOrder,
      },
    },
    fetchPolicy: 'network-only',
  });

  const tableResult = data?.tableData;
  const columns: string[] = useMemo(() => tableResult?.columns || [], [tableResult]);
  const rows: Record<string, unknown>[] = useMemo(() => tableResult?.rows || [], [tableResult]);
  const totalCount: number = tableResult?.totalCount || 0;
  const executionTimeMs: number = tableResult?.executionTimeMs || 0;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 25,
  });

  // Calculate total canvas width to eliminate column misalignment
  const totalTableWidth = useMemo(() => {
    return ROW_NUM_WIDTH + columns.length * COL_WIDTH;
  }, [columns]);

  const gridTemplateColumns = useMemo(() => {
    if (columns.length === 0) return `${ROW_NUM_WIDTH}px`;
    return `${ROW_NUM_WIDTH}px repeat(${columns.length}, ${COL_WIDTH}px)`;
  }, [columns]);

  const handleHeaderClick = (colName: string) => {
    if (sortColumn !== colName) {
      setSortColumn(colName);
      setSortOrder('ASC');
    } else if (sortOrder === 'ASC') {
      setSortOrder('DESC');
    } else {
      setSortColumn(undefined);
      setSortOrder(undefined);
    }
    setPage(0);
  };

  const handleCopyCell = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  if (loading && !tableResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-2 text-[#8b949e] bg-[#0d1117]">
        <Loader2 className="w-6 h-6 text-[#58a6ff] animate-spin" />
        <span className="text-xs font-mono">Fetching table rows from database...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded bg-[#2b0f14]/30 border border-[#f85149]/30 text-[#ff7b72] text-xs font-mono m-4">
        <p className="font-bold">Error querying table data:</p>
        <pre className="mt-2">{error.message}</pre>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden font-mono select-text text-[#c9d1d9]">
      {/* Top Workbench Grid Toolbar */}
      <div className="h-9 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] select-none flex-shrink-0">
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-[#58a6ff] font-semibold">
            <TableIcon className="w-3.5 h-3.5" />
            <span>{tableName}</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-[#c9d1d9]">
            <Database className="w-3 h-3 text-[#8b949e]" />
            <span>{totalCount.toLocaleString()} total rows</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-[#8b949e]">
            <Clock className="w-3 h-3 text-[#8b949e]" />
            <span>{executionTimeMs}ms</span>
          </span>
          <span>•</span>
          <span className="text-[#8b949e]">{columns.length} columns</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Page Size Selector */}
          <div className="flex items-center space-x-1 border-l border-[#30363d] pl-2">
            <span className="text-[11px] text-[#8b949e]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none focus:border-[#58a6ff]"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>
      </div>

      {/* Virtualized Table Viewport */}
      <div ref={parentRef} className="flex-1 overflow-auto bg-[#0d1117] relative">
        {rows.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[#8b949e] text-xs italic">
            Table is empty (0 rows found).
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize() + 32}px`,
              width: `${totalTableWidth}px`,
              minWidth: '100%',
              position: 'relative',
            }}
          >
            {/* Sticky Header Row */}
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
              {columns.map((col) => {
                const isSorted = sortColumn === col;
                return (
                  <div
                    key={col}
                    onClick={() => handleHeaderClick(col)}
                    className="py-2 px-3 border-r border-[#30363d] text-[#c9d1d9] bg-[#161b22] hover:bg-[#21262d] cursor-pointer flex items-center justify-between group transition-colors overflow-hidden"
                    style={{ width: `${COL_WIDTH}px` }}
                    title={`Click to sort by ${col}`}
                  >
                    <span className="truncate">{col}</span>
                    <span className="ml-1 text-[#8b949e] group-hover:text-[#58a6ff] flex-shrink-0">
                      {isSorted ? (
                        sortOrder === 'ASC' ? (
                          <ArrowUp className="w-3 h-3 text-[#58a6ff]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[#58a6ff]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-60" />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Virtualized Body Rows */}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              const rowNum = page * pageSize + virtualRow.index + 1;

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
                  <div className="py-1 px-2 text-center text-[#8b949e] border-r border-[#21262d] flex items-center justify-center text-[10px] select-none">
                    {rowNum}
                  </div>

                  {/* Cell Columns */}
                  {columns.map((col) => {
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
        )}
      </div>

      {/* Pagination Footer */}
      <div className="h-9 px-3 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] select-none flex-shrink-0">
        <div className="text-[11px] text-[#8b949e] font-mono">
          Showing {rows.length > 0 ? page * pageSize + 1 : 0} -{' '}
          {Math.min((page + 1) * pageSize, totalCount)} of {totalCount.toLocaleString()} rows
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-[#8b949e] font-mono">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
