import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
	constructor(private prisma: PrismaService) {}

	findByEmail(email: string): Promise<User | null> {
		return this.prisma.user.findUnique({ where: { email } });
	}

	findById(id: number): Promise<User | null> {
		return this.prisma.user.findUnique({ where: { id } });
	}

	create(data: { email: string; password: string; name?: string }): Promise<User> {
		return this.prisma.user.create({ data });
	}

	updateRefreshToken(userId: number, token: string | null): Promise<User> {
		return this.prisma.user.update({ where: { id: userId }, data: { refreshToken: token } });
	}
}
