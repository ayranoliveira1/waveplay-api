import type {
  AdminUserDetail,
  AdminUserListItem,
  PaginatedUsers,
} from '@/modules/admin/application/ports/admin-user-gateway.port'
import type { AdminUserGatewayPort } from '@/modules/admin/application/ports/admin-user-gateway.port'

export class FakeAdminUserGateway implements AdminUserGatewayPort {
  public users: AdminUserListItem[] = []
  public details: Map<string, AdminUserDetail> = new Map()

  public lastListCall: {
    page: number
    perPage: number
    search?: string
  } | null = null

  async listUsers(
    page: number,
    perPage: number,
    search?: string,
  ): Promise<PaginatedUsers> {
    this.lastListCall = { page, perPage, search }

    const filtered = search
      ? this.users.filter(
          (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()),
        )
      : this.users

    const totalItems = filtered.length
    const totalPages = Math.ceil(totalItems / perPage) || 1
    const start = (page - 1) * perPage
    const paginated = filtered.slice(start, start + perPage)

    return {
      users: paginated,
      page,
      totalPages,
      totalItems,
    }
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail | null> {
    return this.details.get(userId) ?? null
  }
}
