import type { Request, Response } from 'express'

const REFRESH_TOKEN_MAX_AGE_MS = 48 * 60 * 60 * 1000 // 48h

export function isMobile(request: Request): boolean {
  return request.headers['x-platform'] === 'mobile'
}

export function setRefreshTokenCookie(response: Response, token: string): void {
  response.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  })
}
