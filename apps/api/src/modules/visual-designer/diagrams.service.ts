import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as dagreImport from 'dagre';
import { PrismaService } from '../../core/database';
import { ConnectionsService } from '../connection-manager';
import {
  DiagramColumn,
  DiagramEdge,
  DiagramNode,
  DiagramSummary,
  DiagramView,
} from './models/diagram.model';
import { GenerateDiagramInput, SaveDiagramLayoutInput } from './dto/diagram.dto';
import { createDbDriver, ForeignKeyMeta, TableMeta } from '@workbench/db-drivers';
import {
  AddColumnInput,
  AddForeignKeyInput,
  CreateTableInput,
  DropTableInput,
} from './dto/schema-designer.dto';

import { WorkspacesService } from '../tenancy';
import { ConnectionAccessLevel } from '@prisma/client';

const dagre = (dagreImport as any).default || dagreImport;

interface StoredLayoutNode {
  tableId: string;
  x: number;
  y: number;
}

interface StoredLayout {
  schema: string;
  nodes: StoredLayoutNode[];
}

@Injectable()
export class DiagramsService {
  constructor(
    private prisma: PrismaService,
    private connectionsService: ConnectionsService,
    private workspacesService: WorkspacesService,
  ) {}

  async generateDiagram(
    userId: string,
    input: GenerateDiagramInput,
  ): Promise<DiagramView> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);

    // 1. Introspect all tables in schema
    const rawTables = await driver.listTables(config, input.schema);
    const tables = rawTables.filter((t) => t.kind === 'TABLE');

    // 2. Fetch columns, PKs, and FKs for each table
    const tableDataMap = new Map<
      string,
      { columns: DiagramColumn[]; fks: ForeignKeyMeta[] }
    >();

    for (const table of tables) {
      const rawCols = await driver.getColumns(config, input.schema, table.name);
      const pkCols = await driver.getPrimaryKey(config, input.schema, table.name);
      const fks = await driver.getForeignKeys(config, input.schema, table.name);
      const fkCols = new Set(fks.flatMap((fk) => fk.columns));

      const columns: DiagramColumn[] = rawCols.map((c) => ({
        name: c.name,
        nativeType: c.nativeType,
        dataKind: c.dataKind,
        isPrimaryKey: pkCols.includes(c.name),
        isForeignKey: fkCols.has(c.name),
      }));

      tableDataMap.set(table.name, { columns, fks });
    }

    // 3. Compute initial DAG layout with Dagre
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 120, marginx: 50, marginy: 50 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const table of tables) {
      const colCount = tableDataMap.get(table.name)?.columns.length || 5;
      const height = Math.max(120, 60 + colCount * 28);
      g.setNode(table.name, { width: 240, height });
    }

    // Add edges for Dagre ranking
    for (const table of tables) {
      const fks = tableDataMap.get(table.name)?.fks || [];
      for (const fk of fks) {
        if (g.hasNode(fk.referencedTable)) {
          g.setEdge(table.name, fk.referencedTable);
        }
      }
    }

    dagre.layout(g);

    // 4. Extract layout nodes and live derived edges
    const layoutNodes: StoredLayoutNode[] = [];
    const diagramNodes: DiagramNode[] = [];

    for (const table of tables) {
      const nodeLayout = g.node(table.name);
      const x = nodeLayout ? nodeLayout.x : 100;
      const y = nodeLayout ? nodeLayout.y : 100;

      layoutNodes.push({ tableId: table.name, x, y });

      diagramNodes.push({
        id: table.name,
        tableName: table.name,
        schema: input.schema,
        positionX: x,
        positionY: y,
        columns: tableDataMap.get(table.name)?.columns || [],
      });
    }

    const diagramEdges = this.deriveEdges(tables, tableDataMap);

    const diagramName =
      input.name || `${input.schema} ER Diagram (${new Date().toLocaleDateString()})`;

    // 5. Store in Prisma DB (layout ONLY stores node coordinates; edges are live)
    const storedLayout: StoredLayout = {
      schema: input.schema,
      nodes: layoutNodes,
    };

    const record = await this.prisma.diagram.create({
      data: {
        connectionId: input.connectionId,
        name: diagramName,
        layout: storedLayout as any,
      },
    });

    return {
      id: record.id,
      connectionId: record.connectionId,
      name: record.name,
      schema: input.schema,
      nodes: diagramNodes,
      edges: diagramEdges,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async getDiagram(userId: string, diagramId: string): Promise<DiagramView> {
    const record = await this.prisma.diagram.findUnique({
      where: { id: diagramId },
      include: { connection: true },
    });
    if (!record) {
      throw new NotFoundException(`Diagram with ID "${diagramId}" not found`);
    }

    // Validate user access to the underlying connection
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      record.connectionId,
    );
    const driver = createDbDriver(engine);

    const layout = record.layout as unknown as StoredLayout;
    const schema = layout?.schema || 'public';
    const savedNodes = layout?.nodes || [];
    const positionMap = new Map<string, { x: number; y: number }>();
    for (const n of savedNodes) {
      positionMap.set(n.tableId, { x: n.x, y: n.y });
    }

    const rawTables = await driver.listTables(config, schema);
    const tables = rawTables.filter((t) => t.kind === 'TABLE');

    const tableDataMap = new Map<
      string,
      { columns: DiagramColumn[]; fks: ForeignKeyMeta[] }
    >();

    const diagramNodes: DiagramNode[] = [];

    for (const table of tables) {
      const rawCols = await driver.getColumns(config, schema, table.name);
      const pkCols = await driver.getPrimaryKey(config, schema, table.name);
      const fks = await driver.getForeignKeys(config, schema, table.name);
      const fkCols = new Set(fks.flatMap((fk) => fk.columns));

      const columns: DiagramColumn[] = rawCols.map((c) => ({
        name: c.name,
        nativeType: c.nativeType,
        dataKind: c.dataKind,
        isPrimaryKey: pkCols.includes(c.name),
        isForeignKey: fkCols.has(c.name),
      }));

      tableDataMap.set(table.name, { columns, fks });

      const savedPos = positionMap.get(table.name);
      const x = savedPos ? savedPos.x : 100 + diagramNodes.length * 280;
      const y = savedPos ? savedPos.y : 100;

      diagramNodes.push({
        id: table.name,
        tableName: table.name,
        schema,
        positionX: x,
        positionY: y,
        columns,
      });
    }

    const diagramEdges = this.deriveEdges(tables, tableDataMap);

    return {
      id: record.id,
      connectionId: record.connectionId,
      name: record.name,
      schema,
      nodes: diagramNodes,
      edges: diagramEdges,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async saveDiagramLayout(
    userId: string,
    input: SaveDiagramLayoutInput,
  ): Promise<boolean> {
    const record = await this.prisma.diagram.findUnique({
      where: { id: input.diagramId },
    });
    if (!record) {
      throw new NotFoundException(`Diagram "${input.diagramId}" not found`);
    }

    const accessLevel = await this.workspacesService.getUserEffectiveAccessLevel(
      userId,
      record.connectionId,
    );
    if (accessLevel === ConnectionAccessLevel.READ) {
      throw new ForbiddenException(
        'Security Error: READ access level cannot modify diagram layouts',
      );
    }

    const existingLayout = (record.layout as unknown as StoredLayout) || {
      schema: 'public',
      nodes: [],
    };

    const nodeMap = new Map<string, StoredLayoutNode>();
    for (const n of existingLayout.nodes || []) {
      nodeMap.set(n.tableId, n);
    }

    for (const pos of input.positions) {
      nodeMap.set(pos.nodeId, {
        tableId: pos.nodeId,
        x: pos.x,
        y: pos.y,
      });
    }

    const updatedLayout: StoredLayout = {
      schema: existingLayout.schema,
      nodes: Array.from(nodeMap.values()),
    };

    await this.prisma.diagram.update({
      where: { id: input.diagramId },
      data: {
        layout: updatedLayout as any,
      },
    });

    return true;
  }

  async listDiagrams(userId: string, connectionId: string): Promise<DiagramSummary[]> {
    // Validate that user has access to connection
    await this.connectionsService.getDecryptedConfig(userId, connectionId);

    return this.prisma.diagram.findMany({
      where: { connectionId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        connectionId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteDiagram(userId: string, diagramId: string): Promise<boolean> {
    const record = await this.prisma.diagram.findUnique({
      where: { id: diagramId },
    });
    if (!record) {
      throw new NotFoundException(`Diagram "${diagramId}" not found`);
    }

    const accessLevel = await this.workspacesService.getUserEffectiveAccessLevel(
      userId,
      record.connectionId,
    );
    if (accessLevel === ConnectionAccessLevel.READ) {
      throw new ForbiddenException(
        'Security Error: READ access level cannot delete diagrams',
      );
    }

    await this.prisma.diagram.delete({
      where: { id: diagramId },
    });

    return true;
  }

  // Schema Designer DDL Operations
  async createTable(userId: string, input: CreateTableInput): Promise<DiagramView> {
    const accessLevel = await this.workspacesService.getUserEffectiveAccessLevel(
      userId,
      input.connectionId,
    );
    if (accessLevel === ConnectionAccessLevel.READ) {
      throw new ForbiddenException(
        'Security Error: READ access level cannot execute DDL createTable',
      );
    }

    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);

    // 1. Create table in target database
    await driver.createTable(config, input.schema, {
      tableName: input.tableName,
      primaryKeyColumn: input.primaryKeyColumn || 'id',
      primaryKeyType: input.primaryKeyType,
      columns: input.columns,
      autoTimestamps: input.autoTimestamps,
    });

    // 2. If diagramId exists, record position in layout and return updated diagram
    if (input.diagramId) {
      const record = await this.prisma.diagram.findUnique({
        where: { id: input.diagramId },
      });
      if (record) {
        const existingLayout = (record.layout as unknown as StoredLayout) || {
          schema: input.schema,
          nodes: [],
        };
        const nodes = existingLayout.nodes || [];
        nodes.push({
          tableId: input.tableName,
          x: input.positionX ?? 100,
          y: input.positionY ?? 100,
        });

        await this.prisma.diagram.update({
          where: { id: input.diagramId },
          data: { layout: { ...existingLayout, nodes } as any },
        });

        return this.getDiagram(userId, input.diagramId);
      }
    }

    // Otherwise generate or return fresh view
    return this.generateDiagram(userId, {
      connectionId: input.connectionId,
      schema: input.schema,
      name: `${input.schema} Diagram`,
    });
  }

  async addColumn(userId: string, input: AddColumnInput): Promise<DiagramView> {
    const accessLevel = await this.workspacesService.getUserEffectiveAccessLevel(
      userId,
      input.connectionId,
    );
    if (accessLevel === ConnectionAccessLevel.READ) {
      throw new ForbiddenException(
        'Security Error: READ access level cannot execute DDL addColumn',
      );
    }

    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);

    // 1. Alter table in target DB
    await driver.addColumn(config, input.schema, input.tableName, {
      columnName: input.columnName,
      nativeType: input.nativeType,
      nullable: input.nullable ?? true,
      defaultValue: input.defaultValue,
      isPrimaryKey: input.isPrimaryKey,
    });

    // 2. Return fresh diagram view
    if (input.diagramId) {
      return this.getDiagram(userId, input.diagramId);
    }

    return this.generateDiagram(userId, {
      connectionId: input.connectionId,
      schema: input.schema,
      name: `${input.schema} Diagram`,
    });
  }

  async addForeignKey(
    userId: string,
    input: AddForeignKeyInput,
  ): Promise<DiagramView> {
    const accessLevel = await this.workspacesService.getUserEffectiveAccessLevel(
      userId,
      input.connectionId,
    );
    if (accessLevel === ConnectionAccessLevel.READ) {
      throw new ForbiddenException(
        'Security Error: READ access level cannot execute DDL addForeignKey',
      );
    }

    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);

    // 1. Add foreign key in target DB
    await driver.addForeignKey(config, input.schema, {
      constraintName: input.constraintName,
      sourceTable: input.sourceTable,
      sourceColumn: input.sourceColumn,
      referencedTable: input.referencedTable,
      referencedColumn: input.referencedColumn,
      onDelete: input.onDelete || 'CASCADE',
    });

    // 2. Return fresh diagram view (live FK derivation will immediately reflect the new edge)
    if (input.diagramId) {
      return this.getDiagram(userId, input.diagramId);
    }

    return this.generateDiagram(userId, {
      connectionId: input.connectionId,
      schema: input.schema,
      name: `${input.schema} Diagram`,
    });
  }

  async dropTable(userId: string, input: DropTableInput): Promise<DiagramView> {
    const accessLevel = await this.workspacesService.getUserEffectiveAccessLevel(
      userId,
      input.connectionId,
    );
    if (accessLevel !== ConnectionAccessLevel.ADMIN) {
      throw new ForbiddenException(
        'Security Error: Only Connection Admins can drop database tables',
      );
    }

    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);

    // 1. Drop table in target DB
    await driver.dropTable(config, input.schema, input.tableName);

    // 2. Clean up from layout if diagramId exists
    if (input.diagramId) {
      const record = await this.prisma.diagram.findUnique({
        where: { id: input.diagramId },
      });
      if (record) {
        const existingLayout = (record.layout as unknown as StoredLayout) || {
          schema: input.schema,
          nodes: [],
        };
        const nodes = (existingLayout.nodes || []).filter(
          (n) => n.tableId !== input.tableName,
        );

        await this.prisma.diagram.update({
          where: { id: input.diagramId },
          data: { layout: { ...existingLayout, nodes } as any },
        });

        return this.getDiagram(userId, input.diagramId);
      }
    }

    return this.generateDiagram(userId, {
      connectionId: input.connectionId,
      schema: input.schema,
      name: `${input.schema} Diagram`,
    });
  }

  private deriveEdges(
    tables: TableMeta[],
    tableDataMap: Map<string, { columns: DiagramColumn[]; fks: ForeignKeyMeta[] }>,
  ): DiagramEdge[] {
    const edges: DiagramEdge[] = [];
    const validTableNames = new Set(tables.map((t) => t.name));

    for (const table of tables) {
      const fks = tableDataMap.get(table.name)?.fks || [];
      for (const fk of fks) {
        if (!validTableNames.has(fk.referencedTable)) continue;

        const sourceCol = fk.columns[0] || 'id';
        const targetCol = fk.referencedColumns[0] || 'id';

        edges.push({
          id: `edge_${table.name}_${sourceCol}_to_${fk.referencedTable}_${targetCol}`,
          source: table.name,
          sourceHandle: `handle_src_${sourceCol}`,
          target: fk.referencedTable,
          targetHandle: `handle_tgt_${targetCol}`,
          relationName: fk.name,
          sourceColumn: sourceCol,
          targetColumn: targetCol,
        });
      }
    }

    return edges;
  }
}
