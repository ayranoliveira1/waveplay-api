import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { UserRole } from '@/modules/identity/domain/entities/user'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Acesso restrito a administradores')
    }

    return true
  }
}
