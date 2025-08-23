import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	intercept<T>(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
		const req = context.switchToHttp().getRequest<Request & { method: string; url: string }>();
		const { method, url } = req;
		const started = Date.now();
		return next.handle().pipe(
			tap({
				next: () => this.log(method, url, started, context),
				error: () => this.log(method, url, started, context, true),
			}),
		);
	}

	private log(method: string, url: string, started: number, context: ExecutionContext, isError = false) {
		const res = context.switchToHttp().getResponse<{ statusCode?: number }>();
		const status = res?.statusCode;
		const ms = Date.now() - started;
		console.log(`${method} ${url} ${status}${isError ? ' (error)' : ''} +${ms}ms`);
	}
}
