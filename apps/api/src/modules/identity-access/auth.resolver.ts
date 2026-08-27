import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthResponse } from './models/auth-response.model';
import { User } from './models/user.model';
import { LoginInput, SignupInput } from './dto/auth.dto';
import { GqlAuthGuard, Public, CurrentUser } from '../../core/security';

interface GqlContext {
  req: Request & { user?: User };
  res: Response;
}

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Public()
  @Mutation(() => AuthResponse)
  async signup(
    @Args('input') input: SignupInput,
    @Context() context: GqlContext,
  ): Promise<AuthResponse> {
    return this.authService.signup(input, context.res);
  }

  @Public()
  @Mutation(() => AuthResponse)
  async login(
    @Args('input') input: LoginInput,
    @Context() context: GqlContext,
  ): Promise<AuthResponse> {
    return this.authService.login(input, context.res);
  }

  @Public()
  @Mutation(() => AuthResponse)
  async refreshToken(@Context() context: GqlContext): Promise<AuthResponse> {
    const refreshToken = context.req.cookies?.workbench_refresh_token;
    return this.authService.refreshToken(refreshToken, context.res);
  }

  @Public()
  @Mutation(() => Boolean)
  async logout(@Context() context: GqlContext): Promise<boolean> {
    return this.authService.logout(context.res);
  }

  @Query(() => User)
  async me(@CurrentUser() user: User): Promise<User> {
    return user;
  }
}
