import { UseCaseError, UseCaseErrorProps } from '../use-case-error'

export class NotAllowedError<T> extends UseCaseError<T> {
  constructor(props: Omit<UseCaseErrorProps<keyof T>, 'statusCode'>) {
    super({
      statusCode: 403,
      errors: props.errors,
    })
  }
}
