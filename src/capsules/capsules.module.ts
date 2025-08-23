import { Module } from '@nestjs/common';
import { CapsulesController } from './capsules.controller';
import { CapsulesPublicController } from './capsules.public.controller';
import { CapsulesService } from './capsules.service';
import { CommonModule } from '../common/common.module';
import { StorageModule } from '../storage/storage.module';

@Module({
	imports: [CommonModule, StorageModule],
	controllers: [CapsulesController, CapsulesPublicController],
	providers: [CapsulesService],
	exports: [CapsulesService],
})
export class CapsulesModule {}
