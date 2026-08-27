import { Module } from '@nestjs/common';
import { QueryExecutionService } from './query-execution.service';
import { QueryExecutionResolver } from './query-execution.resolver';
import { PrismaModule } from '../../core/database';
import { ConnectionsModule } from '../connection-manager';
import { WorkspacesModule } from '../tenancy';
import { NotificationsModule } from '../notification-hub';

@Module({
  imports: [PrismaModule, ConnectionsModule, WorkspacesModule, NotificationsModule],
  providers: [QueryExecutionService, QueryExecutionResolver],
  exports: [QueryExecutionService],
})
export class QueryExecutionModule {}
