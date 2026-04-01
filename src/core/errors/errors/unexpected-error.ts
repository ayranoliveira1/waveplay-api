import { UseCaseError, UseCaseErrorProps } from '../use-case-error'

export class UnexpectedError<T> extends UseCaseError<T> {
  constructor(props: UseCaseErrorProps<keyof T>) {
    super(props)
  }
}
