import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  UserPlus,
  Mail,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Share2,
  Users,
  ShieldCheck
} from 'lucide-react';
import {
  LIST_WORKSPACES_QUERY,
  LIST_TEAMS_QUERY,
  INVITE_WORKSPACE_MEMBER_MUTATION,
  ADD_TEAM_MEMBER_MUTATION,
} from '../../graphql/workspaces';
import { Drawer } from '../ui/drawer';

export interface InviteCollaboratorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId?: string;
  schema?: string;
  diagramId?: string;
}

export const InviteCollaboratorDrawer: React.FC<InviteCollaboratorDrawerProps> = ({
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
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Team & Share Diagram"
      description={`Workspace: ${currentWorkspace?.name || 'Personal Workspace'}`}
      icon={<UserPlus className="w-5 h-5 text-[#58a6ff]" />}
      width="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleInvite}
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
        </>
      }
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Shareable Link Strip */}
        <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-2">
          <div className="flex items-center justify-between text-[#8b949e]">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-white">
              Shareable Diagram URL
            </span>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-[11px] font-semibold transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3 h-3 text-[#3fb950]" />
                  <span className="text-[#3fb950]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="p-2 bg-[#161b22] rounded-lg border border-[#30363d] font-mono text-[11px] text-[#38bdf8] truncate select-all">
            {shareableUrl}
          </div>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="space-y-3 pt-2">
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
              Teammate Email <span className="text-[#f85149]">*</span>
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
          <div className="space-y-3">
            <div>
              <label className="block text-[#8b949e] font-semibold mb-1">
                Workspace Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="MEMBER">Member (Edit Schema & Run Queries)</option>
                <option value="READONLY">Read-Only (View Diagrams)</option>
                <option value="ADMIN">Admin (Full Workspace Management)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8b949e] font-semibold mb-1">
                Assign to Squad / Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="">No specific squad</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    @{t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </div>
    </Drawer>
  );
};

export const InviteCollaboratorModal = InviteCollaboratorDrawer;
