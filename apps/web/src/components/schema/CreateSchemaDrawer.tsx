import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Layers, Database, ShieldCheck, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Drawer } from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { CREATE_SCHEMA_MUTATION, CONNECTION_SCHEMAS_QUERY } from '../../graphql/schema';

interface CreateSchemaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  onSchemaCreated?: (schemaName: string) => void;
}

export const CreateSchemaDrawer: React.FC<CreateSchemaDrawerProps> = ({
  isOpen,
  onClose,
  connectionId,
  onSchemaCreated,
}) => {
  const [schemaName, setSchemaName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [createSchema, { loading }] = useMutation(CREATE_SCHEMA_MUTATION, {
    refetchQueries: [{ query: CONNECTION_SCHEMAS_QUERY, variables: { connectionId } }],
    onCompleted: (data) => {
      const created = data?.createSchema?.name;
      if (created && onSchemaCreated) {
        onSchemaCreated(created);
      }
      setSchemaName('');
      setError(null);
      onClose();
    },
    onError: (err) => {
      setError(err.message || 'Failed to create schema');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemaName.trim()) {
      setError('Please provide a valid schema name');
      return;
    }
    setError(null);
    createSchema({
      variables: {
        input: {
          connectionId,
          schemaName: schemaName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        },
      },
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Database Schema"
      description="Provision an isolated namespace or logical database container"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !schemaName.trim()}
            className="gap-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            Create Schema
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg text-xs text-[#f85149] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Schema Name Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#c9d1d9] flex items-center justify-between">
            <span>Schema / Database Name</span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">
              Namespace
            </Badge>
          </label>
          <div className="relative">
            <Input
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              placeholder="e.g. analytics, billing, staging, auth"
              className="font-mono text-sm bg-[#0d1117] border-[#30363d]"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-[#8b949e]">
            Identifiers are automatically lowercased and restricted to alphanumeric characters & underscores.
          </p>
        </div>

        {/* Informational Callout */}
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22]/50 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#58a6ff]">
            <Database className="w-4 h-4" />
            <span>Why use Multiple Schemas?</span>
          </div>
          <ul className="text-xs text-[#8b949e] space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-[#3fb950] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#c9d1d9]">Multi-tenancy & Isolation:</strong> Separate microservices, environments, or domains under one connection.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-[#3fb950] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#c9d1d9]">Granular Access Control:</strong> Grant specific teams or database users restricted read/write permissions per schema.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#58a6ff] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#c9d1d9]">Clean Organization:</strong> Manage separate EER diagrams and schema trees without table collisions.
              </span>
            </li>
          </ul>
        </div>
      </form>
    </Drawer>
  );
};
