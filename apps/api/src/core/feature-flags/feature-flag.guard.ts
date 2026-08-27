import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagKey } from './feature-flags.types';

export const REQUIRE_FEATURE_KEY = 'require_feature_key';
export const RequireFeature = (flag: FeatureFlagKey) =>
  SetMetadata(REQUIRE_FEATURE_KEY, flag);

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlagsService: FeatureFlagsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<FeatureFlagKey>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const isEnabled = this.featureFlagsService.isEnabled(requiredFeature);
    if (!isEnabled) {
      throw new ForbiddenException(
        `Feature "${requiredFeature}" is currently disabled by platform feature flag.`,
      );
    }

    return true;
  }
}
