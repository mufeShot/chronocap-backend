import { Body, Controller, Get, Post, UseGuards, createParamDecorator, ExecutionContext } from '@nestjs/common';
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
	constructor(private auth: AuthService) {}

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

	@UseGuards(JwtAuthGuard)
	@Get('me')
	me(@CurrentUser() user: JwtAuthUser) {
		return this.auth.currentUser(user.userId);
	}
}
