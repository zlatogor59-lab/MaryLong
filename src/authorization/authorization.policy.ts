import { HttpStatus, Injectable } from '@nestjs/common';
import { AppError, unavailable } from '../common/app-error';
import type { AuthenticatedUser, UserRole } from '../auth/auth.types';

@Injectable()
export class AuthorizationPolicy {
  requireRole(user: AuthenticatedUser, ...roles: UserRole[]) {
    if (!roles.includes(user.role)) throw unavailable('ROLE_FORBIDDEN');
  }

  requireClientReport(user: AuthenticatedUser, ownerUserId: string, status: string) {
    if (user.role !== 'client' || user.id !== ownerUserId) throw unavailable('REPORT_NOT_IN_SCOPE');
    if (status !== 'published') throw unavailable('REPORT_NOT_APPROVED');
  }

  denyMedicalContextForAdmin(user: AuthenticatedUser) {
    if (user.role === 'admin') throw unavailable('ADMIN_MEDICAL_ACCESS_DENIED');
  }

  requireActiveAssignment(user: AuthenticatedUser, assignedConsultantId: string | null) {
    if (user.role !== 'consultant' || user.id !== assignedConsultantId) throw unavailable('CLIENT_NOT_ASSIGNED');
  }

  denyImmutableSubmissionMutation(): never {
    throw new AppError('IMMUTABLE_RESOURCE', HttpStatus.METHOD_NOT_ALLOWED, 'SUBMISSION_IMMUTABLE');
  }
}
