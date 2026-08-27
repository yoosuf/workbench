import { gql } from '@apollo/client';

export const LIST_WORKSPACES_QUERY = gql`
  query ListWorkspaces {
    listWorkspaces {
      id
      name
      slug
      currentUserRole
      createdAt
    }
  }
`;

export const GET_WORKSPACE_MEMBERS_QUERY = gql`
  query GetWorkspaceMembers($workspaceId: ID!) {
    workspaceMembers(workspaceId: $workspaceId) {
      id
      workspaceId
      userId
      role
      user {
        id
        email
      }
      createdAt
    }
  }
`;

export const LIST_TEAMS_QUERY = gql`
  query ListTeams($workspaceId: ID!) {
    listTeams(workspaceId: $workspaceId) {
      id
      workspaceId
      name
      slug
      description
      memberCount
      members {
        id
        userId
        user {
          id
          email
        }
      }
      createdAt
    }
  }
`;

export const CREATE_TEAM_MUTATION = gql`
  mutation CreateTeam($input: CreateTeamInput!) {
    createTeam(input: $input) {
      id
      name
      slug
      description
      memberCount
    }
  }
`;

export const UPDATE_TEAM_MUTATION = gql`
  mutation UpdateTeam($input: UpdateTeamInput!) {
    updateTeam(input: $input) {
      id
      name
      description
    }
  }
`;

export const ADD_TEAM_MEMBER_MUTATION = gql`
  mutation AddTeamMember($input: AddTeamMemberInput!) {
    addTeamMember(input: $input) {
      id
      userId
      user {
        id
        email
      }
    }
  }
`;

export const REMOVE_TEAM_MEMBER_MUTATION = gql`
  mutation RemoveTeamMember($input: RemoveTeamMemberInput!) {
    removeTeamMember(input: $input)
  }
`;

export const DELETE_TEAM_MUTATION = gql`
  mutation DeleteTeam($workspaceId: ID!, $teamId: ID!) {
    deleteTeam(workspaceId: $workspaceId, teamId: $teamId)
  }
`;

export const GET_CONNECTION_PERMISSIONS_QUERY = gql`
  query GetConnectionPermissions($connectionId: ID!) {
    connectionPermissions(connectionId: $connectionId) {
      id
      connectionId
      userId
      accessLevel
      user {
        id
        email
      }
      createdAt
    }
  }
`;

export const GET_TEAM_CONNECTION_PERMISSIONS_QUERY = gql`
  query GetTeamConnectionPermissions($connectionId: ID!) {
    teamConnectionPermissions(connectionId: $connectionId) {
      id
      teamId
      accessLevel
      team {
        id
        name
        slug
      }
      createdAt
    }
  }
`;

export const CREATE_WORKSPACE_MUTATION = gql`
  mutation CreateWorkspace($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
      id
      name
      slug
      currentUserRole
      createdAt
    }
  }
`;

export const UPDATE_WORKSPACE_MUTATION = gql`
  mutation UpdateWorkspace($input: UpdateWorkspaceInput!) {
    updateWorkspace(input: $input) {
      id
      name
      slug
      currentUserRole
    }
  }
`;

export const DELETE_WORKSPACE_MUTATION = gql`
  mutation DeleteWorkspace($workspaceId: ID!) {
    deleteWorkspace(workspaceId: $workspaceId)
  }
`;

export const INVITE_WORKSPACE_MEMBER_MUTATION = gql`
  mutation InviteWorkspaceMember($input: InviteWorkspaceMemberInput!) {
    inviteWorkspaceMember(input: $input) {
      id
      workspaceId
      userId
      role
      user {
        id
        email
      }
      createdAt
    }
  }
`;

export const UPDATE_WORKSPACE_MEMBER_ROLE_MUTATION = gql`
  mutation UpdateWorkspaceMemberRole($input: UpdateWorkspaceMemberRoleInput!) {
    updateWorkspaceMemberRole(input: $input) {
      id
      role
    }
  }
`;

export const REMOVE_WORKSPACE_MEMBER_MUTATION = gql`
  mutation RemoveWorkspaceMember($workspaceId: ID!, $memberId: ID!) {
    removeWorkspaceMember(workspaceId: $workspaceId, memberId: $memberId)
  }
`;

export const SET_CONNECTION_PERMISSION_MUTATION = gql`
  mutation SetConnectionPermission($input: SetConnectionPermissionInput!) {
    setConnectionPermission(input: $input) {
      id
      connectionId
      userId
      accessLevel
    }
  }
`;

export const SET_TEAM_CONNECTION_PERMISSION_MUTATION = gql`
  mutation SetTeamConnectionPermission($input: SetTeamConnectionPermissionInput!) {
    setTeamConnectionPermission(input: $input) {
      id
      teamId
      accessLevel
    }
  }
`;

export const SET_CONNECTION_DEFAULT_ACCESS_LEVEL_MUTATION = gql`
  mutation SetConnectionDefaultAccessLevel($input: SetConnectionDefaultAccessLevelInput!) {
    setConnectionDefaultAccessLevel(input: $input)
  }
`;
