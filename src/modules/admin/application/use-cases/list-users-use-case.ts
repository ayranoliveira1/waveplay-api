import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import type { PaginatedUsers } from '../ports/admin-user-gateway.port'
import { AdminUserGatewayPort } from '../ports/admin-user-gateway.port'

interface ListUsersRequest {
  page: number
  perPage: number
  search?: string
}

type ListUsersResponse = Either<never, PaginatedUsers>

@Injectable()
export class ListUsersUseCase {
  constructor(private gateway: AdminUserGatewayPort) {}

  async execute({
    page,
    perPage,
    search,
  }: ListUsersRequest): Promise<ListUsersResponse> {
    const result = await this.gateway.listUsers(page, perPage, search)
    return right(result)
  }
}
