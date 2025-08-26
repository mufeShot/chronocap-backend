import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import type { JwtPayload } from './auth.types';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
interface UserWithVerification { id: number; email: string; name?: string | null; password: string; refreshToken?: string | null; emailVerifiedAt?: Date | null }

@Injectable()
export class AuthService {
    constructor(
        private users: UsersService,
        private jwt: JwtService,
        private mail: MailService,
    ) { }

    private hash(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    private sign(payload: JwtPayload): Promise<string> {
        return this.jwt.signAsync({ sub: payload.sub, email: payload.email });
    }

    private generateRefreshToken(): string {
        return randomBytes(48).toString('hex');
    }

    async register(dto: RegisterDto): Promise<{ access_token: string; refresh_token: string; user: { id: number; email: string; name?: string | null; emailVerified: boolean } }> {
        const existing = await this.users.findByEmail(dto.email);
        if (existing) throw new ConflictException('Email already registered');
        const hashed = await this.hash(dto.password);
        const user = await this.users.create({
            email: dto.email,
            password: hashed,
            name: dto.name, // will be ignored by service
        });
        const access = await this.sign({ sub: user.id, email: user.email });
        const refresh = this.generateRefreshToken();
        await this.users.updateRefreshToken(user.id, refresh);
        // fire-and-forget email verification (await to capture errors gracefully)
    try { await this.mail.sendEmailVerification({ id: user.id, email: user.email }); } catch { /* logged internally */ }
        return {
            access_token: access,
            refresh_token: refresh,
            user: { id: user.id, email: user.email, name: user.name ?? null, emailVerified: false },
        };
    }

    async login(dto: LoginDto): Promise<{ access_token: string; refresh_token: string; user: { id: number; email: string; name?: string | null } }> {
        const user = await this.users.findByEmail(dto.email);
        if (!user) throw new UnauthorizedException('Invalid credentials');
        const valid = await bcrypt.compare(dto.password, user.password);
        if (!valid) throw new UnauthorizedException('Invalid credentials');
        const access = await this.sign({ sub: user.id, email: user.email });
        const refresh = this.generateRefreshToken();
        await this.users.updateRefreshToken(user.id, refresh);
        return {
            access_token: access,
            refresh_token: refresh,
            user: { id: user.id, email: user.email, name: user.name ?? null },
        };
    }

    async currentUser(userId: number): Promise<{ id: number; email: string; name?: string | null; emailVerified: boolean }> {
        const idNum = Number(userId);
    const user = await this.users.findById(idNum) as UserWithVerification | null;
        if (!user) throw new UnauthorizedException();
        return { id: user.id, email: user.email, name: user.name ?? null, emailVerified: !!user.emailVerifiedAt };
    }

    async refresh(userId: number, provided: string): Promise<{ access_token: string; refresh_token: string }> {
        const idNum = Number(userId);
        const user = await this.users.findById(idNum) as { id: number; email: string; password: string; name?: string | null; refreshToken?: string | null } | null;
        if (!user || !user.refreshToken || user.refreshToken !== provided)
            throw new UnauthorizedException('Invalid refresh token');
        const access = await this.sign({ sub: user.id, email: user.email });
        // simple non-rotating (but we reissue a new refresh each time to update TTL client-side)
        const newRefresh = this.generateRefreshToken();
        await this.users.updateRefreshToken(user.id, newRefresh);
        return { access_token: access, refresh_token: newRefresh };
    }

    async logout(userId: number): Promise<void> {
        await this.users.updateRefreshToken(Number(userId), null);
    }

    async verifyEmail(token: string) {
        return this.mail.confirmVerification(token);
    }
}
