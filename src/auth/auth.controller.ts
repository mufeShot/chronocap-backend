import { Body, Controller, Get, Post, UseGuards, createParamDecorator, ExecutionContext, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt.guard';

import type { JwtAuthUser } from './auth.types';

export const CurrentUser = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): JwtAuthUser => {
		const request = ctx.switchToHttp().getRequest();
		return request.user as JwtAuthUser;
	},
);

@Controller('auth')
export class AuthController {
	constructor(private auth: AuthService, private cfg: ConfigService) {}

	@Post('register')
	register(@Body() dto: RegisterDto) {
		return this.auth.register(dto);
	}

	@Post('login')
	login(@Body() dto: LoginDto) {
		return this.auth.login(dto);
	}

	@Post('refresh')
	refresh(@Body() body: RefreshDto) {
		return this.auth.refresh(body.userId, body.refresh_token);
	}

	@Post('logout')
	@UseGuards(JwtAuthGuard)
	logout(@CurrentUser() user: JwtAuthUser) {
		return this.auth.logout(user.userId);
	}

	@Get('verify-email')
	async verifyEmail(@Query('token') token: string, @Res() res: Response) {
		const result = await this.auth.verifyEmail(token) as { ok: boolean; already?: boolean; reason?: string };
		const frontendRaw = this.cfg.get<string>('FRONTEND_ORIGIN');
		if (!frontendRaw) {
			// fall back to JSON if we don't know where to send user
			return res.status(result.ok ? 200 : 400).json(result);
		}
		// Support comma-separated list; pick first for redirect
		const firstOrigin = frontendRaw.split(',')[0].trim().replace(/\/$/, '');
		let targetBase: URL;
		try {
			targetBase = new URL(firstOrigin);
		} catch {
			return res.status(result.ok ? 200 : 400).json(result); // fallback if malformed
		}
		if (result.ok) {
			// Redirect to dashboard (default path) with flag
			targetBase.pathname = '/dashboard';
			targetBase.searchParams.set('emailVerified', result.already ? 'already' : '1');
			return res.redirect(targetBase.toString());
		} else {
			// Keep error indicators at base origin (or a dedicated route if desired)
			targetBase.searchParams.set('emailVerified', 'error');
			if (result.reason) targetBase.searchParams.set('reason', result.reason);
			return res.redirect(targetBase.toString());
		}
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	me(@CurrentUser() user: JwtAuthUser) {
		return this.auth.currentUser(user.userId);
	}
}
