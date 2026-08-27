import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WorkspaceRole, ConnectionAccessLevel } from '@prisma/client';

@InputType()
export class CreateWorkspaceInput {
  @Field(() => String)
  @IsNotEmpty({ message: 'Workspace name is required' })
  @IsString()
  name: string;
}

@InputType()
export class UpdateWorkspaceInput {
  @Field(() => ID)
  @IsNotEmpty()
  workspaceId: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Workspace name is required' })
  @IsString()
  name: string;
}

@InputType()
export class InviteWorkspaceMemberInput {
  @Field(() => ID)
  @IsNotEmpty()
  workspaceId: string;

  @Field(() => String)
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @Field(() => WorkspaceRole)
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}

@InputType()
export class UpdateWorkspaceMemberRoleInput {
  @Field(() => ID)
  @IsNotEmpty()
  workspaceId: string;

  @Field(() => ID)
  @IsNotEmpty()
  memberId: string;

  @Field(() => WorkspaceRole)
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}

@InputType()
export class CreateTeamInput {
  @Field(() => ID)
  @IsNotEmpty()
  workspaceId: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Team name is required' })
  @IsString()
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}

@InputType()
export class UpdateTeamInput {
  @Field(() => ID)
  @IsNotEmpty()
  workspaceId: string;

  @Field(() => ID)
  @IsNotEmpty()
  teamId: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Team name is required' })
  @IsString()
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}

@InputType()
export class AddTeamMemberInput {
  @Field(() => ID)
  @IsNotEmpty()
  teamId: string;

  @Field(() => ID)
  @IsNotEmpty()
  userId: string;
}

@InputType()
export class RemoveTeamMemberInput {
  @Field(() => ID)
  @IsNotEmpty()
  teamId: string;

  @Field(() => ID)
  @IsNotEmpty()
  userId: string;
}

@InputType()
export class SetConnectionPermissionInput {
  @Field(() => ID)
  @IsNotEmpty()
  connectionId: string;

  @Field(() => ID)
  @IsNotEmpty()
  userId: string;

  @Field(() => ConnectionAccessLevel)
  @IsEnum(ConnectionAccessLevel)
  accessLevel: ConnectionAccessLevel;
}

@InputType()
export class SetTeamConnectionPermissionInput {
  @Field(() => ID)
  @IsNotEmpty()
  connectionId: string;

  @Field(() => ID)
  @IsNotEmpty()
  teamId: string;

  @Field(() => ConnectionAccessLevel)
  @IsEnum(ConnectionAccessLevel)
  accessLevel: ConnectionAccessLevel;
}

@InputType()
export class SetConnectionDefaultAccessLevelInput {
  @Field(() => ID)
  @IsNotEmpty()
  connectionId: string;

  @Field(() => ConnectionAccessLevel)
  @IsEnum(ConnectionAccessLevel)
  accessLevel: ConnectionAccessLevel;
}
