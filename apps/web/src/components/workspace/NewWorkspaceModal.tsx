import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { X, Building2, Loader2, Sparkles } from 'lucide-react';
import { CREATE_WORKSPACE_MUTATION, LIST_WORKSPACES_QUERY } from '../../graphql/workspaces';
import { useWorkspaceStore } from '../../stores/workspaceStore';

interface NewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewWorkspaceModal: React.FC<NewWorkspaceModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const { setActiveWorkspaceId } = useWorkspaceStore();

  const [createWorkspace, { loading }] = useMutation(CREATE_WORKSPACE_MUTATION, {
    refetchQueries: [{ query: LIST_WORKSPACES_QUERY }],
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await createWorkspace({
        variables: { input: { name: name.trim() } },
      });
      if (res.data?.createWorkspace) {
        setActiveWorkspaceId(res.data.createWorkspace.id);
        onClose();
        setName('');
      }
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-[#161b22] w-full max-w-md rounded-2xl border border-[#30363d] shadow-2xl overflow-hidden flex flex-col text-[#c9d1d9]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff] border border-[#388bfd]/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Create New Team Workspace</h2>
              <p className="text-[11px] text-[#8b949e]">Collaborate with team members and manage connections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8b949e] hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
              Workspace / Organization Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Engineering or Analytics Team"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-start space-x-2 text-[11px] text-[#8b949e]">
            <Sparkles className="w-3.5 h-3.5 text-[#58a6ff] mt-0.5 flex-shrink-0" />
            <span>
              Workspaces isolate connections, queries, and diagrams. You will be assigned the <strong>Owner</strong> role.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#30363d]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
