import { IsBoolean, IsDateString, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateCapsuleDto {
  @IsString()
  @Length(1, 120)
  title!: string;

  @IsString()
  @MaxLength(10000)
  content!: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;

  @IsDateString()
  unlockAt!: string; // ISO date string
}
