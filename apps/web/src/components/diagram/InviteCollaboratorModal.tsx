import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  X,
  UserPlus,
  Users,
  Mail,
  Shield,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Share2,
  Sparkles
} from 'lucide-react';
import {
  LIST_WORKSPACES_QUERY,
  LIST_TEAMS_QUERY,
  INVITE_WORKSPACE_MEMBER_MUTATION,
  ADD_TEAM_MEMBER_MUTATION,
} from '../../graphql/workspaces';

interface InviteCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId?: string;
  schema?: string;
  diagramId?: string;
}

export const InviteCollaboratorModal: React.FC<InviteCollaboratorModalProps> = ({
  isOpen,
  onClose,
  connectionId,
  schema,
  diagramId,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER' | 'READONLY'>('MEMBER');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Workspaces
  const { data: workspacesData } = useQuery(LIST_WORKSPACES_QUERY, { skip: !isOpen });
  const workspaces = workspacesData?.listWorkspaces || [];
  const currentWorkspace = workspaces[0];

  // Fetch Teams for active workspace
  const { data: teamsData } = useQuery(LIST_TEAMS_QUERY, {
    variables: { workspaceId: currentWorkspace?.id },
    skip: !isOpen || !currentWorkspace?.id,
  });
  const teams = teamsData?.listTeams || [];

  // Mutations
  const [inviteMember, { loading: inviting }] = useMutation(INVITE_WORKSPACE_MEMBER_MUTATION);
  const [addTeamMember] = useMutation(ADD_TEAM_MEMBER_MUTATION);

  if (!isOpen) return null;

  // Build current shareable diagram link
  const shareableUrl = `${window.location.origin}/diagram?${new URLSearchParams({
    ...(connectionId ? { connectionId } : {}),
    ...(schema ? { schema } : {}),
    ...(diagramId ? { diagramId } : {}),
  }).toString()}`;

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !currentWorkspace?.id) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await inviteMember({
        variables: {
          input: {
            workspaceId: currentWorkspace.id,
            email: email.trim().toLowerCase(),
            role,
          },
        },
      });

      const invitedUser = res.data?.inviteWorkspaceMember?.user;

      if (invitedUser && selectedTeamId) {
        await addTeamMember({
          variables: {
            input: {
              workspaceId: currentWorkspace.id,
              teamId: selectedTeamId,
              userId: invitedUser.id,
            },
          },
        });
      }

      setSuccessMsg(`Invitation dispatched to ${email}! They can now collaborate on this diagram.`);
      setEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send invitation');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-[#c9d1d9] font-sans">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/30">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Invite Collaborator to Diagram</h3>
              <p className="text-[11px] text-[#8b949e]">
                Workspace: <span className="font-semibold text-white">{currentWorkspace?.name || 'Personal Workspace'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shareable Link Strip */}
        <div className="px-5 py-3 bg-[#0d1117]/80 border-b border-[#30363d] flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-2 truncate">
            <Share2 className="w-3.5 h-3.5 text-[#38bdf8] flex-shrink-0" />
            <span className="text-[11px] text-[#8b949e] font-mono truncate">{shareableUrl}</span>
          </div>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold text-white border border-[#30363d] transition-all flex-shrink-0"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#3fb950]" />
                <span className="text-[#3fb950]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleInvite} className="p-5 space-y-4 text-xs font-sans">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#2b0f14]/50 border border-[#f85149]/40 text-[#ff7b72] flex items-start space-x-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#0f2d1e]/50 border border-[#2ea043]/40 text-[#3fb950] flex items-start space-x-2 font-mono">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-[#8b949e] font-semibold mb-1">
              Email Address <span className="text-[#f85149]">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8b949e] absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-2 text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Role & Team Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8b949e] font-semibold mb-1">
                Workspace Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="MEMBER">Member (Edit Schema & Query)</option>
                <option value="READONLY">Read-Only (View Diagrams)</option>
                <option value="ADMIN">Admin (Full Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8b949e] font-semibold mb-1">
                Assign to Team / Squad
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="">No specific team</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    @{t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#30363d] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={inviting || !email.trim()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {inviting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Invitation...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
