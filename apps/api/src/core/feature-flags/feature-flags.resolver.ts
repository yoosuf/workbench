import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagGql } from './feature-flags.model';
import { Public } from '../security';

@Resolver(() => FeatureFlagGql)
export class FeatureFlagsResolver {
  constructor(private featureFlagsService: FeatureFlagsService) {}

  @Public()
  @Query(() => [FeatureFlagGql], { description: 'Get all platform feature flags with evaluation states' })
  featureFlags(): FeatureFlagGql[] {
    return this.featureFlagsService.getAllFlags();
  }

  @Public()
  @Query(() => Boolean, { description: 'Check if a specific feature flag is currently active' })
  isFeatureEnabled(@Args('key') key: string): boolean {
    return this.featureFlagsService.isEnabled(key);
  }

  @Public()
  @Mutation(() => Boolean, { description: 'Dynamically toggle feature flag state for testing/development' })
  setFeatureFlagOverride(
    @Args('key') key: string,
    @Args('enabled') enabled: boolean,
  ): boolean {
    return this.featureFlagsService.setFlagOverride(key, enabled);
  }
}
