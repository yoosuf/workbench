import { Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesResolver } from './workspaces.resolver';
import { PrismaModule } from '../../core/database';
import { NotificationsModule } from '../notification-hub';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [WorkspacesService, WorkspacesResolver],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
