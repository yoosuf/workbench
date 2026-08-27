import { Global, Module } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsResolver } from './feature-flags.resolver';
import { FeatureFlagGuard } from './feature-flag.guard';

@Global()
@Module({
  providers: [FeatureFlagsService, FeatureFlagsResolver, FeatureFlagGuard],
  exports: [FeatureFlagsService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
