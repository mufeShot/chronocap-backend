import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	async onModuleInit() {
		if (process.env.NODE_ENV === 'production') {
			// TEMP debug output (remove later)
			console.log('[PrismaService] NODE_ENV', process.env.NODE_ENV);
			console.log('[PrismaService] DATABASE_URL starts with', (process.env.DATABASE_URL || '').slice(0, 40));
		}
		await this.$connect();
	}

	async onModuleDestroy() {
		await this.$disconnect();
	}
}
