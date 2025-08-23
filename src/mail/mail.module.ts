import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailWebhookController } from './mail.webhook.controller';

@Module({
	providers: [MailService],
	controllers: [MailWebhookController],
})
export class MailModule {}
