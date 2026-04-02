import type { PipeTransform } from '@nestjs/common'
import { BadRequestException } from '@nestjs/common'
import type { ZodType } from 'zod'
import { ZodError } from 'zod'
import { UseCaseError } from '@/core/errors/use-case-error'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodType) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new CustomHttpException(
          new UseCaseError({
            errors: error.issues.map((issue) => ({
              message: issue.message,
              path: issue.path,
            })),
            statusCode: 400,
          }),
        )
      }
      throw new BadRequestException('Invalid request data')
    }
  }
}
