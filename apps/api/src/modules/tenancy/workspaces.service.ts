import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database';
import {
  AddTeamMemberInput,
  CreateTeamInput,
  CreateWorkspaceInput,
  InviteWorkspaceMemberInput,
  RemoveTeamMemberInput,
  SetConnectionDefaultAccessLevelInput,
  SetConnectionPermissionInput,
  SetTeamConnectionPermissionInput,
  UpdateTeamInput,
  UpdateWorkspaceInput,
  UpdateWorkspaceMemberRoleInput,
} from './dto/workspace.dto';
import {
  Workspace,
  WorkspaceMember,
  ConnectionPermission,
  Team,
  TeamMember,
  TeamConnectionPermission,
} from './models/workspace.model';
import { ConnectionAccessLevel, WorkspaceRole } from '@prisma/client';
import { NotificationsService } from '../notification-hub';

@Injectable()
export class WorkspacesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${base || 'item'}-${Date.now().toString(36)}`;
  }

  async getOrCreateDefaultWorkspace(userId: string): Promise<Workspace> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });

    if (membership?.workspace) {
      return {
        ...membership.workspace,
        currentUserRole: membership.role,
      };
    }

    // Auto-provision personal workspace
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const name = user?.email ? `${user.email.split('@')[0]}'s Workspace` : 'Personal Workspace';
    return this.createWorkspace(userId, { name });
  }

  async createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<Workspace> {
    const slug = this.generateSlug(input.name);

    const workspace = await this.prisma.workspace.create({
      data: {
        name: input.name,
        slug,
        members: {
          create: {
            userId,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });

    return {
      ...workspace,
      currentUserRole: WorkspaceRole.OWNER,
    };
  }

  async updateWorkspace(userId: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    const actorMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId,
        },
      },
    });

    if (!actorMembership || (actorMembership.role !== WorkspaceRole.OWNER && actorMembership.role !== WorkspaceRole.ADMIN)) {
      throw new ForbiddenException('Only Workspace Owners and Admins can update workspace details');
    }

    const updated = await this.prisma.workspace.update({
      where: { id: input.workspaceId },
      data: {
        name: input.name,
      },
    });

    return {
      ...updated,
      currentUserRole: actorMembership.role,
    };
  }

  async deleteWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    const actorMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!actorMembership || actorMembership.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only the Workspace Owner can delete the workspace');
    }

    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return true;
  }

  async listWorkspaces(userId: string): Promise<Workspace[]> {
    await this.getOrCreateDefaultWorkspace(userId);

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      currentUserRole: m.role,
    }));
  }

  async getWorkspace(userId: string, workspaceId: string): Promise<Workspace> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        workspace: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found or unauthorized`);
    }

    return {
      ...membership.workspace,
      currentUserRole: membership.role,
    };
  }

  async getWorkspaceMembers(userId: string, workspaceId: string): Promise<WorkspaceMember[]> {
    await this.getWorkspace(userId, workspaceId);

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      userId: m.userId,
      role: m.role,
      user: {
        id: m.user.id,
        email: m.user.email,
      },
      createdAt: m.createdAt,
    }));
  }

  async inviteMember(userId: string, input: InviteWorkspaceMemberInput): Promise<WorkspaceMember> {
    const actorMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId,
        },
      },
    });

    if (!actorMembership || (actorMembership.role !== WorkspaceRole.OWNER && actorMembership.role !== WorkspaceRole.ADMIN)) {
      throw new ForbiddenException('Only Workspace Owners and Admins can invite members');
    }

    let targetUser = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (!targetUser) {
      targetUser = await this.prisma.user.create({
        data: {
          email: input.email.toLowerCase().trim(),
          passwordHash: 'INVITED_USER_PENDING',
        },
      });
    }

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this workspace');
    }

    const newMember = await this.prisma.workspaceMember.create({
      data: {
        workspaceId: input.workspaceId,
        userId: targetUser.id,
        role: input.role,
      },
      include: { user: true, workspace: true },
    });

    const actorUser = await this.prisma.user.findUnique({ where: { id: userId } });
    const inviterEmail = actorUser?.email || 'A team administrator';

    // Asynchronously dispatch workspace invitation notification
    this.notificationsService.notifyWorkspaceInvite(
      inviterEmail,
      newMember.user.email,
      newMember.workspace.name,
      newMember.role,
    );

    return {
      id: newMember.id,
      workspaceId: newMember.workspaceId,
      userId: newMember.userId,
      role: newMember.role,
      user: {
        id: newMember.user.id,
        email: newMember.user.email,
      },
      createdAt: newMember.createdAt,
    };
  }

  async updateMemberRole(userId: string, input: UpdateWorkspaceMemberRoleInput): Promise<WorkspaceMember> {
    const actorMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId,
        },
      },
    });

    if (!actorMembership || (actorMembership.role !== WorkspaceRole.OWNER && actorMembership.role !== WorkspaceRole.ADMIN)) {
      throw new ForbiddenException('Only Workspace Owners and Admins can update member roles');
    }

    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: { id: input.memberId },
      include: { user: true },
    });

    if (!targetMember || targetMember.workspaceId !== input.workspaceId) {
      throw new NotFoundException('Workspace member not found');
    }

    if (targetMember.role === WorkspaceRole.OWNER && actorMembership.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot modify the workspace owner');
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { id: input.memberId },
      data: { role: input.role },
      include: { user: true },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      userId: updated.userId,
      role: updated.role,
      user: {
        id: updated.user.id,
        email: updated.user.email,
      },
      createdAt: updated.createdAt,
    };
  }

  async removeMember(userId: string, workspaceId: string, memberId: string): Promise<boolean> {
    const actorMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!actorMembership || (actorMembership.role !== WorkspaceRole.OWNER && actorMembership.role !== WorkspaceRole.ADMIN)) {
      throw new ForbiddenException('Only Workspace Owners and Admins can remove members');
    }

    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.workspaceId !== workspaceId) {
      throw new NotFoundException('Workspace member not found');
    }

    if (targetMember.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }

    await this.prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return true;
  }

  // ==========================================
  // TEAMS & TEAM PERMISSIONS
  // ==========================================

  async createTeam(userId: string, input: CreateTeamInput): Promise<Team> {
    await this.getWorkspace(userId, input.workspaceId);
    const slug = this.generateSlug(input.name);

    const team = await this.prisma.team.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        slug,
        description: input.description,
        members: {
          create: { userId },
        },
      },
      include: {
        members: { include: { user: true } },
      },
    });

    return {
      id: team.id,
      workspaceId: team.workspaceId,
      name: team.name,
      slug: team.slug,
      description: team.description ?? undefined,
      memberCount: team.members.length,
      members: team.members.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        userId: m.userId,
        user: { id: m.user.id, email: m.user.email },
        createdAt: m.createdAt,
      })),
      createdAt: team.createdAt,
    };
  }

  async updateTeam(userId: string, input: UpdateTeamInput): Promise<Team> {
    const actorMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: input.workspaceId, userId } },
    });
    if (!actorMembership || (actorMembership.role !== WorkspaceRole.OWNER && actorMembership.role !== WorkspaceRole.ADMIN)) {
      throw new ForbiddenException('Only Workspace Owners and Admins can update teams');
    }

    const targetTeam = await this.prisma.team.findUnique({
      where: { id: input.teamId },
    });
    if (!targetTeam || targetTeam.workspaceId !== input.workspaceId) {
      throw new NotFoundException('Team not found in this workspace');
    }

    const updated = await this.prisma.team.update({
      where: { id: input.teamId },
      data: {
        name: input.name,
        description: input.description,
      },
      include: {
        members: { include: { user: true } },
      },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      name: updated.name,
      slug: updated.slug,
      description: updated.description ?? undefined,
      memberCount: updated.members.length,
      members: updated.members.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        userId: m.userId,
        user: { id: m.user.id, email: m.user.email },
        createdAt: m.createdAt,
      })),
      createdAt: updated.createdAt,
    };
  }

  async listTeams(userId: string, workspaceId: string): Promise<Team[]> {
    await this.getWorkspace(userId, workspaceId);

    const teams = await this.prisma.team.findMany({
      where: { workspaceId },
      include: {
        members: { include: { user: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return teams.map((team) => ({
      id: team.id,
      workspaceId: team.workspaceId,
      name: team.name,
      slug: team.slug,
      description: team.description ?? undefined,
      memberCount: team.members.length,
      members: team.members.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        userId: m.userId,
        user: { id: m.user.id, email: m.user.email },
        createdAt: m.createdAt,
      })),
      createdAt: team.createdAt,
    }));
  }

  async addTeamMember(userId: string, input: AddTeamMemberInput): Promise<TeamMember> {
    const team = await this.prisma.team.findUnique({
      where: { id: input.teamId },
    });
    if (!team) throw new NotFoundException('Team not found');

    await this.getWorkspace(userId, team.workspaceId);

    const member = await this.prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId: input.teamId,
          userId: input.userId,
        },
      },
      create: {
        teamId: input.teamId,
        userId: input.userId,
      },
      update: {},
      include: { user: true, team: { include: { workspace: true } } },
    });

    // Asynchronously dispatch team added notification
    this.notificationsService.notifyTeamMember(
      member.user.id,
      member.user.email,
      member.team.name,
      member.team.workspace.name,
      'ADDED',
    );

    return {
      id: member.id,
      teamId: member.teamId,
      userId: member.userId,
      user: { id: member.user.id, email: member.user.email },
      createdAt: member.createdAt,
    };
  }

  async removeTeamMember(userId: string, input: RemoveTeamMemberInput): Promise<boolean> {
    const team = await this.prisma.team.findUnique({
      where: { id: input.teamId },
      include: { workspace: true },
    });
    if (!team) throw new NotFoundException('Team not found');

    await this.getWorkspace(userId, team.workspaceId);

    const targetUser = await this.prisma.user.findUnique({ where: { id: input.userId } });

    await this.prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId: input.teamId,
          userId: input.userId,
        },
      },
    });

    if (targetUser) {
      this.notificationsService.notifyTeamMember(
        targetUser.id,
        targetUser.email,
        team.name,
        team.workspace.name,
        'REMOVED',
      );
    }

    return true;
  }

  async deleteTeam(userId: string, workspaceId: string, teamId: string): Promise<boolean> {
    const actorMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!actorMembership || (actorMembership.role !== WorkspaceRole.OWNER && actorMembership.role !== WorkspaceRole.ADMIN)) {
      throw new ForbiddenException('Only Workspace Owners and Admins can delete teams');
    }

    await this.prisma.team.delete({
      where: { id: teamId },
    });

    return true;
  }

  async setTeamConnectionPermission(
    userId: string,
    input: SetTeamConnectionPermissionInput,
  ): Promise<TeamConnectionPermission> {
    const effectiveRole = await this.getUserEffectiveAccessLevel(userId, input.connectionId);
    if (effectiveRole !== ConnectionAccessLevel.ADMIN) {
      throw new ForbiddenException('Only connection admins can set team connection permissions');
    }

    const permission = await this.prisma.teamConnectionPermission.upsert({
      where: {
        teamId_connectionId: {
          teamId: input.teamId,
          connectionId: input.connectionId,
        },
      },
      create: {
        teamId: input.teamId,
        connectionId: input.connectionId,
        accessLevel: input.accessLevel,
      },
      update: {
        accessLevel: input.accessLevel,
      },
      include: {
        team: { include: { members: { include: { user: true } } } },
      },
    });

    return {
      id: permission.id,
      teamId: permission.teamId,
      connectionId: permission.connectionId,
      accessLevel: permission.accessLevel,
      team: {
        id: permission.team.id,
        workspaceId: permission.team.workspaceId,
        name: permission.team.name,
        slug: permission.team.slug,
        description: permission.team.description ?? undefined,
        memberCount: permission.team.members.length,
        createdAt: permission.team.createdAt,
      },
      createdAt: permission.createdAt,
    };
  }

  async listTeamConnectionPermissions(
    userId: string,
    connectionId: string,
  ): Promise<TeamConnectionPermission[]> {
    const effectiveRole = await this.getUserEffectiveAccessLevel(userId, connectionId);
    if (effectiveRole !== ConnectionAccessLevel.ADMIN) {
      throw new ForbiddenException('Only connection admins can view team permissions');
    }

    const perms = await this.prisma.teamConnectionPermission.findMany({
      where: { connectionId },
      include: {
        team: { include: { members: { include: { user: true } } } },
      },
    });

    return perms.map((p) => ({
      id: p.id,
      teamId: p.teamId,
      connectionId: p.connectionId,
      accessLevel: p.accessLevel,
      team: {
        id: p.team.id,
        workspaceId: p.team.workspaceId,
        name: p.team.name,
        slug: p.team.slug,
        description: p.team.description ?? undefined,
        memberCount: p.team.members.length,
        createdAt: p.team.createdAt,
      },
      createdAt: p.createdAt,
    }));
  }

  // ==========================================
  // USER PERMISSION RESOLUTION ENGINE
  // ==========================================

  async listConnectionPermissions(userId: string, connectionId: string): Promise<ConnectionPermission[]> {
    const effectiveRole = await this.getUserEffectiveAccessLevel(userId, connectionId);
    if (effectiveRole !== ConnectionAccessLevel.ADMIN) {
      throw new ForbiddenException('Only connection admins can view granular permission matrices');
    }

    const permissions = await this.prisma.connectionPermission.findMany({
      where: { connectionId },
      include: { user: true },
    });

    return permissions.map((p) => ({
      id: p.id,
      connectionId: p.connectionId,
      userId: p.userId,
      accessLevel: p.accessLevel,
      user: {
        id: p.user.id,
        email: p.user.email,
      },
      createdAt: p.createdAt,
    }));
  }

  async setConnectionPermission(userId: string, input: SetConnectionPermissionInput): Promise<ConnectionPermission> {
    const effectiveRole = await this.getUserEffectiveAccessLevel(userId, input.connectionId);
    if (effectiveRole !== ConnectionAccessLevel.ADMIN) {
      throw new ForbiddenException('Only connection admins can set connection permissions');
    }

    const permission = await this.prisma.connectionPermission.upsert({
      where: {
        connectionId_userId: {
          connectionId: input.connectionId,
          userId: input.userId,
        },
      },
      create: {
        connectionId: input.connectionId,
        userId: input.userId,
        accessLevel: input.accessLevel,
      },
      update: {
        accessLevel: input.accessLevel,
      },
      include: { user: true, connection: true },
    });

    const actorUser = await this.prisma.user.findUnique({ where: { id: userId } });

    // Asynchronously dispatch permission updated notification
    this.notificationsService.notifyPermissionChange(
      permission.user.id,
      permission.user.email,
      permission.connection.name,
      permission.accessLevel,
      actorUser?.email,
    );

    return {
      id: permission.id,
      connectionId: permission.connectionId,
      userId: permission.userId,
      accessLevel: permission.accessLevel,
      user: {
        id: permission.user.id,
        email: permission.user.email,
      },
      createdAt: permission.createdAt,
    };
  }

  async setConnectionDefaultAccessLevel(
    userId: string,
    input: SetConnectionDefaultAccessLevelInput,
  ): Promise<boolean> {
    const effectiveRole = await this.getUserEffectiveAccessLevel(userId, input.connectionId);
    if (effectiveRole !== ConnectionAccessLevel.ADMIN) {
      throw new ForbiddenException('Only connection admins can set connection default access level');
    }

    await this.prisma.connection.update({
      where: { id: input.connectionId },
      data: { accessLevel: input.accessLevel },
    });

    return true;
  }

  async getUserEffectiveAccessLevel(
    userId: string,
    connectionId: string,
  ): Promise<ConnectionAccessLevel> {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!conn) {
      throw new NotFoundException(`Connection "${connectionId}" not found`);
    }

    // 1. Direct creator has full admin rights
    if (conn.userId === userId) {
      return ConnectionAccessLevel.ADMIN;
    }

    // 2. If connection belongs to a workspace, check workspace role & team memberships
    if (conn.workspaceId) {
      const membership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: conn.workspaceId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException('You do not have access to this workspace');
      }

      // Workspace Owner/Admin is always Connection Admin
      if (membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN) {
        return ConnectionAccessLevel.ADMIN;
      }

      // 3. Check for direct personal connection permission override
      const directOverride = await this.prisma.connectionPermission.findUnique({
        where: {
          connectionId_userId: {
            connectionId,
            userId,
          },
        },
      });

      if (directOverride) {
        return directOverride.accessLevel;
      }

      // 4. Check for team connection permissions
      const userTeams = await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const teamIds = userTeams.map((t) => t.teamId);

      if (teamIds.length > 0) {
        const teamPerms = await this.prisma.teamConnectionPermission.findMany({
          where: {
            connectionId,
            teamId: { in: teamIds },
          },
        });

        if (teamPerms.length > 0) {
          // Precedence: ADMIN > WRITE > READ
          if (teamPerms.some((p) => p.accessLevel === ConnectionAccessLevel.ADMIN)) {
            return ConnectionAccessLevel.ADMIN;
          }
          if (teamPerms.some((p) => p.accessLevel === ConnectionAccessLevel.WRITE)) {
            return ConnectionAccessLevel.WRITE;
          }
          return ConnectionAccessLevel.READ;
        }
      }

      if (membership.role === WorkspaceRole.READONLY) {
        return ConnectionAccessLevel.READ;
      }

      return conn.accessLevel || ConnectionAccessLevel.WRITE;
    }

    return ConnectionAccessLevel.READ;
  }
}
