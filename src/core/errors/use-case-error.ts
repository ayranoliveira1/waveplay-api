export interface UseCaseErrorProps<T> {
  statusCode: number
  errors: {
    path?: T[]
    message: string
    code?: string
  }[]
}

export class UseCaseError<T> extends Error {
  props: UseCaseErrorProps<keyof T>
  constructor(props: UseCaseErrorProps<keyof T>) {
    super(JSON.stringify(props))
    this.props = props
  }
}
