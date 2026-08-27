import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database';
import { ConnectionsService } from '../connection-manager';
import { WorkspacesService } from '../tenancy';
import { NotificationsService } from '../notification-hub';
import { createDbDriver, DriverError } from '@workbench/db-drivers';
import { ConnectionAccessLevel } from '@prisma/client';
import {
  QueryHistoryItem,
  QueryResultGql,
  SavedQueryItem,
} from './models/query-execution.model';
import { ExecuteQueryInput, SaveQueryInput } from './dto/query-execution.dto';

@Injectable()
export class QueryExecutionService {
  constructor(
    private prisma: PrismaService,
    private connectionsService: ConnectionsService,
    private workspacesService: WorkspacesService,
    private notificationsService: NotificationsService,
  ) {}

  async executeQuery(
    userId: string,
    input: ExecuteQueryInput,
  ): Promise<QueryResultGql> {
    const accessLevel = await this.workspacesService.getUserEffectiveAccessLevel(
      userId,
      input.connectionId,
    );

    // Enforce READ access level sandbox
    if (accessLevel === ConnectionAccessLevel.READ) {
      const sanitizedSql = input.sql.trim().toUpperCase();
      const forbiddenCommands = [
        'DROP',
        'ALTER',
        'TRUNCATE',
        'DELETE',
        'UPDATE',
        'INSERT',
        'CREATE',
        'GRANT',
        'REVOKE',
      ];
      for (const cmd of forbiddenCommands) {
        // Match word boundaries
        const regex = new RegExp(`\\b${cmd}\\b`, 'i');
        if (regex.test(sanitizedSql)) {
          const user = await this.prisma.user.findUnique({ where: { id: userId } });
          const conn = await this.prisma.connection.findUnique({ where: { id: input.connectionId } });

          // Asynchronously dispatch security alert
          if (user && conn) {
            this.notificationsService.notifySecurityAlert(
              user.email,
              conn.name,
              cmd,
              `User with READ-only access level attempted prohibited command "${cmd}"`,
            );
          }

          throw new ForbiddenException(
            `Security Error: Your connection access level is "READ". Executing mutating or DDL statement "${cmd}" is prohibited.`,
          );
        }
      }
    }

    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);

    // Default enforcement: 30s timeout and 10,000 row max cap
    const timeoutMs = input.overrideLimits ? 120000 : 30000;
    const maxRows = input.overrideLimits ? 1000000 : 10000;

    const start = Date.now();
    try {
      const result = await driver.executeQuery(config, input.sql, {
        timeoutMs,
        maxRows,
      });
      const durationMs = Date.now() - start;

      // Log successful execution in QueryHistory
      await this.prisma.queryHistory.create({
        data: {
          connectionId: input.connectionId,
          sql: input.sql,
          durationMs,
          rowCount: result.rowCount,
          success: true,
          errorMessage: null,
        },
      });

      return {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        executionTimeMs: result.executionTimeMs,
        truncated: result.truncated,
      };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const errorMessage = err.message || 'Query execution error';

      // Log failed execution in QueryHistory
      await this.prisma.queryHistory.create({
        data: {
          connectionId: input.connectionId,
          sql: input.sql,
          durationMs,
          rowCount: 0,
          success: false,
          errorMessage,
        },
      });

      throw new DriverError(
        err.code || 'QUERY_EXECUTION_ERROR',
        `Query failed: ${errorMessage}`,
        err,
      );
    }
  }

  async getQueryHistory(
    userId: string,
    connectionId: string,
    limit = 50,
  ): Promise<QueryHistoryItem[]> {
    return this.prisma.queryHistory.findMany({
      where: {
        connectionId,
        connection: { userId },
      },
      orderBy: { executedAt: 'desc' },
      take: Math.min(limit, 100),
    });
  }

  async saveQuery(userId: string, input: SaveQueryInput): Promise<SavedQueryItem> {
    const conn = await this.prisma.connection.findFirst({
      where: { id: input.connectionId, userId },
    });
    if (!conn) {
      throw new NotFoundException(`Connection "${input.connectionId}" not found`);
    }

    return this.prisma.savedQuery.create({
      data: {
        connectionId: input.connectionId,
        name: input.name,
        sql: input.sql,
      },
    });
  }

  async listSavedQueries(
    userId: string,
    connectionId: string,
  ): Promise<SavedQueryItem[]> {
    return this.prisma.savedQuery.findMany({
      where: {
        connectionId,
        connection: { userId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSavedQuery(userId: string, id: string): Promise<boolean> {
    const saved = await this.prisma.savedQuery.findFirst({
      where: { id, connection: { userId } },
    });
    if (!saved) {
      throw new NotFoundException(`Saved query "${id}" not found`);
    }

    await this.prisma.savedQuery.delete({
      where: { id },
    });

    return true;
  }
}
