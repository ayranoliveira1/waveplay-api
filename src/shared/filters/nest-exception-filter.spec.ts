import { describe, expect, it, vi } from 'vitest'
import { AllExceptionsFilter } from './nest-exception-filter'
import type { ArgumentsHost } from '@nestjs/common'
import { HttpException } from '@nestjs/common'
import { AxiosError } from 'axios'
import { UseCaseError } from '@/core/errors/use-case-error'

function createMockHost() {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })

  return {
    host: {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/test' }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost,
    status,
    json,
  }
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter()

  it('should handle UseCaseError with correct status and errors', () => {
    const { host, status, json } = createMockHost()

    const error = new UseCaseError({
      statusCode: 400,
      errors: [{ message: 'Email já existe', path: ['email'] }],
    })

    filter.catch(error, host)

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({
      success: false,
      data: [],
      error: [{ message: 'Email já existe', path: ['email'] }],
    })
  })

  it('should handle HttpException', () => {
    const { host, status, json } = createMockHost()

    const error = new HttpException('Não autorizado', 401)

    filter.catch(error, host)

    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({
      success: false,
      data: [],
      error: ['Não autorizado'],
    })
  })

  it('should return generic message for AxiosError with response data', () => {
    const { host, status, json } = createMockHost()

    const error = new AxiosError('Request failed')
    error.response = {
      status: 502,
      statusText: 'Bad Gateway',
      data: { message: 'Database connection failed', errors: ['internal'] },
      headers: {},
      config: {} as any,
    }

    filter.catch(error, host)

    expect(status).toHaveBeenCalledWith(502)
    expect(json).toHaveBeenCalledWith({
      success: false,
      data: [],
      error: [
        'Erro inesperado. Estamos trabalhando para corrigir o problema. Tente novamente em breve.',
      ],
    })
  })

  it('should preserve status code from AxiosError response', () => {
    const { host, status, json } = createMockHost()

    const error = new AxiosError('Not Found')
    error.response = {
      status: 404,
      statusText: 'Not Found',
      data: { status_message: 'The resource could not be found.' },
      headers: {},
      config: {} as any,
    }

    filter.catch(error, host)

    expect(status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith({
      success: false,
      data: [],
      error: [
        'Erro inesperado. Estamos trabalhando para corrigir o problema. Tente novamente em breve.',
      ],
    })
  })

  it('should handle generic Error with 500 status', () => {
    const { host, status, json } = createMockHost()

    const error = new Error('Something broke')

    filter.catch(error, host)

    expect(status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith({
      success: false,
      data: [],
      error: [
        'Erro inesperado. Estamos trabalhando para corrigir o problema. Tente novamente em breve.',
      ],
    })
  })
})
