import { describe, it, expect } from 'vitest'
import { ForbiddenException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'

import { AdminGuard } from './admin.guard'
import { UserRole } from '@/modules/identity/domain/entities/user'

function createMockContext(user?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext
}

describe('AdminGuard', () => {
  const guard = new AdminGuard()

  it('should return true when user role is admin', () => {
    const context = createMockContext({
      userId: 'user-1',
      role: UserRole.ADMIN,
    })

    expect(guard.canActivate(context)).toBe(true)
  })

  it('should throw ForbiddenException when user role is "user"', () => {
    const context = createMockContext({ userId: 'user-1', role: UserRole.USER })

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })

  it('should throw ForbiddenException when user is not in request', () => {
    const context = createMockContext(undefined)

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })
})
