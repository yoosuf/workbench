import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { PrismaService } from '../../core/database';
import { SignupInput, LoginInput } from './dto/auth.dto';
import { AuthResponse } from './models/auth-response.model';
import { NotificationsService } from '../notification-hub';

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    this.refreshSecret =
      this.configService.get<string>('REFRESH_JWT_SECRET') ||
      'workbench_jwt_refresh_secret_super_secure_key_2026';
  }

  async signup(input: SignupInput, res: Response): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    let user;

    if (existing) {
      if (existing.passwordHash === 'INVITED_USER_PENDING') {
        // Activate invited user account
        user = await this.prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash },
        });
      } else {
        throw new ConflictException('A user with this email address already exists');
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: input.email.toLowerCase().trim(),
          passwordHash,
        },
      });
    }

    // Asynchronously dispatch welcome email and in-app notifications
    this.notificationsService.notifyWelcome(user.id, user.email);

    return this.createSession(user, res);
  }

  async login(input: LoginInput, res: Response): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createSession(user, res);
  }

  async refreshToken(refreshToken: string, res: Response): Promise<AuthResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.createSession(user, res);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(res: Response): Promise<boolean> {
    res.clearCookie('workbench_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return true;
  }

  private createSession(user: { id: string; email: string; createdAt: Date }, res: Response): AuthResponse {
    const payload = { sub: user.id, email: user.email };

    // Access Token (15m in-memory)
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    // Refresh Token (7 days httpOnly cookie)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: '7d',
    });

    if (res && typeof res.cookie === 'function') {
      res.cookie('workbench_refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }
}
