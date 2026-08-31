import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Plus,
  Server,
  Layers,
  HardDrive,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Database,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Engine } from '@workbench/shared-types';
import { 
  LIST_CONNECTIONS_QUERY, 
  DELETE_CONNECTION_MUTATION, 
  TEST_SAVED_CONNECTION_MUTATION,
  CREATE_CONNECTION_MUTATION 
} from '../graphql/connections';
import { NewConnectionModal } from '../components/NewConnectionModal';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

interface ConnectionItem {
  id: string;
  name: string;
  engine: Engine;
  host: string;
  port: number;
  database: string;
  username: string;
  createdAt: string;
}

export const ConnectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testStatuses, setTestStatuses] = useState<
    Record<string, { success: boolean; message?: string; latencyMs?: number }>
  >({});

  const { data, loading, refetch } = useQuery<{ listConnections: ConnectionItem[] }>(
    LIST_CONNECTIONS_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  const [deleteConnection] = useMutation(DELETE_CONNECTION_MUTATION, {
    refetchQueries: [{ query: LIST_CONNECTIONS_QUERY }],
  });

  const [testSavedConnection] = useMutation(TEST_SAVED_CONNECTION_MUTATION);
  const [createConnection] = useMutation(CREATE_CONNECTION_MUTATION, {
    refetchQueries: [{ query: LIST_CONNECTIONS_QUERY }],
  });

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await testSavedConnection({ variables: { id } });
      if (res.data?.testSavedConnection) {
        setTestStatuses((prev) => ({
          ...prev,
          [id]: res.data.testSavedConnection,
        }));
      }
    } catch (err: any) {
      setTestStatuses((prev) => ({
        ...prev,
        [id]: {
          success: false,
          message: err.message || 'Test failed',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete connection "${name}"?`)) {
      try {
        await deleteConnection({ variables: { id } });
      } catch (err: any) {
        alert(`Failed to delete: ${err.message}`);
      }
    }
  };

  const handleQuickAddPostgres = async () => {
    try {
      await createConnection({
        variables: {
          input: {
            name: 'Local PostgreSQL (Docker Port 5433)',
            engine: Engine.POSTGRES,
            host: '127.0.0.1',
            port: 5433,
            database: 'sample_ecommerce',
            username: 'postgres',
            password: 'postgrespassword',
          },
        },
      });
    } catch (err: any) {
      alert(`Error creating connection: ${err.message}`);
    }
  };

  const handleQuickAddMySql = async () => {
    try {
      await createConnection({
        variables: {
          input: {
            name: 'Local MySQL (Docker Port 3307)',
            engine: Engine.MYSQL,
            host: '127.0.0.1',
            port: 3307,
            database: 'sample_ecommerce',
            username: 'root',
            password: 'mysqlpassword',
          },
        },
      });
    } catch (err: any) {
      alert(`Error creating connection: ${err.message}`);
    }
  };

  const handleQuickAddMssql = async () => {
    try {
      await createConnection({
        variables: {
          input: {
            name: 'Local SQL Server (Docker Port 1434)',
            engine: Engine.MSSQL,
            host: '127.0.0.1',
            port: 1434,
            database: 'sample_ecommerce',
            username: 'sa',
            password: 'MssqlPassword1!',
          },
        },
      });
    } catch (err: any) {
      alert(`Error creating connection: ${err.message}`);
    }
  };

  const connections = data?.listConnections || [];

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6 font-sans text-[#c9d1d9]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#30363d] pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
              <Network className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Database Connections</h1>
          </div>
          <p className="text-xs text-[#8b949e]">
            Manage target endpoints for PostgreSQL, MySQL, and SQL Server instances. Credentials encrypted at rest with AES-256-GCM.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="p-2 text-[#8b949e] hover:text-white"
            title="Refresh connections"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="gap-2 bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Connection</span>
          </Button>
        </div>
      </div>

      {/* Quick Setup Banner if no connections */}
      {connections.length === 0 && !loading && (
        <div className="rounded-2xl p-8 border border-[#30363d] bg-[#161b22] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 flex items-center justify-center mx-auto">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">No Database Connections Configured</h2>
            <p className="text-xs text-[#8b949e] max-w-md mx-auto mt-1">
              Add your PostgreSQL, MySQL, or SQL Server database connection, or quickly initialize connections to the local Docker test containers.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickAddPostgres}
              className="gap-2 text-[#58a6ff] border-[#58a6ff]/30 hover:bg-[#58a6ff]/10"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Connect Sample PostgreSQL (:5433)</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickAddMySql}
              className="gap-2 text-[#38bdf8] border-[#38bdf8]/30 hover:bg-[#38bdf8]/10"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Connect Sample MySQL (:3307)</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickAddMssql}
              className="gap-2 text-[#c084fc] border-[#a855f7]/30 hover:bg-[#a855f7]/10"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Connect Sample SQL Server (:1434)</span>
            </Button>
          </div>
        </div>
      )}

      {/* Connections Grid */}
      {loading && connections.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-7 h-7 text-[#58a6ff] animate-spin" />
          <p className="text-xs text-[#8b949e] font-mono">Loading saved connections...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {connections.map((conn) => {
            const isPg = conn.engine === Engine.POSTGRES;
            const isMssql = conn.engine === Engine.MSSQL;
            const testStatus = testStatuses[conn.id];
            const isTesting = testingId === conn.id;

            return (
              <div
                key={conn.id}
                className="bg-[#161b22] rounded-2xl border border-[#30363d] hover:border-[#58a6ff] transition-all p-5 flex flex-col justify-between space-y-4 group shadow-md hover:shadow-xl hover:shadow-[#58a6ff]/5"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                        isPg
                          ? 'bg-[#336791]/15 border-[#336791]/40 text-[#58a6ff]'
                          : isMssql
                            ? 'bg-[#a855f7]/15 border-[#a855f7]/40 text-[#c084fc]'
                            : 'bg-[#00758f]/15 border-[#00758f]/40 text-[#38bdf8]'
                      }`}
                    >
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white group-hover:text-[#58a6ff] transition-colors leading-snug truncate max-w-[170px]">
                        {conn.name}
                      </h2>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono"
                        >
                          {conn.engine}
                        </Badge>
                        <span className="text-[10px] text-[#3fb950] flex items-center gap-1 font-mono">
                          <ShieldCheck className="w-3 h-3" /> AES-256
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(conn.id, conn.name)}
                    className="p-1.5 text-[#8b949e] hover:text-[#f85149] hover:bg-[#f85149]/10 rounded-lg transition-colors"
                    title="Delete connection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Connection Parameters */}
                <div className="p-3 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-[#8b949e]">
                    <span>Host:Port</span>
                    <span className="text-[#c9d1d9]">
                      {conn.host}:{conn.port}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#8b949e]">
                    <span>Database</span>
                    <span className="text-[#58a6ff] font-semibold">{conn.database}</span>
                  </div>
                  <div className="flex justify-between text-[#8b949e]">
                    <span>User</span>
                    <span className="text-[#c9d1d9]">{conn.username}</span>
                  </div>
                </div>

                {/* Live Test Status Pill */}
                {testStatus && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      testStatus.success
                        ? 'bg-[#3fb950]/10 border-[#3fb950]/30 text-[#3fb950]'
                        : 'bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      {testStatus.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                      <span className="truncate text-[11px]">{testStatus.message}</span>
                    </div>
                    {testStatus.latencyMs !== undefined && (
                      <span className="font-mono text-[10px] ml-2 flex-shrink-0 font-semibold">
                        {testStatus.latencyMs}ms
                      </span>
                    )}
                  </div>
                )}

                {/* Card Actions */}
                <div className="pt-2 border-t border-[#30363d] flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(conn.id)}
                    disabled={isTesting}
                    className="gap-1.5 text-xs"
                  >
                    {isTesting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3 text-[#58a6ff]" />
                    )}
                    <span>Test</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => navigate(`/schema?connectionId=${conn.id}`)}
                    className="gap-1.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold"
                  >
                    <span>Connect</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Connection Modal */}
      <NewConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
