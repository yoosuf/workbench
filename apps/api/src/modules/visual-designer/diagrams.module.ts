import { Module } from '@nestjs/common';
import { DiagramsService } from './diagrams.service';
import { DiagramsResolver } from './diagrams.resolver';
import { ConnectionsModule } from '../connection-manager';
import { WorkspacesModule } from '../tenancy';

@Module({
  imports: [ConnectionsModule, WorkspacesModule],
  providers: [DiagramsService, DiagramsResolver],
  exports: [DiagramsService],
})
export class DiagramsModule {}
