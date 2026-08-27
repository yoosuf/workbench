import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { QueryExecutionService } from './query-execution.service';
import {
  QueryHistoryItem,
  QueryResultGql,
  SavedQueryItem,
} from './models/query-execution.model';
import {
  ExecuteQueryInput,
  SaveQueryInput,
} from './dto/query-execution.dto';
import { GqlAuthGuard, CurrentUser } from '../../core/security';
import { User } from '../identity-access/models/user.model';

@Resolver()
@UseGuards(GqlAuthGuard)
export class QueryExecutionResolver {
  constructor(private queryExecutionService: QueryExecutionService) {}

  @Mutation(() => QueryResultGql)
  async executeQuery(
    @CurrentUser() user: User,
    @Args('input') input: ExecuteQueryInput,
  ): Promise<QueryResultGql> {
    return this.queryExecutionService.executeQuery(user.id, input);
  }

  @Query(() => [QueryHistoryItem])
  async queryHistory(
    @CurrentUser() user: User,
    @Args('connectionId', { type: () => ID }) connectionId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit?: number,
  ): Promise<QueryHistoryItem[]> {
    return this.queryExecutionService.getQueryHistory(user.id, connectionId, limit);
  }

  @Mutation(() => SavedQueryItem)
  async saveQuery(
    @CurrentUser() user: User,
    @Args('input') input: SaveQueryInput,
  ): Promise<SavedQueryItem> {
    return this.queryExecutionService.saveQuery(user.id, input);
  }

  @Query(() => [SavedQueryItem])
  async listSavedQueries(
    @CurrentUser() user: User,
    @Args('connectionId', { type: () => ID }) connectionId: string,
  ): Promise<SavedQueryItem[]> {
    return this.queryExecutionService.listSavedQueries(user.id, connectionId);
  }

  @Mutation(() => Boolean)
  async deleteSavedQuery(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.queryExecutionService.deleteSavedQuery(user.id, id);
  }
}
