import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
} from '@nestjs/common'
import { z } from 'zod'

import { GetMatchDetailUseCase } from '../../application/use-cases/get-match-detail-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const idSchema = z
  .string()
  .transform(Number)
  .pipe(z.number().int().positive().max(9_999_999))

@Controller('/sports')
export class MatchDetailController {
  constructor(private getMatchDetailUseCase: GetMatchDetailUseCase) {}

  @Get('matches/:id')
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id', new ZodValidationPipe(idSchema)) id: number) {
    const result = await this.getMatchDetailUseCase.execute({ id })

    if (result.isLeft()) {
      throw new NotFoundException({
        success: false,
        data: [],
        error: ['Partida não encontrada'],
      })
    }

    return { success: true, data: result.value, error: null }
  }
}
