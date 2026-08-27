import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectionsResolver } from './connections.resolver';
import { PrismaModule } from '../../core/database';
import { CryptoModule } from '../../core/security';
import { WorkspacesModule } from '../tenancy';

@Module({
  imports: [PrismaModule, CryptoModule, WorkspacesModule],
  providers: [ConnectionsService, ConnectionsResolver],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
