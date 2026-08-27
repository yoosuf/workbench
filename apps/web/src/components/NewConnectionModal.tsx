import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Server, 
  Layers, 
  Sparkles,
  Play,
  ShieldCheck,
  Lock,
  Globe
} from 'lucide-react';
import { Engine } from '@workbench/shared-types';
import { 
  CREATE_CONNECTION_MUTATION, 
  TEST_CONNECTION_MUTATION, 
  LIST_CONNECTIONS_QUERY 
} from '../graphql/connections';

interface NewConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NewConnectionModal: React.FC<NewConnectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [engine, setEngine] = useState<Engine>(Engine.POSTGRES);
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(5433);
  const [database, setDatabase] = useState('sample_ecommerce');
  const [username, setUsername] = useState('postgres');
  const [password, setPassword] = useState('postgrespassword');
  const [sslEnabled, setSslEnabled] = useState(false);
  const [sslMode, setSslMode] = useState<'disable' | 'require'>('disable');

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    latencyMs?: number;
  } | null>(null);

  const [createConnection, { loading: creating }] = useMutation(CREATE_CONNECTION_MUTATION, {
    refetchQueries: [{ query: LIST_CONNECTIONS_QUERY }],
  });
  const [testConnection, { loading: testing }] = useMutation(TEST_CONNECTION_MUTATION);

  if (!isOpen) return null;

  const handleEngineChange = (newEngine: Engine) => {
    setEngine(newEngine);
    setTestResult(null);
    if (newEngine === Engine.POSTGRES) {
      if (!name || name.includes('MySQL')) setName('PostgreSQL Target (Sample)');
      setPort(5433);
      setUsername('postgres');
      setPassword('postgrespassword');
    } else {
      if (!name || name.includes('Postgres')) setName('MySQL Target (Sample)');
      setPort(3307);
      setUsername('root');
      setPassword('mysqlpassword');
    }
  };

  const handlePresetCloud = (preset: 'supabase' | 'rds' | 'neon') => {
    setTestResult(null);
    setSslEnabled(true);
    setSslMode('require');
    if (preset === 'supabase') {
      setEngine(Engine.POSTGRES);
      setName('Supabase / Cloud Postgres');
      setHost('db.example.supabase.co');
      setPort(5432);
      setDatabase('postgres');
      setUsername('postgres');
      setPassword('');
    } else if (preset === 'neon') {
      setEngine(Engine.POSTGRES);
      setName('Neon Serverless DB');
      setHost('ep-cool-frost-123.us-east-2.aws.neon.tech');
      setPort(5432);
      setDatabase('neondb');
      setUsername('alex');
      setPassword('');
    } else if (preset === 'rds') {
      setEngine(Engine.MYSQL);
      setName('AWS RDS MySQL');
      setHost('database-1.cxyz.us-east-1.rds.amazonaws.com');
      setPort(3306);
      setDatabase('production');
      setUsername('admin');
      setPassword('');
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      const res = await testConnection({
        variables: {
          input: {
            engine,
            host,
            port: Number(port),
            database,
            username,
            password,
            ssl: sslEnabled,
            sslMode: sslEnabled ? sslMode : 'disable',
          },
        },
      });
      if (res.data?.testConnection) {
        setTestResult(res.data.testConnection);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createConnection({
        variables: {
          input: {
            name: name || `${engine} Connection`,
            engine,
            host,
            port: Number(port),
            database,
            username,
            password,
            ssl: sslEnabled,
            sslMode: sslEnabled ? sslMode : 'disable',
          },
        },
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to save connection',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-[#161b22] w-full max-w-xl rounded-2xl border border-[#30363d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#c9d1d9]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff] border border-[#388bfd]/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Database Connection</h2>
              <p className="text-xs text-[#8b949e]">Configure target database endpoint, credentials & encryption</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Engine Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
              Select Database Engine
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* PostgreSQL Option */}
              <button
                type="button"
                onClick={() => handleEngineChange(Engine.POSTGRES)}
                className={`flex items-center space-x-3 p-3.5 rounded-xl border text-left transition-all ${
                  engine === Engine.POSTGRES
                    ? 'bg-[#1f6feb]/15 border-[#388bfd] shadow-md'
                    : 'bg-[#0d1117] border-[#30363d] hover:border-[#8b949e] opacity-70'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#1f6feb]/20 border border-[#388bfd]/30 flex items-center justify-center text-[#58a6ff]">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">PostgreSQL</div>
                  <div className="text-[11px] text-[#8b949e]">Native driver (pg)</div>
                </div>
              </button>

              {/* MySQL Option */}
              <button
                type="button"
                onClick={() => handleEngineChange(Engine.MYSQL)}
                className={`flex items-center space-x-3 p-3.5 rounded-xl border text-left transition-all ${
                  engine === Engine.MYSQL
                    ? 'bg-[#d29922]/15 border-[#d29922] shadow-md'
                    : 'bg-[#0d1117] border-[#30363d] hover:border-[#8b949e] opacity-70'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#d29922]/20 border border-[#d29922]/30 flex items-center justify-center text-[#d29922]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">MySQL / MariaDB</div>
                  <div className="text-[11px] text-[#8b949e]">Native driver (mysql2)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8b949e]">
              <span className="flex items-center gap-1.5 font-medium">
                <Globe className="w-3.5 h-3.5 text-[#58a6ff]" />
                <span>Quick Cloud / Local Presets</span>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handlePresetCloud('supabase')}
                className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[11px] text-[#c9d1d9] border border-[#30363d] transition-colors"
              >
                Supabase
              </button>
              <button
                type="button"
                onClick={() => handlePresetCloud('neon')}
                className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[11px] text-[#c9d1d9] border border-[#30363d] transition-colors"
              >
                Neon
              </button>
              <button
                type="button"
                onClick={() => handlePresetCloud('rds')}
                className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[11px] text-[#c9d1d9] border border-[#30363d] transition-colors"
              >
                AWS RDS
              </button>
              <button
                type="button"
                onClick={() => handleEngineChange(engine)}
                className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[11px] text-[#58a6ff] border border-[#30363d] transition-colors ml-auto font-medium"
              >
                Docker Local
              </button>
            </div>
          </div>

          {/* Connection Name */}
          <div>
            <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Analytics Replica"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          {/* Host & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
                Host / Hostname
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="127.0.0.1 or db.example.com"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
                Port
              </label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] font-mono"
              />
            </div>
          </div>

          {/* Database Name */}
          <div>
            <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
              Initial Database / Catalog
            </label>
            <input
              type="text"
              required
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="sample_ecommerce"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] font-mono"
            />
          </div>

          {/* Username & Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="postgres or root"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] font-mono"
              />
            </div>
          </div>

          {/* Security & SSL / TLS Encryption Section */}
          <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#3fb950]" />
                <span className="text-xs font-bold text-white">SSL / TLS In-Transit Encryption</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sslEnabled}
                  onChange={(e) => {
                    setSslEnabled(e.target.checked);
                    setSslMode(e.target.checked ? 'require' : 'disable');
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#21262d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#30363d] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#238636]"></div>
              </label>
            </div>
            <p className="text-[11px] text-[#8b949e]">
              Encrypts all traffic between Workbench and your database over TLS. Strongly recommended for cloud-hosted databases (AWS RDS, Supabase, Neon, PlanetScale, GCP Cloud SQL).
            </p>
            {sslEnabled && (
              <div className="pt-2 border-t border-[#21262d] flex items-center justify-between text-xs">
                <span className="text-[#8b949e]">SSL Mode:</span>
                <select
                  value={sslMode}
                  onChange={(e) => setSslMode(e.target.value as any)}
                  className="bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                >
                  <option value="require">Require (Standard TLS)</option>
                  <option value="disable">Disable</option>
                </select>
              </div>
            )}
          </div>

          {/* Test Connection Result Alert */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 transition-all ${
                testResult.success
                  ? 'bg-[#238636]/15 border-[#2ea043]/40 text-[#3fb950]'
                  : 'bg-[#f85149]/15 border-[#f85149]/40 text-[#ff7b72]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-semibold">
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  {testResult.latencyMs !== undefined && (
                    <span className="ml-2 font-mono text-[10px] opacity-80">
                      ({testResult.latencyMs}ms)
                    </span>
                  )}
                </div>
                <div className="text-[11px] mt-0.5 opacity-90">{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[#30363d] flex items-center justify-between">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold text-[#c9d1d9] border border-[#30363d] transition-colors disabled:opacity-50"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 text-[#58a6ff]" />
              )}
              <span>Test Connection</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Save Connection</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
