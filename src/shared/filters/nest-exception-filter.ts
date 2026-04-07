import {
  ExceptionFilter as NestExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { isAxiosError } from 'axios'
import { UseCaseError } from '@/core/errors/use-case-error'
import { HttpResponse } from '@/shared/http/response-type'

@Catch()
export class AllExceptionsFilter implements NestExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: any, host: ArgumentsHost): void {
    let status = 500
    let errorMessages: any[] = [
      'Erro inesperado. Estamos trabalhando para corrigir o problema. Tente novamente em breve.',
    ]

    if (exception instanceof UseCaseError) {
      status = exception.props.statusCode
      errorMessages = exception.props.errors
    } else if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        errorMessages = [exceptionResponse]
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res = exceptionResponse as any
        if (Array.isArray(res.errors)) {
          errorMessages = res.errors
        } else if (Array.isArray(res.message)) {
          errorMessages = res.message
        } else {
          errorMessages = [res.message || exception.message]
        }
      }
    } else if (isAxiosError(exception)) {
      status = exception.response?.status || 500
      const data = exception.response?.data
      const detail =
        data?.message ||
        (typeof data === 'string' ? data : null) ||
        exception.message
      this.logger.error(
        `External API error: ${exception.config?.url} — ${detail}`,
        exception.stack,
      )
    } else if (exception?.status && exception?.message) {
      const statusValue = exception.status

      if (typeof statusValue === 'string') {
        const statusMap: Record<string, number> = {
          UNAUTHORIZED: 401,
          FORBIDDEN: 403,
          NOT_FOUND: 404,
          BAD_REQUEST: 400,
          INTERNAL_SERVER_ERROR: 500,
        }
        status = statusMap[statusValue.toUpperCase()] || 500
      } else if (typeof statusValue === 'number') {
        status = statusValue
      }

      errorMessages = [exception.message]
    }

    const context = host.switchToHttp()
    const request = context.getRequest<Request>()
    const response = context.getResponse<Response>()
    const { method, url } = request

    const messages = errorMessages
      .map((e) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e)))
      .join(', ')

    if (status >= 500) {
      this.logger.error(
        `${method} ${url} ${status} - ${messages}`,
        exception.stack,
      )
    } else {
      this.logger.warn(`${method} ${url} ${status} - ${messages}`)
    }

    const errorResponse: HttpResponse<[], any[]> = {
      success: false,
      data: [],
      error: errorMessages,
    }

    response.status(status).json(errorResponse)
  }
}
