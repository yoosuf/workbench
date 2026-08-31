import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database';
import { EncryptionService, HostValidator } from '../../core/security';
import { CreateConnectionInput, TestConnectionInput } from './dto/connection.dto';
import { Connection, TestConnectionResult } from './models/connection.model';
import { createDbDriver, ConnectionConfig } from '@workbench/db-drivers';
import { WorkspacesService } from '../tenancy';
import { ConnectionAccessLevel, WorkspaceRole } from '@prisma/client';

@Injectable()
export class ConnectionsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private workspacesService: WorkspacesService,
  ) {}

  private resolveSslConfig(ssl?: boolean, sslMode?: string): any {
    if (!ssl) return undefined;
    return {
      sslMode: (sslMode as any) || 'require',
      rejectUnauthorized: false,
    };
  }

  async testConnection(input: TestConnectionInput): Promise<TestConnectionResult> {
    const validatedHost = HostValidator.validate(input.host);
    const driver = createDbDriver(input.engine);
    const config: ConnectionConfig = {
      host: validatedHost,
      port: input.port,
      database: input.database,
      username: input.username,
      password: input.password,
      ssl: this.resolveSslConfig(input.ssl, input.sslMode),
    };

    const start = Date.now();
    try {
      const success = await driver.testConnection(config);
      const latencyMs = Date.now() - start;
      return {
        success,
        message: success ? 'Connection established successfully.' : 'Could not establish connection.',
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Unknown database connection error.',
        latencyMs: Date.now() - start,
      };
    }
  }

  async testSavedConnection(userId: string, connectionId: string): Promise<TestConnectionResult> {
    const { config } = await this.getDecryptedConfig(userId, connectionId);
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });

    return this.testConnection({
      engine: conn!.engine,
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
      ssl: Boolean(config.ssl),
      sslMode: typeof config.ssl === 'object' ? config.ssl.sslMode : undefined,
    });
  }

  async createConnection(userId: string, input: CreateConnectionInput): Promise<Connection> {
    const validatedHost = HostValidator.validate(input.host);

    // Resolve target workspace
    let targetWorkspaceId = input.workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await this.workspacesService.getOrCreateDefaultWorkspace(userId);
      targetWorkspaceId = defaultWs.id;
    } else {
      // Verify user is a member of this workspace
      await this.workspacesService.getWorkspace(userId, targetWorkspaceId);
    }

    // Securely bundle password and SSL options in AES-256-GCM encrypted payload
    const payload = JSON.stringify({
      password: input.password,
      ssl: input.ssl,
      sslMode: input.sslMode,
    });
    const encryptedPassword = this.encryption.encrypt(payload);

    const record = await this.prisma.connection.create({
      data: {
        userId,
        workspaceId: targetWorkspaceId,
        name: input.name,
        engine: input.engine,
        host: validatedHost,
        port: input.port,
        database: input.database,
        username: input.username,
        encryptedPassword,
        accessLevel: input.accessLevel || ConnectionAccessLevel.WRITE,
      },
    });

    return {
      ...record,
      workspaceId: targetWorkspaceId,
      ssl: input.ssl,
      sslMode: input.sslMode,
      effectiveAccessLevel: ConnectionAccessLevel.ADMIN,
    };
  }

  async listConnections(userId: string, workspaceId?: string): Promise<Connection[]> {
    let whereClause: any;

    if (workspaceId) {
      // Verify user has access to workspace
      await this.workspacesService.getWorkspace(userId, workspaceId);
      whereClause = { workspaceId };
    } else {
      // Return connections across all workspaces user is a member of
      const memberships = await this.prisma.workspaceMember.findMany({
        where: { userId },
        select: { workspaceId: true },
      });
      const workspaceIds = memberships.map((m) => m.workspaceId);
      whereClause = {
        OR: [
          { workspaceId: { in: workspaceIds } },
          { userId }, // Include legacy connections created by user
        ],
      };
    }

    const list = await this.prisma.connection.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const results: Connection[] = [];
    for (const conn of list) {
      let ssl = false;
      let sslMode: string | undefined = undefined;
      try {
        const decrypted = this.encryption.decrypt(conn.encryptedPassword);
        if (decrypted.startsWith('{') && decrypted.endsWith('}')) {
          const parsed = JSON.parse(decrypted);
          ssl = Boolean(parsed.ssl);
          sslMode = parsed.sslMode;
        }
      } catch {
        // Fallback
      }

      let effectiveAccessLevel: ConnectionAccessLevel = ConnectionAccessLevel.READ;
      try {
        effectiveAccessLevel = await this.workspacesService.getUserEffectiveAccessLevel(
          userId,
          conn.id,
        );
      } catch {
        // Not authorized
      }

      results.push({
        ...conn,
        workspaceId: conn.workspaceId ?? undefined,
        ssl,
        sslMode,
        effectiveAccessLevel,
      });
    }

    return results;
  }

  async getConnection(userId: string, id: string): Promise<Connection> {
    const effectiveAccessLevel = await this.workspacesService.getUserEffectiveAccessLevel(
      userId,
      id,
    );

    const conn = await this.prisma.connection.findUnique({
      where: { id },
    });
    if (!conn) {
      throw new NotFoundException(`Connection "${id}" not found`);
    }

    let ssl = false;
    let sslMode: string | undefined = undefined;
    try {
      const decrypted = this.encryption.decrypt(conn.encryptedPassword);
      if (decrypted.startsWith('{') && decrypted.endsWith('}')) {
        const parsed = JSON.parse(decrypted);
        ssl = Boolean(parsed.ssl);
        sslMode = parsed.sslMode;
      }
    } catch {
      // Fallback
    }

    return {
      ...conn,
      workspaceId: conn.workspaceId ?? undefined,
      ssl,
      sslMode,
      effectiveAccessLevel,
    };
  }

  async getDecryptedConfig(userId: string, id: string): Promise<{ engine: string; config: ConnectionConfig }> {
    // Check user has at least READ access level
    await this.workspacesService.getUserEffectiveAccessLevel(userId, id);

    const conn = await this.prisma.connection.findUnique({
      where: { id },
    });
    if (!conn) {
      throw new NotFoundException(`Connection "${id}" not found`);
    }

    let password: string;
    let ssl: any = undefined;

    try {
      const decrypted = this.encryption.decrypt(conn.encryptedPassword);
      if (decrypted.startsWith('{') && decrypted.endsWith('}')) {
        const parsed = JSON.parse(decrypted);
        password = parsed.password;
        if (parsed.ssl) {
          ssl = {
            sslMode: parsed.sslMode || 'require',
            rejectUnauthorized: false,
          };
        }
      } else {
        password = decrypted;
      }
    } catch {
      password = this.encryption.decrypt(conn.encryptedPassword);
    }

    return {
      engine: conn.engine,
      config: {
        host: conn.host,
        port: conn.port,
        database: conn.database,
        username: conn.username,
        password,
        ssl,
      },
    };
  }

  async deleteConnection(userId: string, id: string): Promise<boolean> {
    const effectiveAccessLevel = await this.workspacesService.getUserEffectiveAccessLevel(
      userId,
      id,
    );

    if (effectiveAccessLevel !== ConnectionAccessLevel.ADMIN) {
      throw new ForbiddenException(
        'Security Error: Only Connection Admins and Workspace Owners can delete connections',
      );
    }

    await this.prisma.connection.delete({
      where: { id },
    });

    return true;
  }
}
