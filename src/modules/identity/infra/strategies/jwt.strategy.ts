import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { EnvService } from '@/shared/env/env.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(env: EnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.get('JWT_SECRET'),
      algorithms: ['HS256'],
    })
  }

  validate(payload: { sub: string; family: string }) {
    return { userId: payload.sub, family: payload.family }
  }
}
