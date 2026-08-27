import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ConnectionsService } from './connections.service';
import { Connection, TestConnectionResult } from './models/connection.model';
import { CreateConnectionInput, TestConnectionInput } from './dto/connection.dto';
import { GqlAuthGuard, CurrentUser } from '../../core/security';
import { User } from '../identity-access/models/user.model';

@Resolver(() => Connection)
export class ConnectionsResolver {
  constructor(private connectionsService: ConnectionsService) {}

  @Query(() => [Connection])
  async listConnections(
    @CurrentUser() user: User,
    @Args('workspaceId', { type: () => ID, nullable: true }) workspaceId?: string,
  ): Promise<Connection[]> {
    return this.connectionsService.listConnections(user.id, workspaceId);
  }

  @Query(() => Connection)
  async connection(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Connection> {
    return this.connectionsService.getConnection(user.id, id);
  }

  @Mutation(() => TestConnectionResult)
  async testConnection(
    @Args('input') input: TestConnectionInput,
  ): Promise<TestConnectionResult> {
    return this.connectionsService.testConnection(input);
  }

  @Mutation(() => TestConnectionResult)
  async testSavedConnection(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TestConnectionResult> {
    return this.connectionsService.testSavedConnection(user.id, id);
  }

  @Mutation(() => Connection)
  async createConnection(
    @CurrentUser() user: User,
    @Args('input') input: CreateConnectionInput,
  ): Promise<Connection> {
    return this.connectionsService.createConnection(user.id, input);
  }

  @Mutation(() => Boolean)
  async deleteConnection(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.connectionsService.deleteConnection(user.id, id);
  }
}
