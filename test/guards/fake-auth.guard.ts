import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'

@Injectable()
export class FakeAuthGuard implements CanActivate {
  static userId = 'test-user-id'

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    request.user = { userId: FakeAuthGuard.userId }
    return true
  }
}
