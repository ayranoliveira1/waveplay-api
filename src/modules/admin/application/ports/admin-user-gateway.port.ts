export interface AdminUserListItem {
  id: string
  name: string
  email: string
  role: string
  subscription: {
    id: string
    status: string
    planName: string
    planSlug: string
    endsAt: Date | null
  } | null
  profilesCount: number
  createdAt: Date
}

export interface AdminUserDetail {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
  subscription: {
    id: string
    status: string
    startedAt: Date
    endsAt: Date | null
    plan: {
      id: string
      name: string
      slug: string
      maxProfiles: number
      maxStreams: number
    }
  } | null
  profiles: { id: string; name: string; isKid: boolean }[]
}

export interface PaginatedUsers {
  users: AdminUserListItem[]
  page: number
  totalPages: number
  totalItems: number
}

export abstract class AdminUserGatewayPort {
  abstract listUsers(
    page: number,
    perPage: number,
    search?: string,
  ): Promise<PaginatedUsers>
  abstract getUserDetail(userId: string): Promise<AdminUserDetail | null>
}
