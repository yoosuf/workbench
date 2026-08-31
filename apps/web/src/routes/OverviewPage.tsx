import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Server, 
  Database, 
  Plus, 
  Zap, 
  GitFork, 
  TableProperties, 
  ChevronRight,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { LIST_CONNECTIONS_QUERY } from '../graphql/connections';
import { NewConnectionModal } from '../components/NewConnectionModal';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: connData, refetch: refetchConns } = useQuery(LIST_CONNECTIONS_QUERY);
  const connections = connData?.listConnections || [];

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117] text-[#c9d1d9] font-sans p-6 md:p-8 space-y-8">
      {/* Header Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#30363d] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Database Connections & Workspaces</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-[#30363d] text-[#58a6ff]">
              Active Workspace
            </Badge>
          </div>
          <p className="text-xs text-[#8b949e]">
            Select a target database instance to inspect schemas, execute SQL queries, or model EER diagrams.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="gap-2 bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Connection</span>
        </Button>
      </div>

      {/* Live Service Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-between font-mono text-xs shadow-sm">
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
            <span className="text-[#c9d1d9] font-medium">PostgreSQL 15</span>
          </div>
          <span className="text-[#3fb950] font-semibold text-[11px] bg-[#3fb950]/10 px-2 py-0.5 rounded border border-[#3fb950]/20">
            :5433 (Online)
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-between font-mono text-xs shadow-sm">
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
            <span className="text-[#c9d1d9] font-medium">MySQL 8.4</span>
          </div>
          <span className="text-[#3fb950] font-semibold text-[11px] bg-[#3fb950]/10 px-2 py-0.5 rounded border border-[#3fb950]/20">
            :3307 (Online)
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-between font-mono text-xs shadow-sm">
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
            <span className="text-[#c9d1d9] font-medium">SQL Server 2022</span>
          </div>
          <span className="text-[#3fb950] font-semibold text-[11px] bg-[#3fb950]/10 px-2 py-0.5 rounded border border-[#3fb950]/20">
            :1434 (Online)
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-between font-mono text-xs shadow-sm">
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-2 rounded-full bg-[#58a6ff]" />
            <span className="text-[#c9d1d9] font-medium">GraphQL API</span>
          </div>
          <span className="text-[#58a6ff] font-semibold text-[11px] bg-[#58a6ff]/10 px-2 py-0.5 rounded border border-[#58a6ff]/20">
            :4000 (Ready)
          </span>
        </div>
      </div>

      {/* Database Connections Tiles Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Configured Database Endpoints</span>
          </h2>
          <span className="text-xs text-[#8b949e] font-mono">
            {connections.length} connection{connections.length === 1 ? '' : 's'} registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((conn: any) => {
            const isPg = conn.engine === 'POSTGRES';
            const isMssql = conn.engine === 'MSSQL';
            return (
              <div
                key={conn.id}
                onClick={() => navigate(`/editor?connectionId=${conn.id}`)}
                className="bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff] rounded-2xl p-5 cursor-pointer flex flex-col justify-between group transition-all shadow-md hover:shadow-xl hover:shadow-[#58a6ff]/5"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-inner shrink-0 ${
                          isPg
                            ? 'bg-[#336791]/15 text-[#58a6ff] border border-[#336791]/40'
                            : isMssql
                              ? 'bg-[#a855f7]/15 text-[#c084fc] border border-[#a855f7]/40'
                              : 'bg-[#00758f]/15 text-[#38bdf8] border border-[#00758f]/40'
                        }`}
                      >
                        <Database className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white group-hover:text-[#58a6ff] transition-colors truncate">
                          {conn.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-[#8b949e]">
                            {conn.engine}
                          </span>
                          <span className="text-[10px] text-[#3fb950] flex items-center gap-1 font-mono">
                            <ShieldCheck className="w-3 h-3 text-[#3fb950]" /> AES-256
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-[#3fb950] shadow-sm shadow-[#3fb950]/50 shrink-0" />
                  </div>

                  <div className="p-3 rounded-xl bg-[#0d1117] border border-[#21262d] text-xs font-mono space-y-1.5 text-[#8b949e]">
                    <div className="flex justify-between">
                      <span>Host:</span>
                      <span className="text-[#c9d1d9]">{conn.host}:{conn.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>User:</span>
                      <span className="text-[#c9d1d9]">{conn.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Database:</span>
                      <span className="text-[#58a6ff] font-semibold">{conn.database}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-[#30363d] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#8b949e] group-hover:text-white flex items-center gap-1.5 transition-colors font-medium">
                    <Zap className="w-3.5 h-3.5 text-[#d29922]" /> Open SQL Workspace
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#8b949e] group-hover:translate-x-1 group-hover:text-white transition-all" />
                </div>
              </div>
            );
          })}

          {/* Add New Connection Card */}
          <div
            onClick={() => setModalOpen(true)}
            className="rounded-2xl border-2 border-dashed border-[#30363d] hover:border-[#58a6ff] bg-[#161b22]/40 hover:bg-[#161b22] p-6 cursor-pointer flex flex-col items-center justify-center text-center space-y-2.5 group transition-all min-h-[210px]"
          >
            <div className="w-11 h-11 rounded-full bg-[#21262d] group-hover:bg-[#58a6ff]/20 text-[#8b949e] group-hover:text-[#58a6ff] flex items-center justify-center transition-colors shadow-inner">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-[#58a6ff] transition-colors">
                Connect New Database
              </h4>
              <p className="text-[11px] text-[#8b949e] mt-1">
                PostgreSQL 12+ or MySQL 8.0+ instance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Workbench Capabilities Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          to="/editor"
          className="p-5 rounded-2xl bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff] transition-all space-y-2 group shadow-sm hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-white">
              <Zap className="w-4 h-4 text-[#d29922]" />
              <span>SQL Query Editor</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8b949e] group-hover:text-white transition-colors" />
          </div>
          <p className="text-xs text-[#8b949e] leading-relaxed">
            Monaco editor with SQL autocomplete, history logging, limit safeguards, and virtualized result grids.
          </p>
        </Link>

        <Link
          to="/schema"
          className="p-5 rounded-2xl bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff] transition-all space-y-2 group shadow-sm hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-white">
              <TableProperties className="w-4 h-4 text-[#3fb950]" />
              <span>Schema Inspector</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8b949e] group-hover:text-white transition-colors" />
          </div>
          <p className="text-xs text-[#8b949e] leading-relaxed">
            Explore tables, column datatypes, primary/foreign keys, indexes, table records, and DDL scripts.
          </p>
        </Link>

        <Link
          to="/diagram"
          className="p-5 rounded-2xl bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff] transition-all space-y-2 group shadow-sm hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-white">
              <GitFork className="w-4 h-4 text-[#bc8cff]" />
              <span>EER Diagram Canvas</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8b949e] group-hover:text-white transition-colors" />
          </div>
          <p className="text-xs text-[#8b949e] leading-relaxed">
            Workbench visual diagramming with Crow&apos;s foot connectors, identifying containers, and N:M junction tables.
          </p>
        </Link>
      </div>

      <NewConnectionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          void refetchConns();
        }}
      />
    </div>
  );
};
