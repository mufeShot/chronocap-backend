import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CapsulesService } from './capsules.service';

@Controller(['public/capsules','capsules-public'])
export class CapsulesPublicController {
	constructor(private service: CapsulesService) {}

	@Get()
	async list(@Query('page') page = '1', @Query('limit') limit = '20') {
		const { data, total, page: p, limit: l } = await this.service.findPublic(parseInt(page, 10), parseInt(limit, 10));
		const now = Date.now();
		return {
			data: data.map(c => {
				const locked = c.unlockAt.getTime() > now;
				const secondsUntilUnlock = locked ? Math.ceil((c.unlockAt.getTime() - now) / 1000) : 0;
				return {
					id: c.id,
					title: c.title,
					isPublic: c.isPublic,
					unlockAt: c.unlockAt,
					creator: { id: c.user.id, email: c.user.email, name: c.user.name },
					locked,
					unlocked: !locked,
					secondsUntilUnlock,
					content: locked ? null : c.content,
					images: locked ? [] : c.images,
					createdAt: c.createdAt,
					updatedAt: c.updatedAt,
				};
			}),
			total,
			page: p,
			limit: l,
		};
	}

	@Get(':id')
	async getOne(@Param('id', ParseIntPipe) id: number) {
		const capsule = await this.service.findPublicById(id);
		const now = Date.now();
		const locked = capsule.unlockAt.getTime() > now;
		const secondsUntilUnlock = locked ? Math.ceil((capsule.unlockAt.getTime() - now) / 1000) : 0;
		if (locked) {
			return {
				id: capsule.id,
				title: capsule.title,
				isPublic: capsule.isPublic,
				unlockAt: capsule.unlockAt,
				locked: true,
				unlocked: false,
				secondsUntilUnlock,
				content: null,
				images: [],
				createdAt: capsule.createdAt,
				updatedAt: capsule.updatedAt,
			};
		}
		return { ...capsule, locked: false, unlocked: true, secondsUntilUnlock: 0 };
	}

	// Alias: /capsules/:id/public could be added in a separate controller if needed later
}
