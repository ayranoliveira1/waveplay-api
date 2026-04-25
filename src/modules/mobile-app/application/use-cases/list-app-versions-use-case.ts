import { right, type Either } from '@/core/either'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'
import { Injectable } from '@nestjs/common'

type ListAppVersionsResponse = Either<never, { versions: MobileAppVersion[] }>

@Injectable()
export class ListAppVersionsUseCase {
  constructor(
    private readonly mobileAppVersionsRepository: MobileAppVersionsRepository,
  ) {}

  async execute(): Promise<ListAppVersionsResponse> {
    const versions = await this.mobileAppVersionsRepository.findAll()
    return right({ versions })
  }
}
