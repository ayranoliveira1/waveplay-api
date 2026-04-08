import { Module } from '@nestjs/common'

// Use cases
import { CreateProfileUseCase } from '../application/use-cases/create-profile-use-case'
import { ListProfilesUseCase } from '../application/use-cases/list-profiles-use-case'
import { UpdateProfileUseCase } from '../application/use-cases/update-profile-use-case'
import { DeleteProfileUseCase } from '../application/use-cases/delete-profile-use-case'

// Controllers
import { CreateProfileController } from './controllers/create-profile.controller'
import { ListProfilesController } from './controllers/list-profiles.controller'
import { UpdateProfileController } from './controllers/update-profile.controller'
import { DeleteProfileController } from './controllers/delete-profile.controller'

// Repositories (abstract → impl)
import { ProfilesRepository } from '../domain/repositories/profiles-repository'
import { PrismaProfilesRepository } from './repositories/prisma-profiles-repository'

// Ports (abstract → impl)
import { UserPlanGatewayPort } from '../application/ports/user-plan-gateway.port'
import { PrismaUserPlanGateway } from './gateways/prisma-user-plan-gateway'

@Module({
  controllers: [
    CreateProfileController,
    ListProfilesController,
    UpdateProfileController,
    DeleteProfileController,
  ],
  providers: [
    // Use cases
    CreateProfileUseCase,
    ListProfilesUseCase,
    UpdateProfileUseCase,
    DeleteProfileUseCase,

    // Repositories
    { provide: ProfilesRepository, useClass: PrismaProfilesRepository },

    // Ports
    { provide: UserPlanGatewayPort, useClass: PrismaUserPlanGateway },
  ],
  exports: [ProfilesRepository],
})
export class ProfileModule {}
