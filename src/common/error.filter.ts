import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from './app-error';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = exception instanceof AppError ? exception.code : status === 401 ? 'INVALID_SESSION' : 'INTERNAL_ERROR';
    const message = status === 404 ? 'Resource is unavailable' : status >= 500 ? 'Request could not be completed' : code;
    res.status(status).json({ error: { code, message, request_id: req.header('x-request-id') } });
  }
}
