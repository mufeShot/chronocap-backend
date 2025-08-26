import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { MailService } from './mail.service';
import { MailWebhookController } from './mail.webhook.controller';

@Module({
	imports: [CommonModule],
	providers: [MailService],
	controllers: [MailWebhookController],
	exports: [MailService],
})
export class MailModule {}
