import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Lock,
  Key,
  Database,
  RefreshCw,
} from 'lucide-react';
import { Drawer } from '../ui/drawer';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import {
  DATABASE_USERS_QUERY,
  SCHEMA_PERMISSIONS_QUERY,
  GRANT_SCHEMA_PERMISSION_MUTATION,
  REVOKE_SCHEMA_PERMISSION_MUTATION,
  DROP_SCHEMA_MUTATION,
  CONNECTION_SCHEMAS_QUERY,
} from '../../graphql/schema';

interface SchemaPermissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  schema: string;
  onSchemaDropped?: () => void;
}

const PRIVILEGES = [
  { id: 'USAGE', name: 'USAGE', desc: 'Allows looking up objects within the schema' },
  { id: 'SELECT', name: 'SELECT (Read-Only)', desc: 'Allows reading records from all tables' },
  { id: 'INSERT', name: 'INSERT', desc: 'Allows adding new records' },
  { id: 'UPDATE', name: 'UPDATE', desc: 'Allows modifying existing records' },
  { id: 'DELETE', name: 'DELETE', desc: 'Allows removing records' },
  { id: 'CREATE', name: 'CREATE', desc: 'Allows creating new tables & views in schema' },
  { id: 'ALL PRIVILEGES', name: 'ALL PRIVILEGES (Full Admin)', desc: 'Full administrative access' },
];

export const SchemaPermissionsDrawer: React.FC<SchemaPermissionsDrawerProps> = ({
  isOpen,
  onClose,
  connectionId,
  schema,
  onSchemaDropped,
}) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPrivilege, setSelectedPrivilege] = useState('USAGE');
  const [grantAllTables, setGrantAllTables] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Queries
  const { data: usersData, loading: loadingUsers } = useQuery(DATABASE_USERS_QUERY, {
    variables: { connectionId },
    skip: !isOpen || !connectionId,
    onCompleted: (data) => {
      if (data?.databaseUsers?.length > 0 && !selectedUser) {
        setSelectedUser(data.databaseUsers[0].username);
      }
    },
  });

  const {
    data: permsData,
    loading: loadingPerms,
    refetch: refetchPerms,
  } = useQuery(SCHEMA_PERMISSIONS_QUERY, {
    variables: { connectionId, schema },
    skip: !isOpen || !connectionId || !schema,
  });

  // Mutations
  const [grantPermission, { loading: granting }] = useMutation(
    GRANT_SCHEMA_PERMISSION_MUTATION,
    {
      onCompleted: () => {
        setSuccessMsg(`Granted "${selectedPrivilege}" to user "${selectedUser}"`);
        setError(null);
        refetchPerms();
        setTimeout(() => setSuccessMsg(null), 3000);
      },
      onError: (err) => setError(err.message),
    }
  );

  const [revokePermission, { loading: revoking }] = useMutation(
    REVOKE_SCHEMA_PERMISSION_MUTATION,
    {
      onCompleted: () => {
        setSuccessMsg('Permission revoked successfully');
        setError(null);
        refetchPerms();
        setTimeout(() => setSuccessMsg(null), 3000);
      },
      onError: (err) => setError(err.message),
    }
  );

  const [dropSchema, { loading: dropping }] = useMutation(DROP_SCHEMA_MUTATION, {
    refetchQueries: [{ query: CONNECTION_SCHEMAS_QUERY, variables: { connectionId } }],
    onCompleted: () => {
      if (onSchemaDropped) onSchemaDropped();
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select a database user');
      return;
    }
    setError(null);
    grantPermission({
      variables: {
        input: {
          connectionId,
          schemaName: schema,
          username: selectedUser,
          privilege: selectedPrivilege,
          grantAllTables,
        },
      },
    });
  };

  const handleRevoke = (username: string, priv: string) => {
    if (confirm(`Revoke ${priv} privilege on schema "${schema}" for user "${username}"?`)) {
      revokePermission({
        variables: {
          input: {
            connectionId,
            schemaName: schema,
            username,
            privilege: priv,
          },
        },
      });
    }
  };

  const handleDropSchema = () => {
    if (
      confirm(
        `Are you absolutely sure you want to drop schema "${schema}"? All tables and views in this schema will be deleted.`
      )
    ) {
      dropSchema({
        variables: {
          input: {
            connectionId,
            schemaName: schema,
            cascade: true,
          },
        },
      });
    }
  };

  const users = usersData?.databaseUsers || [];
  const permissions = permsData?.schemaPermissions || [];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Schema Security & Permissions: ${schema}`}
      description="Manage database role privileges, grants, and namespace lifecycle"
      width="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchPerms()}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Grants
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg text-xs text-[#f85149] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#3fb950]/10 border border-[#3fb950]/30 rounded-lg text-xs text-[#3fb950] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Section 1: Grant Schema Privilege Form */}
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c9d1d9]">
            <ShieldCheck className="w-4 h-4 text-[#58a6ff]" />
            <span>Grant Database Privilege</span>
          </div>

          <form onSubmit={handleGrant} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Database User Select */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#8b949e] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#58a6ff]" />
                  <span>Database User / Role</span>
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  disabled={loadingUsers}
                  className="w-full h-9 px-3 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
                >
                  {users.map((u: any) => (
                    <option key={u.username} value={u.username}>
                      {u.username} {u.isSuperuser ? '(Superuser)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Privilege Select */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#8b949e] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#d29922]" />
                  <span>Privilege Level</span>
                </label>
                <select
                  value={selectedPrivilege}
                  onChange={(e) => setSelectedPrivilege(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
                >
                  {PRIVILEGES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grant All Tables Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-[#c9d1d9]">Apply to all tables in schema</div>
                <div className="text-[11px] text-[#8b949e]">
                  Automatically cascade privilege to all existing and future created tables
                </div>
              </div>
              <Switch checked={grantAllTables} onCheckedChange={setGrantAllTables} />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={granting || !selectedUser}
              className="w-full gap-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white"
            >
              {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Grant Permission to {selectedUser || 'User'}
            </Button>
          </form>
        </div>

        {/* Section 2: Active Granted Privileges */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#c9d1d9] flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#3fb950]" />
              <span>Active Schema Privileges ({permissions.length})</span>
            </h3>
            {loadingPerms && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8b949e]" />}
          </div>

          <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#161b22]">
            {permissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8b949e]">
                No explicit permissions found for schema &quot;{schema}&quot; or default database owner permissions apply.
              </div>
            ) : (
              <div className="divide-y divide-[#30363d]">
                {permissions.map((p: any, idx: number) => (
                  <div
                    key={`${p.grantee}-${p.privilege}-${idx}`}
                    className="p-3 flex items-center justify-between hover:bg-[#21262d]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center text-xs font-mono text-[#58a6ff]">
                        {p.grantee.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#c9d1d9] flex items-center gap-2">
                          <span>{p.grantee}</span>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {p.privilege}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-[#8b949e]">
                          {p.isGrantable ? 'Grantable with admin rights' : 'Direct schema grant'}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(p.grantee, p.privilege)}
                      disabled={revoking}
                      className="h-7 px-2 text-[#f85149] hover:bg-[#f85149]/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Section 3: Danger Zone - Drop Schema */}
        {schema.toLowerCase() !== 'public' && schema.toLowerCase() !== 'default' && (
          <div className="p-4 rounded-xl border border-[#f85149]/30 bg-[#f85149]/5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#f85149]">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone: Drop Schema</span>
            </div>
            <p className="text-xs text-[#8b949e]">
              Permanently delete schema <strong className="text-[#c9d1d9]">&quot;{schema}&quot;</strong> and all of its associated tables, views, and indexes. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDropSchema}
              disabled={dropping}
              className="gap-2 bg-[#da3633] hover:bg-[#f85149] text-white"
            >
              {dropping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Drop Schema &quot;{schema}&quot;
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
};
