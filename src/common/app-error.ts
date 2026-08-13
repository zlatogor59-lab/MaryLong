import { HttpException, HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  constructor(public readonly code: string, status: HttpStatus, public readonly reasonCode = code) {
    super(code, status);
  }
}

export const unavailable = (reasonCode: string) => new AppError('RESOURCE_UNAVAILABLE', HttpStatus.NOT_FOUND, reasonCode);
