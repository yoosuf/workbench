import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  X,
  Users,
  UserPlus,
  ShieldCheck,
  Trash2,
  Loader2,
  Mail,
  Plus,
  Briefcase,
  Settings,
  Edit2,
  AlertTriangle,
  Save,
  Check,
  Database
} from 'lucide-react';
import {
  GET_WORKSPACE_MEMBERS_QUERY,
  INVITE_WORKSPACE_MEMBER_MUTATION,
  UPDATE_WORKSPACE_MEMBER_ROLE_MUTATION,
  REMOVE_WORKSPACE_MEMBER_MUTATION,
  SET_CONNECTION_PERMISSION_MUTATION,
  GET_CONNECTION_PERMISSIONS_QUERY,
  LIST_TEAMS_QUERY,
  CREATE_TEAM_MUTATION,
  UPDATE_TEAM_MUTATION,
  ADD_TEAM_MEMBER_MUTATION,
  REMOVE_TEAM_MEMBER_MUTATION,
  DELETE_TEAM_MUTATION,
  SET_TEAM_CONNECTION_PERMISSION_MUTATION,
  GET_TEAM_CONNECTION_PERMISSIONS_QUERY,
  UPDATE_WORKSPACE_MUTATION,
  DELETE_WORKSPACE_MUTATION,
  LIST_WORKSPACES_QUERY,
} from '../../graphql/workspaces';
import { LIST_CONNECTIONS_QUERY } from '../../graphql/connections';
import { WorkspaceRole, ConnectionAccessLevel, useWorkspaceStore } from '../../stores/workspaceStore';

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  currentUserRole?: WorkspaceRole;
}

export const TeamMembersModal: React.FC<TeamMembersModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  currentUserRole,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'teams' | 'permissions' | 'settings'>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MEMBER');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');

  // Workspace Settings State
  const [editWorkspaceName, setEditWorkspaceName] = useState(workspaceName);
  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Team creation & edit state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDescription, setEditTeamDescription] = useState('');

  const { setActiveWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    setEditWorkspaceName(workspaceName);
  }, [workspaceName]);

  const isOwner = currentUserRole === 'OWNER';
  const canManage = isOwner || currentUserRole === 'ADMIN';

  // Fetch Workspace Members
  const { data: membersData, loading: loadingMembers, refetch: refetchMembers } = useQuery(
    GET_WORKSPACE_MEMBERS_QUERY,
    {
      variables: { workspaceId },
      skip: !isOpen || !workspaceId,
      fetchPolicy: 'network-only',
    },
  );

  // Fetch Teams
  const { data: teamsData, loading: loadingTeams, refetch: refetchTeams } = useQuery(
    LIST_TEAMS_QUERY,
    {
      variables: { workspaceId },
      skip: !isOpen || !workspaceId,
      fetchPolicy: 'network-only',
    },
  );

  // Fetch Connections
  const { data: connData } = useQuery(LIST_CONNECTIONS_QUERY, {
    variables: { workspaceId },
    skip: !isOpen || !workspaceId,
  });

  const members = membersData?.workspaceMembers || [];
  const teams = teamsData?.listTeams || [];
  const connections = connData?.listConnections || [];

  React.useEffect(() => {
    if (connections.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, selectedConnectionId]);

  // Fetch User Permissions
  const { data: permData, refetch: refetchPerms } = useQuery(
    GET_CONNECTION_PERMISSIONS_QUERY,
    {
      variables: { connectionId: selectedConnectionId },
      skip: !isOpen || !selectedConnectionId,
      fetchPolicy: 'network-only',
    },
  );
  const permissions = permData?.connectionPermissions || [];

  // Fetch Team Connection Permissions
  const { data: teamPermData, refetch: refetchTeamPerms } = useQuery(
    GET_TEAM_CONNECTION_PERMISSIONS_QUERY,
    {
      variables: { connectionId: selectedConnectionId },
      skip: !isOpen || !selectedConnectionId,
      fetchPolicy: 'network-only',
    },
  );
  const teamPermissions = teamPermData?.teamConnectionPermissions || [];

  // Mutations
  const [inviteMember, { loading: inviting }] = useMutation(INVITE_WORKSPACE_MEMBER_MUTATION);
  const [updateRole] = useMutation(UPDATE_WORKSPACE_MEMBER_ROLE_MUTATION);
  const [removeMember] = useMutation(REMOVE_WORKSPACE_MEMBER_MUTATION);
  const [setConnectionPermission] = useMutation(SET_CONNECTION_PERMISSION_MUTATION);

  const [createTeam, { loading: creatingTeam }] = useMutation(CREATE_TEAM_MUTATION);
  const [updateTeam, { loading: updatingTeam }] = useMutation(UPDATE_TEAM_MUTATION);
  const [addTeamMember] = useMutation(ADD_TEAM_MEMBER_MUTATION);
  const [removeTeamMember] = useMutation(REMOVE_TEAM_MEMBER_MUTATION);
  const [deleteTeam] = useMutation(DELETE_TEAM_MUTATION);
  const [setTeamConnectionPermission] = useMutation(SET_TEAM_CONNECTION_PERMISSION_MUTATION);

  const [updateWorkspace, { loading: savingWorkspace }] = useMutation(UPDATE_WORKSPACE_MUTATION, {
    refetchQueries: [{ query: LIST_WORKSPACES_QUERY }],
  });
  const [deleteWorkspace, { loading: deletingWorkspace }] = useMutation(DELETE_WORKSPACE_MUTATION, {
    refetchQueries: [{ query: LIST_WORKSPACES_QUERY }],
  });

  if (!isOpen) return null;

  // Workspace Actions
  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWorkspaceName.trim()) return;

    try {
      await updateWorkspace({
        variables: {
          input: {
            workspaceId,
            name: editWorkspaceName.trim(),
          },
        },
      });
      setIsRenamingWorkspace(false);
    } catch (err) {
      console.error('Failed to update workspace:', err);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (deleteConfirmInput !== workspaceName) return;

    try {
      await deleteWorkspace({
        variables: { workspaceId },
      });
      setActiveWorkspaceId(null);
      onClose();
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    }
  };

  // Member Actions
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      await inviteMember({
        variables: {
          input: {
            workspaceId,
            email: inviteEmail.trim(),
            role: inviteRole,
          },
        },
      });
      setInviteEmail('');
      refetchMembers();
    } catch (err) {
      console.error('Failed to invite member:', err);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    try {
      await updateRole({
        variables: {
          input: {
            workspaceId,
            memberId,
            role: newRole,
          },
        },
      });
      refetchMembers();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return;
    try {
      await removeMember({
        variables: { workspaceId, memberId },
      });
      refetchMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  // Team Actions
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      await createTeam({
        variables: {
          input: {
            workspaceId,
            name: newTeamName.trim(),
            description: newTeamDescription.trim() || undefined,
          },
        },
      });
      setNewTeamName('');
      setNewTeamDescription('');
      setShowCreateTeam(false);
      refetchTeams();
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  const startEditTeam = (team: any) => {
    setEditingTeamId(team.id);
    setEditTeamName(team.name);
    setEditTeamDescription(team.description || '');
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeamId || !editTeamName.trim()) return;

    try {
      await updateTeam({
        variables: {
          input: {
            workspaceId,
            teamId: editingTeamId,
            name: editTeamName.trim(),
            description: editTeamDescription.trim() || undefined,
          },
        },
      });
      setEditingTeamId(null);
      refetchTeams();
    } catch (err) {
      console.error('Failed to update team:', err);
    }
  };

  const handleAddMemberToTeam = async (teamId: string, userId: string) => {
    if (!userId) return;
    try {
      await addTeamMember({
        variables: { input: { teamId, userId } },
      });
      refetchTeams();
    } catch (err) {
      console.error('Failed to add member to team:', err);
    }
  };

  const handleRemoveMemberFromTeam = async (teamId: string, userId: string) => {
    try {
      await removeTeamMember({
        variables: { input: { teamId, userId } },
      });
      refetchTeams();
    } catch (err) {
      console.error('Failed to remove member from team:', err);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      await deleteTeam({
        variables: { workspaceId, teamId },
      });
      refetchTeams();
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  };

  const handleSetUserPerm = async (userId: string, accessLevel: ConnectionAccessLevel) => {
    try {
      await setConnectionPermission({
        variables: {
          input: {
            connectionId: selectedConnectionId,
            userId,
            accessLevel,
          },
        },
      });
      refetchPerms();
    } catch (err) {
      console.error('Failed to set user permission:', err);
    }
  };

  const handleSetTeamPerm = async (teamId: string, accessLevel: ConnectionAccessLevel) => {
    try {
      await setTeamConnectionPermission({
        variables: {
          input: {
            connectionId: selectedConnectionId,
            teamId,
            accessLevel,
          },
        },
      });
      refetchTeamPerms();
    } catch (err) {
      console.error('Failed to set team permission:', err);
    }
  };

  const getRoleBadge = (role: WorkspaceRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-[#d29922]/20 text-[#d29922] border-[#d29922]/30';
      case 'ADMIN':
        return 'bg-[#bc8cff]/20 text-[#bc8cff] border-[#bc8cff]/30';
      case 'MEMBER':
        return 'bg-[#58a6ff]/20 text-[#58a6ff] border-[#388bfd]/30';
      case 'READONLY':
        return 'bg-[#21262d] text-[#8b949e] border-[#30363d]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-[#161b22] w-full max-w-2xl rounded-2xl border border-[#30363d] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#c9d1d9]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff] border border-[#388bfd]/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">{workspaceName}</h2>
                <span className={`text-[10px] px-2 py-0.2 rounded border font-semibold ${getRoleBadge(currentUserRole || 'MEMBER')}`}>
                  {currentUserRole || 'MEMBER'}
                </span>
              </div>
              <p className="text-[11px] text-[#8b949e]">GitHub-style teams, permissions & workspace settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#30363d] bg-[#161b22] flex items-center space-x-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'members'
                ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`py-2.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'teams'
                ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-[#bc8cff]" />
            <span>Teams ({teams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-2.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'permissions'
                ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#3fb950]" />
            <span>Access Permissions</span>
          </button>

          {canManage && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2.5 border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'settings'
                  ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
                  : 'border-transparent text-[#8b949e] hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-[#d29922]" />
              <span>Settings</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* 1. MEMBERS TAB */}
          {activeTab === 'members' && (
            <>
              {canManage && (
                <form onSubmit={handleInvite} className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-white">
                    <UserPlus className="w-3.5 h-3.5 text-[#58a6ff]" />
                    <span>Invite New Member</span>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-7 relative">
                      <Mail className="w-3.5 h-3.5 text-[#8b949e] absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                      />
                    </div>
                    <div className="col-span-3">
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                      >
                        <option value="MEMBER">Member (Write)</option>
                        <option value="ADMIN">Admin</option>
                        <option value="READONLY">Read-Only</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <button
                        type="submit"
                        disabled={inviting || !inviteEmail.trim()}
                        className="w-full h-full inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                      >
                        {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Invite'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="rounded-xl border border-[#30363d] overflow-hidden bg-[#0d1117]">
                <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] font-semibold uppercase tracking-wider">
                  <span>Member Email</span>
                  <span>Workspace Role</span>
                </div>
                <div className="divide-y divide-[#21262d]">
                  {loadingMembers ? (
                    <div className="p-6 flex items-center justify-center text-[#8b949e] text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-[#58a6ff] mr-2" />
                      <span>Loading team members...</span>
                    </div>
                  ) : (
                    members.map((m: any) => (
                      <div key={m.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#161b22]/50 transition-colors">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-xs font-bold text-white">
                            {m.user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-white font-mono">{m.user.email}</div>
                            <div className="text-[10px] text-[#8b949e]">Joined {new Date(m.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {canManage && m.role !== 'OWNER' ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.id, e.target.value as WorkspaceRole)}
                              className="bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="MEMBER">Member (Write)</option>
                              <option value="READONLY">Read-Only</option>
                            </select>
                          ) : (
                            <span className={`text-[11px] px-2.5 py-0.5 rounded border font-semibold ${getRoleBadge(m.role)}`}>
                              {m.role}
                            </span>
                          )}

                          {canManage && m.role !== 'OWNER' && (
                            <button
                              onClick={() => handleRemove(m.id)}
                              className="p-1 rounded text-[#8b949e] hover:text-[#f85149] hover:bg-[#21262d] transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* 2. TEAMS TAB */}
          {activeTab === 'teams' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#8b949e]">
                  Organize members into functional squads (e.g. <strong>@backend</strong>, <strong>@analysts</strong>)
                </div>
                {canManage && !showCreateTeam && (
                  <button
                    onClick={() => setShowCreateTeam(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Team</span>
                  </button>
                )}
              </div>

              {/* Create Team Form */}
              {showCreateTeam && (
                <form onSubmit={handleCreateTeam} className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Create New Team</span>
                    <button
                      type="button"
                      onClick={() => setShowCreateTeam(false)}
                      className="text-[#8b949e] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#8b949e] mb-1">Team Name</label>
                      <input
                        type="text"
                        required
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. Backend Engineers"
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#8b949e] mb-1">Description (Optional)</label>
                      <input
                        type="text"
                        value={newTeamDescription}
                        onChange={(e) => setNewTeamDescription(e.target.value)}
                        placeholder="e.g. API developers and database maintainers"
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCreateTeam(false)}
                      className="px-3 py-1 rounded text-xs text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingTeam || !newTeamName.trim()}
                      className="px-3 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold disabled:opacity-50"
                    >
                      {creatingTeam ? 'Creating...' : 'Save Team'}
                    </button>
                  </div>
                </form>
              )}

              {/* Teams List */}
              <div className="space-y-3">
                {teams.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#0d1117] border border-[#30363d] text-center text-xs text-[#8b949e]">
                    No teams configured yet. Create a team to grant group permissions across database connections.
                  </div>
                ) : (
                  teams.map((team: any) => {
                    const isEditingThisTeam = editingTeamId === team.id;

                    return (
                      <div key={team.id} className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3">
                        {isEditingThisTeam ? (
                          <form onSubmit={handleUpdateTeam} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] text-[#8b949e] mb-1">Team Name</label>
                                <input
                                  type="text"
                                  required
                                  value={editTeamName}
                                  onChange={(e) => setEditTeamName(e.target.value)}
                                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-[#8b949e] mb-1">Description</label>
                                <input
                                  type="text"
                                  value={editTeamDescription}
                                  onChange={(e) => setEditTeamDescription(e.target.value)}
                                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => setEditingTeamId(null)}
                                className="px-2.5 py-1 rounded text-xs text-[#8b949e] hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={updatingTeam || !editTeamName.trim()}
                                className="px-3 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold"
                              >
                                {updatingTeam ? 'Saving...' : 'Update Team'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-white font-mono">@{team.name}</span>
                                <span className="text-[10px] text-[#8b949e] bg-[#161b22] px-2 py-0.5 rounded border border-[#21262d]">
                                  {team.memberCount} member(s)
                                </span>
                              </div>
                              {canManage && (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => startEditTeam(team)}
                                    className="p-1 text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#21262d] rounded transition-colors"
                                    title="Edit team"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTeam(team.id)}
                                    className="p-1 text-[#8b949e] hover:text-[#f85149] hover:bg-[#21262d] rounded transition-colors"
                                    title="Delete team"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {team.description && (
                              <p className="text-[11px] text-[#8b949e]">{team.description}</p>
                            )}

                            {/* Team Member Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {team.members?.map((tm: any) => (
                                <span
                                  key={tm.id}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-[11px] text-[#c9d1d9]"
                                >
                                  <span className="font-mono">{tm.user.email}</span>
                                  {canManage && (
                                    <button
                                      onClick={() => handleRemoveMemberFromTeam(team.id, tm.userId)}
                                      className="text-[#8b949e] hover:text-[#f85149] ml-1"
                                      title="Remove from team"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </span>
                              ))}

                              {canManage && (
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAddMemberToTeam(team.id, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="bg-[#161b22] border border-[#30363d] rounded px-2 py-0.5 text-[11px] text-[#58a6ff] focus:outline-none focus:border-[#58a6ff]"
                                >
                                  <option value="" disabled>
                                    + Add Member
                                  </option>
                                  {members
                                    .filter((m: any) => !team.members?.some((tm: any) => tm.userId === m.userId))
                                    .map((m: any) => (
                                      <option key={m.userId} value={m.userId}>
                                        {m.user.email}
                                      </option>
                                    ))}
                                </select>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. ACCESS PERMISSIONS MATRIX TAB */}
          {activeTab === 'permissions' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-medium text-white">
                  <Database className="w-4 h-4 text-[#58a6ff]" />
                  <span>Select Target Database Connection:</span>
                </div>
                <select
                  value={selectedConnectionId}
                  onChange={(e) => setSelectedConnectionId(e.target.value)}
                  className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                >
                  {connections.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.engine})
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Permissions Section */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-white uppercase tracking-wider">
                  <Briefcase className="w-3.5 h-3.5 text-[#bc8cff]" />
                  <span>Team Permissions</span>
                </div>
                <div className="rounded-xl border border-[#30363d] overflow-hidden bg-[#0d1117]">
                  <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] font-semibold">
                    <span>Team</span>
                    <span>Granted Access Level</span>
                  </div>
                  <div className="divide-y divide-[#21262d]">
                    {teams.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#8b949e]">
                        No teams created in this workspace yet.
                      </div>
                    ) : (
                      teams.map((t: any) => {
                        const tp = teamPermissions.find((p: any) => p.teamId === t.id);
                        const currentLevel = tp ? tp.accessLevel : 'READ';

                        return (
                          <div key={t.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#161b22]/50 transition-colors">
                            <div>
                              <div className="text-xs font-bold text-white font-mono">@{t.name}</div>
                              <div className="text-[10px] text-[#8b949e]">{t.memberCount} member(s)</div>
                            </div>

                            <div>
                              {canManage ? (
                                <select
                                  value={currentLevel}
                                  onChange={(e) => handleSetTeamPerm(t.id, e.target.value as ConnectionAccessLevel)}
                                  className="bg-[#161b22] border border-[#30363d] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                                >
                                  <option value="ADMIN">ADMIN (Full DDL & Config)</option>
                                  <option value="WRITE">WRITE (Maintain & Query)</option>
                                  <option value="READ">READ (Triage & Select Only)</option>
                                </select>
                              ) : (
                                <span className="text-xs font-bold text-[#58a6ff]">{currentLevel}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Direct User Permission Overrides */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-white uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-[#58a6ff]" />
                  <span>Member Specific Overrides</span>
                </div>
                <div className="rounded-xl border border-[#30363d] overflow-hidden bg-[#0d1117]">
                  <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] font-semibold">
                    <span>Member Email</span>
                    <span>Effective Access Level</span>
                  </div>
                  <div className="divide-y divide-[#21262d]">
                    {members.map((m: any) => {
                      const customPerm = permissions.find((p: any) => p.userId === m.userId);
                      const effectiveLevel = m.role === 'OWNER' || m.role === 'ADMIN'
                        ? 'ADMIN'
                        : customPerm
                        ? customPerm.accessLevel
                        : m.role === 'READONLY'
                        ? 'READ'
                        : 'WRITE';

                      return (
                        <div key={m.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#161b22]/50 transition-colors">
                          <div>
                            <div className="text-xs font-medium text-white font-mono">{m.user.email}</div>
                            <div className="text-[10px] text-[#8b949e]">Base Role: {m.role}</div>
                          </div>

                          <div>
                            {canManage && m.role !== 'OWNER' ? (
                              <select
                                value={effectiveLevel}
                                onChange={(e) => handleSetUserPerm(m.userId, e.target.value as ConnectionAccessLevel)}
                                className="bg-[#161b22] border border-[#30363d] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                              >
                                <option value="ADMIN">ADMIN (Full DDL & Config)</option>
                                <option value="WRITE">WRITE (Maintain & Query)</option>
                                <option value="READ">READ (Triage & Select Only)</option>
                              </select>
                            ) : (
                              <span className="text-xs font-bold text-[#d29922]">
                                ADMIN (Workspace Owner)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. SETTINGS TAB */}
          {activeTab === 'settings' && canManage && (
            <div className="space-y-6">
              {/* Rename Workspace */}
              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-white">
                  <Edit2 className="w-3.5 h-3.5 text-[#58a6ff]" />
                  <span>Rename Workspace</span>
                </div>
                <form onSubmit={handleUpdateWorkspace} className="flex items-center space-x-2">
                  <input
                    type="text"
                    required
                    value={editWorkspaceName}
                    onChange={(e) => setEditWorkspaceName(e.target.value)}
                    className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                  />
                  <button
                    type="submit"
                    disabled={savingWorkspace || !editWorkspaceName.trim() || editWorkspaceName === workspaceName}
                    className="px-4 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold disabled:opacity-50 transition-all flex items-center space-x-1"
                  >
                    {savingWorkspace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save</span>
                  </button>
                </form>
              </div>

              {/* Danger Zone: Delete Workspace */}
              {isOwner && (
                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#f85149]/40 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#f85149]">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Danger Zone: Delete Workspace</span>
                  </div>
                  <p className="text-[11px] text-[#8b949e]">
                    Deleting this workspace will permanently remove all teams, database connections, diagrams, and query histories associated with it. This action cannot be undone.
                  </p>

                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] text-[#8b949e]">
                      Please type <strong className="text-white font-mono">{workspaceName}</strong> to confirm:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        placeholder={workspaceName}
                        className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#f85149]"
                      />
                      <button
                        type="button"
                        onClick={handleDeleteWorkspace}
                        disabled={deletingWorkspace || deleteConfirmInput !== workspaceName}
                        className="px-4 py-1.5 rounded-lg bg-[#da3633] hover:bg-[#b62324] text-white text-xs font-semibold disabled:opacity-40 transition-all flex items-center space-x-1"
                      >
                        {deletingWorkspace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        <span>Delete Workspace</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
