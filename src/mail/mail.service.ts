/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { buildVerificationEmail } from './templates/verification-email';

@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name);
	private readonly resend?: Resend;
	private readonly from: string;

	constructor(private cfg: ConfigService, private prisma: PrismaService) {
		const key = cfg.get<string>('RESEND_API_KEY');
		this.from = cfg.get<string>('MAIL_FROM') || 'Chronocap <no-reply@chronocap.example>';
		if (key) {
			this.resend = new Resend(key);
		} else {
			this.logger.warn('RESEND_API_KEY not configured; emails will be logged only.');
		}
	}

	private generateToken(): string {
		return randomBytes(32).toString('hex');
	}

	async sendEmailVerification(user: { id: number; email: string }) {
		const token = this.generateToken();
		const log = await (this.prisma as any).mailLog.create({
			data: {
				userId: user.id,
				type: 'EMAIL_VERIFICATION',
				status: 'PENDING',
				token,
			},
		});
		const verifyUrl = `${this.cfg.get('PUBLIC_BASE_URL') || ''}/auth/verify-email?token=${token}`;
		const { subject, html, text } = buildVerificationEmail({
			verifyUrl,
			userName: (await (this.prisma as any).user.findUnique({ where: { id: user.id }, select: { name: true } }))?.name,
			appName: this.cfg.get('APP_NAME') || 'Chronocap',
		});

		if (!this.resend) {
			this.logger.log(`[DEV-EMAIL] (simulated send) to=${user.email} subject="${subject}" url=${verifyUrl}`);
			await (this.prisma as any).mailLog.update({ where: { id: log.id }, data: { status: 'SENT' } });
			this.logger.log(`Verification email (simulated) marked SENT for ${user.email}`);
			return { simulated: true };
		}
		try {
			const primaryFrom = this.from;
			const attempt = async (fromValue: string) => this.resend!.emails.send({
				from: fromValue,
				to: [user.email],
				subject,
				html,
				text,
			});
			let { data, error }: any = await attempt(primaryFrom);
			if (error) {
				const raw = error.message || error.error || JSON.stringify(error);
				const needsFallback = /not verified/i.test(raw) && !/onboarding@resend\.dev/i.test(primaryFrom);
				if (needsFallback) {
					const fallbackFrom = 'Chronocap <onboarding@resend.dev>';
					this.logger.warn(`Domain not verified for '${primaryFrom}'. Falling back to shared domain '${fallbackFrom}'.`);
					({ data, error } = await attempt(fallbackFrom));
				}
			}
			if (error) {
				this.logger.error(`Resend API error sending verification email to ${user.email}: ${error.message || error.error || JSON.stringify(error)}`);
				await (this.prisma as any).mailLog.update({
					where: { id: log.id },
					data: { status: 'FAILED', lastError: error.message || error.error || JSON.stringify(error) },
				});
				return { sent: false, providerError: error };
			}
			await (this.prisma as any).mailLog.update({
				where: { id: log.id },
				data: { status: 'SENT', providerMessageId: data?.id || null },
			});
			this.logger.log(`Verification email sent successfully to ${user.email} (messageId=${data?.id || 'n/a'})`);
			return { sent: true, id: data?.id };
		} catch (e) {
			this.logger.error(`Failed to send verification email to ${user.email}: ${e instanceof Error ? e.message : e}`);
			await (this.prisma as any).mailLog.update({ where: { id: log.id }, data: { status: 'FAILED', lastError: String(e) } });
			return { sent: false };
		}
	}

	async confirmVerification(token: string) {
		const log = await (this.prisma as any).mailLog.findFirst({ where: { token, type: 'EMAIL_VERIFICATION' } });
		if (!log) return { ok: false, reason: 'Invalid token' };
		if (log.status === 'CONFIRMED') return { ok: true, already: true };
		await this.prisma.$transaction([
			(this.prisma as any).user.update({ where: { id: log.userId }, data: { emailVerifiedAt: new Date() } }),
			(this.prisma as any).mailLog.update({ where: { id: log.id }, data: { status: 'CONFIRMED' } }),
		]);
		return { ok: true };
	}
}
