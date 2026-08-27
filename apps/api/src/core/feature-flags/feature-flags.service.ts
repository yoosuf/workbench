import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FeatureFlagDefinition,
  FeatureFlagKey,
  FEATURE_FLAG_REGISTRY,
} from './feature-flags.types';
import { FeatureFlagGql } from './feature-flags.model';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly runtimeOverrides = new Map<FeatureFlagKey, boolean>();

  constructor(private configService: ConfigService) {}

  isEnabled(key: FeatureFlagKey | string): boolean {
    const flagKey = key as FeatureFlagKey;
    const definition = FEATURE_FLAG_REGISTRY[flagKey];
    if (!definition) {
      this.logger.warn(`Queried unknown feature flag: "${key}" - defaulting to false`);
      return false;
    }

    // 1. Check in-memory runtime overrides (DevTools / dynamic toggle)
    if (this.runtimeOverrides.has(flagKey)) {
      return this.runtimeOverrides.get(flagKey)!;
    }

    // 2. Check environment variable override (e.g. FEATURE_FLAG_AI_QUERY_ASSIST=true)
    const envKey = `FEATURE_FLAG_${flagKey}`;
    const envVal = this.configService.get<string>(envKey);
    if (envVal !== undefined && envVal !== null) {
      return envVal === 'true' || envVal === '1';
    }

    // 3. Fallback to default registered state
    return definition.enabledByDefault;
  }

  getAllFlags(): FeatureFlagGql[] {
    return Object.values(FEATURE_FLAG_REGISTRY).map((def) => ({
      key: def.key,
      name: def.name,
      description: def.description,
      enabled: this.isEnabled(def.key),
      category: def.category,
    }));
  }

  getFlagsMap(): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    for (const key of Object.keys(FEATURE_FLAG_REGISTRY) as FeatureFlagKey[]) {
      map[key] = this.isEnabled(key);
    }
    return map;
  }

  setFlagOverride(key: FeatureFlagKey | string, enabled: boolean): boolean {
    const flagKey = key as FeatureFlagKey;
    if (!FEATURE_FLAG_REGISTRY[flagKey]) {
      throw new Error(`Cannot override unknown feature flag: "${key}"`);
    }
    this.runtimeOverrides.set(flagKey, enabled);
    this.logger.log(`Feature flag "${key}" overridden to: ${enabled}`);
    return true;
  }

  clearOverrides(): void {
    this.runtimeOverrides.clear();
  }
}
