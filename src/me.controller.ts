import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from './auth/current-user.decorator';
import type { AuthenticatedUser } from './auth/auth.types';

@Controller('me')
export class MeController {
  @Get()
  me(@CurrentUser() user: AuthenticatedUser) {
    return { id: user.id, role: user.role, status: user.status };
  }
}
