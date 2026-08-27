import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { WorkspaceRole, ConnectionAccessLevel } from '@prisma/client';

registerEnumType(WorkspaceRole, {
  name: 'WorkspaceRole',
  description: 'Role of a member within a workspace (OWNER, ADMIN, MEMBER, READONLY)',
});

registerEnumType(ConnectionAccessLevel, {
  name: 'ConnectionAccessLevel',
  description: 'Access level for a database connection (ADMIN, WRITE, READ)',
});

@ObjectType()
export class WorkspaceMemberUser {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  email: string;
}

@ObjectType()
export class WorkspaceMember {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  workspaceId: string;

  @Field(() => ID)
  userId: string;

  @Field(() => WorkspaceMemberUser)
  user: WorkspaceMemberUser;

  @Field(() => WorkspaceRole)
  role: WorkspaceRole;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class TeamMember {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  teamId: string;

  @Field(() => ID)
  userId: string;

  @Field(() => WorkspaceMemberUser)
  user: WorkspaceMemberUser;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class Team {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  workspaceId: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  slug: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [TeamMember], { nullable: true })
  members?: TeamMember[];

  @Field(() => Int)
  memberCount: number;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class Workspace {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  slug: string;

  @Field(() => WorkspaceRole, { nullable: true })
  currentUserRole?: WorkspaceRole;

  @Field(() => [WorkspaceMember], { nullable: true })
  members?: WorkspaceMember[];

  @Field(() => [Team], { nullable: true })
  teams?: Team[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class ConnectionPermission {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  connectionId: string;

  @Field(() => ID)
  userId: string;

  @Field(() => WorkspaceMemberUser)
  user: WorkspaceMemberUser;

  @Field(() => ConnectionAccessLevel)
  accessLevel: ConnectionAccessLevel;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class TeamConnectionPermission {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  teamId: string;

  @Field(() => Team)
  team: Team;

  @Field(() => ID)
  connectionId: string;

  @Field(() => ConnectionAccessLevel)
  accessLevel: ConnectionAccessLevel;

  @Field(() => Date)
  createdAt: Date;
}
