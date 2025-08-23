import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCapsuleDto } from './dto/create-capsule.dto';
import { UpdateCapsuleDto } from './dto/update-capsule.dto';
import { Capsule } from '@prisma/client';

export interface CapsuleCreator {
	id: number;
	email: string;
	name: string | null;
}
export interface CapsuleWithUser extends Capsule {
	user: CapsuleCreator;
}


@Injectable()
export class CapsulesService {
	constructor(private prisma: PrismaService) {}

		async create(userId: number, dto: CreateCapsuleDto, images: string[] = []): Promise<CapsuleWithUser> {
			return (await this.prisma.capsule.create({
				data: {
					userId,
					title: dto.title,
					content: dto.content,
					isPublic: dto.isPublic ?? false,
					unlockAt: new Date(dto.unlockAt),
					images,
				},
				include: { user: { select: { id: true, email: true, name: true } } },
			})) as CapsuleWithUser;
		}

	async findMine(userId: number, page = 1, limit = 20): Promise<{ data: CapsuleWithUser[]; total: number; page: number; limit: number; }> {
		const [total, data] = await this.prisma.$transaction([
			this.prisma.capsule.count({ where: { userId } }),
			this.prisma.capsule.findMany({
				where: { userId },
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
				include: { user: { select: { id: true, email: true, name: true } } },
			}),
		]);
		return { data, total, page, limit };
	}

	async findPublic(page = 1, limit = 20): Promise<{ data: CapsuleWithUser[]; total: number; page: number; limit: number; }> {
		const where = { isPublic: true } as const; // include locked (future unlockAt) capsules too
		const [total, data] = await this.prisma.$transaction([
			this.prisma.capsule.count({ where }),
			this.prisma.capsule.findMany({
				where,
				orderBy: { createdAt: 'desc' }, // newest first per requirement
				skip: (page - 1) * limit,
				take: limit,
				include: { user: { select: { id: true, email: true, name: true } } },
			}),
		]);
		return { data, total, page, limit };
	}

	async findByIdAuthorized(userId: number, id: number): Promise<CapsuleWithUser> {
		const capsule = (await this.prisma.capsule.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, name: true } } } })) as CapsuleWithUser;
		if (!capsule) throw new NotFoundException('Capsule not found');
		if (capsule.userId !== userId) throw new ForbiddenException();
		return capsule;
	}

	async findById(id: number): Promise<CapsuleWithUser | null> {
		return (await this.prisma.capsule.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, name: true } } } })) as CapsuleWithUser | null;
	}

	async findPublicById(id: number): Promise<CapsuleWithUser> {
		const capsule = (await this.prisma.capsule.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, name: true } } } })) as CapsuleWithUser;
		if (!capsule) throw new NotFoundException('Capsule not found');
		const now = new Date();
		if (!(capsule.isPublic && capsule.unlockAt <= now)) {
			// Hide existence
			throw new NotFoundException('Capsule not found');
		}
		return capsule;
	}

	async update(userId: number, id: number, dto: UpdateCapsuleDto): Promise<CapsuleWithUser> {
		await this.ensureOwnership(userId, id);
		return (await this.prisma.capsule.update({
			where: { id },
			data: {
				title: dto.title,
				content: dto.content,
				isPublic: dto.isPublic,
				unlockAt: dto.unlockAt ? new Date(dto.unlockAt) : undefined,
				images: dto.images,
			},
			include: { user: { select: { id: true, email: true, name: true } } },
		})) as CapsuleWithUser;
	}

	async remove(userId: number, id: number): Promise<void> {
		await this.ensureOwnership(userId, id);
		await this.prisma.capsule.delete({ where: { id } });
	}

	// getUserBasic no longer needed (user always included)

	private async ensureOwnership(userId: number, id: number) {
		const capsule = await this.prisma.capsule.findUnique({ where: { id } });
		if (!capsule) throw new NotFoundException('Capsule not found');
		if (capsule.userId !== userId) throw new ForbiddenException();
	}
}
