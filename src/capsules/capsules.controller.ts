import { Controller, Get, Post, Body, UseGuards, Req, Query, Param, ParseIntPipe, Patch, Delete, UploadedFiles, UseInterceptors, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { CapsulesService } from './capsules.service';
import { CreateCapsuleDto } from './dto/create-capsule.dto';
import { UpdateCapsuleDto } from './dto/update-capsule.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';

interface JwtReqUser { userId: number; email: string }
interface UserRequest { user: JwtReqUser }


function imageFileFilter(_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) {
	if (!file.mimetype.startsWith('image/')) {
		return cb(null, false);
	}
	cb(null, true);
}

@Controller('capsules')
export class CapsulesController {
	private useSupabase: boolean;
	constructor(private service: CapsulesService, private config: ConfigService, private storage: StorageService) {
		this.useSupabase = (this.config.get('STORAGE_DRIVER') === 'supabase');
	}

	private static multerOptions = { storage: memoryStorage(), fileFilter: imageFileFilter };

	@UseGuards(JwtAuthGuard)
	@Post()
	@UseInterceptors(FilesInterceptor('images', 10, CapsulesController.multerOptions))
	async create(
		@Req() req: UserRequest,
		@Body() dto: CreateCapsuleDto,
		@UploadedFiles() files?: Express.Multer.File[],
	) {
		// Reconfigure interceptor storage at runtime (workaround: FilesInterceptor decorator evaluated before instance construction)
		// If driver is supabase and current storage isn't memory, we accept buffer because memoryStorage used in buildMulterOptions (not applied dynamically here without custom interceptor).
		let imagePaths: string[] = [];
		if (files && files.length) {
			if (this.useSupabase) {
				const stored = await this.storage.storeCapsuleImages(files);
				imagePaths = stored.map(s => s.url); // store URL directly; alternatively store s.path
			} else {
				imagePaths = files.map(f => f.path.replace(/\\/g, '/'));
			}
		}
		return this.service.create(req.user.userId, dto, imagePaths);
	}

	@UseGuards(JwtAuthGuard)
	@Get()
	async listMine(@Req() req: UserRequest, @Query('page') page = '1', @Query('limit') limit = '20') {
		return this.service.findMine(req.user.userId, parseInt(page, 10), parseInt(limit, 10));
	}

	// Adaptive public/owner detail: if capsule is public we return public view; if private require auth & ownership
	@UseGuards(OptionalJwtAuthGuard)
	@Get(':id')
	async getAdaptive(@Req() req: { user?: JwtReqUser }, @Param('id', ParseIntPipe) id: number) {
		const capsule = await this.service.findById(id);
		if (!capsule) throw new NotFoundException('Capsule not found');
		const isOwner = !!req.user && req.user.userId === capsule.userId;
		const now = Date.now();
		const locked = capsule.unlockAt.getTime() > now;
		if (!capsule.isPublic && !isOwner) {
			throw new ForbiddenException('This capsule is private and cannot be viewed.');
		}
		if (isOwner) {
			return { ...capsule, creator: { id: capsule.user.id, email: capsule.user.email, name: capsule.user.name }, locked: locked && !capsule.isPublic, unlocked: !locked || capsule.isPublic, secondsUntilUnlock: locked ? Math.ceil((capsule.unlockAt.getTime() - now) / 1000) : 0 };
		}
		// public non-owner view
		const secondsUntilUnlock = locked ? Math.ceil((capsule.unlockAt.getTime() - now) / 1000) : 0;
		if (locked) {
			return {
				id: capsule.id,
				title: capsule.title,
				isPublic: capsule.isPublic,
				unlockAt: capsule.unlockAt,
				creator: { id: capsule.user.id, email: capsule.user.email, name: capsule.user.name },
				locked: true,
				unlocked: false,
				secondsUntilUnlock,
				content: null,
				images: [],
				createdAt: capsule.createdAt,
				updatedAt: capsule.updatedAt,
			};
		}
		return { ...capsule, creator: { id: capsule.user.id, email: capsule.user.email, name: capsule.user.name }, locked: false, unlocked: true, secondsUntilUnlock: 0 };
	}

	@UseGuards(JwtAuthGuard)
	@Patch(':id')
	async update(
		@Req() req: UserRequest,
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateCapsuleDto,
	) {
		return this.service.update(req.user.userId, id, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Delete(':id')
	async remove(@Req() req: UserRequest, @Param('id', ParseIntPipe) id: number) {
		await this.service.remove(req.user.userId, id);
		return { success: true };
	}
}
