export interface JwtPayload {
	sub: number; // user id
	email: string;
}

export interface JwtAuthUser {
	userId: number;
	email: string;
}
