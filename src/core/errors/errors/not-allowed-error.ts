import { UseCaseError, UseCaseErrorProps } from '../use-case-error'

export class NotAllowedError<T> extends UseCaseError<T> {
  constructor(props: UseCaseErrorProps<keyof T>) {
    super(props)
  }
}
