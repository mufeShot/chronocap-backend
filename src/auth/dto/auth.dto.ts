import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterDto {
	@IsEmail()
	email: string;

	@IsNotEmpty()
	@MinLength(6)
	password: string;

	@IsOptional()
	@IsNotEmpty()
	name?: string;
}

export class LoginDto {
	@IsEmail()
	email: string;

	@IsNotEmpty()
	password: string;
}

export class RefreshDto {
	@Type(() => Number)
	@IsNumber()
	userId: number;

	@IsNotEmpty()
	refresh_token: string;
}
