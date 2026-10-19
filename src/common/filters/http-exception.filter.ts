// src/common/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!isHttp) {
      // Erreur inattendue : on logge le détail, mais on ne l'expose jamais au client.
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload = isHttp
      ? exception.getResponse()
      : { message: 'Internal server error' };
    const details = typeof payload === 'string' ? { message: payload } : payload;

    response.status(status).json({
      ...details,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}