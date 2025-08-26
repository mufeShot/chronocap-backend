import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('debug')
class DebugController {
	constructor(private cfg: ConfigService) {}
	@Get('env') env() {
		return {
			nodeEnv: process.env.NODE_ENV,
			frontendOriginEnvVar: process.env.FRONTEND_ORIGIN,
			configModuleValue: this.cfg.get('FRONTEND_ORIGIN'),
			loadedAt: new Date().toISOString(),
		};
	}
}
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CapsulesModule } from './capsules/capsules.module';
import { ResolverModule } from './resolver/resolver.module';
import { StorageModule } from './storage/storage.module';
import { MailModule } from './mail/mail.module';
import { PdfModule } from './pdf/pdf.module';
import { QueueModule } from './queue/queue.module';

@Module({
	imports: [
		// Loads .env.<NODE_ENV> first (development/production) then falls back to base .env
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
		}),
		CommonModule,
		AuthModule,
		UsersModule,
		CapsulesModule,
		ResolverModule,
		StorageModule,
		MailModule,
		PdfModule,
		QueueModule,
	],
	controllers: [AppController, DebugController],
	providers: [AppService],
})
export class AppModule {}
