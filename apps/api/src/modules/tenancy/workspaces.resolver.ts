import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import {
  Workspace,
  WorkspaceMember,
  ConnectionPermission,
  Team,
  TeamMember,
  TeamConnectionPermission,
} from './models/workspace.model';
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
import { GqlAuthGuard, CurrentUser } from '../../core/security';
import { User } from '../identity-access/models/user.model';

@Resolver(() => Workspace)
@UseGuards(GqlAuthGuard)
export class WorkspacesResolver {
  constructor(private workspacesService: WorkspacesService) {}

  @Query(() => [Workspace])
  async listWorkspaces(@CurrentUser() user: User): Promise<Workspace[]> {
    return this.workspacesService.listWorkspaces(user.id);
  }

  @Query(() => Workspace)
  async getWorkspace(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Workspace> {
    return this.workspacesService.getWorkspace(user.id, id);
  }

  @Query(() => [WorkspaceMember])
  async workspaceMembers(
    @CurrentUser() user: User,
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
  ): Promise<WorkspaceMember[]> {
    return this.workspacesService.getWorkspaceMembers(user.id, workspaceId);
  }

  @Query(() => [Team])
  async listTeams(
    @CurrentUser() user: User,
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
  ): Promise<Team[]> {
    return this.workspacesService.listTeams(user.id, workspaceId);
  }

  @Query(() => [ConnectionPermission])
  async connectionPermissions(
    @CurrentUser() user: User,
    @Args('connectionId', { type: () => ID }) connectionId: string,
  ): Promise<ConnectionPermission[]> {
    return this.workspacesService.listConnectionPermissions(user.id, connectionId);
  }

  @Query(() => [TeamConnectionPermission])
  async teamConnectionPermissions(
    @CurrentUser() user: User,
    @Args('connectionId', { type: () => ID }) connectionId: string,
  ): Promise<TeamConnectionPermission[]> {
    return this.workspacesService.listTeamConnectionPermissions(user.id, connectionId);
  }

  @Mutation(() => Workspace)
  async createWorkspace(
    @CurrentUser() user: User,
    @Args('input') input: CreateWorkspaceInput,
  ): Promise<Workspace> {
    return this.workspacesService.createWorkspace(user.id, input);
  }

  @Mutation(() => Workspace)
  async updateWorkspace(
    @CurrentUser() user: User,
    @Args('input') input: UpdateWorkspaceInput,
  ): Promise<Workspace> {
    return this.workspacesService.updateWorkspace(user.id, input);
  }

  @Mutation(() => Boolean)
  async deleteWorkspace(
    @CurrentUser() user: User,
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
  ): Promise<boolean> {
    return this.workspacesService.deleteWorkspace(user.id, workspaceId);
  }

  @Mutation(() => WorkspaceMember)
  async inviteWorkspaceMember(
    @CurrentUser() user: User,
    @Args('input') input: InviteWorkspaceMemberInput,
  ): Promise<WorkspaceMember> {
    return this.workspacesService.inviteMember(user.id, input);
  }

  @Mutation(() => WorkspaceMember)
  async updateWorkspaceMemberRole(
    @CurrentUser() user: User,
    @Args('input') input: UpdateWorkspaceMemberRoleInput,
  ): Promise<WorkspaceMember> {
    return this.workspacesService.updateMemberRole(user.id, input);
  }

  @Mutation(() => Boolean)
  async removeWorkspaceMember(
    @CurrentUser() user: User,
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
    @Args('memberId', { type: () => ID }) memberId: string,
  ): Promise<boolean> {
    return this.workspacesService.removeMember(user.id, workspaceId, memberId);
  }

  @Mutation(() => Team)
  async createTeam(
    @CurrentUser() user: User,
    @Args('input') input: CreateTeamInput,
  ): Promise<Team> {
    return this.workspacesService.createTeam(user.id, input);
  }

  @Mutation(() => Team)
  async updateTeam(
    @CurrentUser() user: User,
    @Args('input') input: UpdateTeamInput,
  ): Promise<Team> {
    return this.workspacesService.updateTeam(user.id, input);
  }

  @Mutation(() => TeamMember)
  async addTeamMember(
    @CurrentUser() user: User,
    @Args('input') input: AddTeamMemberInput,
  ): Promise<TeamMember> {
    return this.workspacesService.addTeamMember(user.id, input);
  }

  @Mutation(() => Boolean)
  async removeTeamMember(
    @CurrentUser() user: User,
    @Args('input') input: RemoveTeamMemberInput,
  ): Promise<boolean> {
    return this.workspacesService.removeTeamMember(user.id, input);
  }

  @Mutation(() => Boolean)
  async deleteTeam(
    @CurrentUser() user: User,
    @Args('workspaceId', { type: () => ID }) workspaceId: string,
    @Args('teamId', { type: () => ID }) teamId: string,
  ): Promise<boolean> {
    return this.workspacesService.deleteTeam(user.id, workspaceId, teamId);
  }

  @Mutation(() => ConnectionPermission)
  async setConnectionPermission(
    @CurrentUser() user: User,
    @Args('input') input: SetConnectionPermissionInput,
  ): Promise<ConnectionPermission> {
    return this.workspacesService.setConnectionPermission(user.id, input);
  }

  @Mutation(() => TeamConnectionPermission)
  async setTeamConnectionPermission(
    @CurrentUser() user: User,
    @Args('input') input: SetTeamConnectionPermissionInput,
  ): Promise<TeamConnectionPermission> {
    return this.workspacesService.setTeamConnectionPermission(user.id, input);
  }

  @Mutation(() => Boolean)
  async setConnectionDefaultAccessLevel(
    @CurrentUser() user: User,
    @Args('input') input: SetConnectionDefaultAccessLevelInput,
  ): Promise<boolean> {
    return this.workspacesService.setConnectionDefaultAccessLevel(user.id, input);
  }
}
