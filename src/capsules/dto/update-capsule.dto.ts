import { IsDateString, IsOptional, IsString, Length, MaxLength, IsBoolean, IsArray, ArrayMaxSize } from 'class-validator';

export class UpdateCapsuleDto {
  @IsString()
  @IsOptional()
  @Length(1, 120)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  content?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsDateString()
  @IsOptional()
  unlockAt?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  images?: string[]; // set explicitly (replace) not patch-add
}
