import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
// Core Infrastructure
import { PrismaModule } from './core/database';
import { CryptoModule, GqlAuthGuard } from './core/security';
import { FeatureFlagsModule } from './core/feature-flags';

// Bounded Context Domain Modules
import { AuthModule } from './modules/identity-access';
import { WorkspacesModule } from './modules/tenancy';
import { NotificationsModule } from './modules/notification-hub';
import { ConnectionsModule } from './modules/connection-manager';
import { SchemaBrowserModule } from './modules/schema-inspector';
import { DiagramsModule } from './modules/visual-designer';
import { QueryExecutionModule } from './modules/sql-engine';
import { HealthModule } from './modules/system-health';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      context: ({ req, res }) => ({ req, res }),
    }),
    // Platform Kernel
    PrismaModule,
    CryptoModule,
    FeatureFlagsModule,

    // Enterprise Domain Monolith Modules
    AuthModule,
    WorkspacesModule,
    NotificationsModule,
    ConnectionsModule,
    SchemaBrowserModule,
    DiagramsModule,
    QueryExecutionModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlAuthGuard,
    },
  ],
})
export class AppModule {}
