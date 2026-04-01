import { UseCaseError } from '@/core/errors/use-case-error'
import { HttpException } from '@nestjs/common'

export class CustomHttpException extends HttpException {
  constructor(useCaseError: UseCaseError<any>) {
    super(
      {
        errors: useCaseError.props.errors,
      },
      useCaseError.props.statusCode,
    )
  }
}
