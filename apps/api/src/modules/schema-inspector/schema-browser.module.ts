import { Module } from '@nestjs/common';
import { SchemaBrowserService } from './schema-browser.service';
import {
  SchemaBrowserResolver,
  SchemaInfoResolver,
  TableInfoResolver,
} from './schema-browser.resolver';
import { TableMetadataLoaderService } from './dataloaders/table-metadata.loader';
import { ConnectionsModule } from '../connection-manager';

@Module({
  imports: [ConnectionsModule],
  providers: [
    SchemaBrowserService,
    SchemaBrowserResolver,
    SchemaInfoResolver,
    TableInfoResolver,
    TableMetadataLoaderService,
  ],
  exports: [SchemaBrowserService, TableMetadataLoaderService],
})
export class SchemaBrowserModule {}
