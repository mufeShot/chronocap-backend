import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) {
      return true; // proceed without authentication
    }
    return super.canActivate(context);
  }

  handleRequest(err: unknown, user: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (err) return null;
    return user || null;
  }
}
