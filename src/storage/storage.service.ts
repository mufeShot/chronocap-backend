import { Injectable, OnModuleInit } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface StoredFile {
	originalName: string;
	url: string;
	path: string; // internal path or bucket object key
}

@Injectable()
export class StorageService implements OnModuleInit {
	private uploadDirs = ['uploads/capsule-images'];
	private driver: 'local' | 'supabase';
	private publicBaseUrl: string;
	private supabase?: SupabaseClient;
	private supabaseBucket: string;

	constructor(private config: ConfigService) {
		this.driver = (this.config.get('STORAGE_DRIVER') as 'local' | 'supabase') || 'local';
		this.publicBaseUrl = this.config.get<string>('PUBLIC_BASE_URL') || '';
		this.supabaseBucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET') || 'Chronocap-Files';
		if (process.env.NODE_ENV === 'production') {
			console.log('[StorageService] driver:', this.driver);
			console.log('[StorageService] SUPABASE_URL present?', !!this.config.get<string>('SUPABASE_URL'));
		}
		if (this.driver === 'supabase') {
			const url = this.config.get<string>('SUPABASE_URL');
			const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
			if (url && serviceKey) {
				this.supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
			}
		}
	}

	onModuleInit() {
		if (this.driver === 'local') {
			this.uploadDirs.forEach((dir) => {
				const full = join(process.cwd(), dir);
				if (!existsSync(full)) {
					mkdirSync(full, { recursive: true });
				}
			});
		}
	}

	/** Store in active driver and return public URLs */
	async storeCapsuleImages(files: Express.Multer.File[]): Promise<StoredFile[]> {
		if (!files || files.length === 0) return [];
		if (this.driver === 'local') {
			return this.storeLocalBuffers(files);
		}
		// Supabase: files are in memory (buffer)
		if (!this.supabase) {
			console.error('[StorageService] Supabase client not initialized. Check SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY.');
			return [];
		}
		const results: StoredFile[] = [];
		for (const file of files) {
			const unique = Date.now() + '-' + Math.round(Math.random() * 1e9) + extname(file.originalname);
			const objectPath = `capsule-images/${unique}`;
			if (!file.buffer || !file.buffer.length) {
				console.warn('[StorageService] File has no buffer, skipping', file.originalname);
				continue;
			}
			const { error } = await this.supabase.storage.from(this.supabaseBucket).upload(objectPath, file.buffer, {
				contentType: file.mimetype,
				upsert: false,
			});
			if (error) {
				console.error('[StorageService] Upload error', objectPath, error.message);
				continue;
			}
			// Use public URL (bucket should be made public or you implement signed URLs)
			const { data } = this.supabase.storage.from(this.supabaseBucket).getPublicUrl(objectPath);
			if (!data || !data.publicUrl) {
				console.warn('[StorageService] Missing public URL for', objectPath);
				continue;
			}
			results.push({ originalName: file.originalname, url: data.publicUrl, path: objectPath });
		}
		if (!results.length) {
			console.warn('[StorageService] No images stored to Supabase (all failed or empty).');
		}
		return results;
	}

	private storeLocalBuffers(files: Express.Multer.File[]): StoredFile[] {
		const baseDir = join(process.cwd(), 'uploads', 'capsule-images');
		if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
		return files.map(file => {
			const unique = Date.now() + '-' + Math.round(Math.random() * 1e9) + extname(file.originalname);
			const relPath = `uploads/capsule-images/${unique}`;
			const full = join(process.cwd(), relPath);
			// If buffer exists write it; if it's already a disk file (path) skip writing
			if (file.buffer && file.buffer.length) {
				writeFileSync(full, file.buffer);
			}
			const url = this.publicBaseUrl ? `${this.publicBaseUrl}/${relPath}` : `/${relPath}`;
			return { originalName: file.originalname, url, path: relPath };
		});
	}
}
