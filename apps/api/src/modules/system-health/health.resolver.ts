import { Query, Resolver } from '@nestjs/graphql';
import { Public } from '../../core/security';

@Resolver()
export class HealthResolver {
  @Public()
  @Query(() => String)
  health(): string {
    return `OK - ${new Date().toISOString()}`;
  }
}
