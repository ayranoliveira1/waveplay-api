import { UseCaseError, UseCaseErrorProps } from '../use-case-error'

export class ResourceNotFoundError<T> extends UseCaseError<T> {
  constructor(props: Omit<UseCaseErrorProps<keyof T>, 'statusCode'>) {
    super({
      statusCode: 404,
      errors: props.errors,
    })
  }
}
