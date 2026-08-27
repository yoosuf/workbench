import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DiagramsService } from './diagrams.service';
import {
  DiagramSummary,
  DiagramView,
} from './models/diagram.model';
import {
  GenerateDiagramInput,
  SaveDiagramLayoutInput,
} from './dto/diagram.dto';
import {
  AddColumnInput,
  AddForeignKeyInput,
  CreateTableInput,
  DropTableInput,
} from './dto/schema-designer.dto';
import { GqlAuthGuard, CurrentUser } from '../../core/security';
import { User } from '../identity-access/models/user.model';

@Resolver(() => DiagramView)
@UseGuards(GqlAuthGuard)
export class DiagramsResolver {
  constructor(private diagramsService: DiagramsService) {}

  @Mutation(() => DiagramView)
  async generateDiagram(
    @CurrentUser() user: User,
    @Args('input') input: GenerateDiagramInput,
  ): Promise<DiagramView> {
    return this.diagramsService.generateDiagram(user.id, input);
  }

  @Query(() => DiagramView)
  async diagram(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<DiagramView> {
    return this.diagramsService.getDiagram(user.id, id);
  }

  @Query(() => [DiagramSummary])
  async listDiagrams(
    @CurrentUser() user: User,
    @Args('connectionId', { type: () => ID }) connectionId: string,
  ): Promise<DiagramSummary[]> {
    return this.diagramsService.listDiagrams(user.id, connectionId);
  }

  @Mutation(() => Boolean)
  async saveDiagramLayout(
    @CurrentUser() user: User,
    @Args('input') input: SaveDiagramLayoutInput,
  ): Promise<boolean> {
    return this.diagramsService.saveDiagramLayout(user.id, input);
  }

  @Mutation(() => Boolean)
  async deleteDiagram(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.diagramsService.deleteDiagram(user.id, id);
  }

  // Schema Designer Mutations
  @Mutation(() => DiagramView)
  async createTable(
    @CurrentUser() user: User,
    @Args('input') input: CreateTableInput,
  ): Promise<DiagramView> {
    return this.diagramsService.createTable(user.id, input);
  }

  @Mutation(() => DiagramView)
  async addColumn(
    @CurrentUser() user: User,
    @Args('input') input: AddColumnInput,
  ): Promise<DiagramView> {
    return this.diagramsService.addColumn(user.id, input);
  }

  @Mutation(() => DiagramView)
  async addForeignKey(
    @CurrentUser() user: User,
    @Args('input') input: AddForeignKeyInput,
  ): Promise<DiagramView> {
    return this.diagramsService.addForeignKey(user.id, input);
  }

  @Mutation(() => DiagramView)
  async dropTable(
    @CurrentUser() user: User,
    @Args('input') input: DropTableInput,
  ): Promise<DiagramView> {
    return this.diagramsService.dropTable(user.id, input);
  }
}
