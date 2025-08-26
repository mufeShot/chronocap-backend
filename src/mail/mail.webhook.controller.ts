/* eslint-disable @typescript-eslint/no-explicit-any */
import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

interface ResendEventPayload {
	type?: string;
	data?: { id?: string };
}

@Controller('mail.webhook')
export class MailWebhookController {
	private readonly logger = new Logger(MailWebhookController.name);
	constructor(private prisma: PrismaService) {}

	@Post()
	@HttpCode(200)
	async handle(@Body() payload: ResendEventPayload) {
		const type = payload?.type;
		const messageId = payload?.data?.id;
		if (!type || !messageId) return { ok: true };
		const map: Record<string, string> = {
			'email.sent': 'SENT',
			'email.delivered': 'DELIVERED',
			'email.clicked': 'RECEIVED', // treat click/open as received acknowledgement
			'email.opened': 'RECEIVED',
			'email.bounced': 'FAILED',
			'email.complained': 'FAILED',
		};
		const status = map[type];
		if (!status) return { ok: true };
		try {
			await (this.prisma as any).mailLog.updateMany({
				where: { providerMessageId: messageId, status: { notIn: ['CONFIRMED'] } },
				data: { status },
			});
		} catch (e: unknown) {
			if (e instanceof Error) {
				this.logger.error('Webhook update failed', e.stack);
			} else {
				this.logger.error(`Webhook update failed: ${JSON.stringify(e)}`);
			}
		}
		return { ok: true };
	}
}
