import { Module } from '@nestjs/common'

import { DatabaseModule } from '@/shared/database/database.module'
import { EnvModule } from '@/shared/env/env.module'
import { IdentityModule } from '@/modules/identity/infra/identity.module'

// Use cases
import { GetCurrentAppVersionUseCase } from '../application/use-cases/get-current-app-version-use-case'
import { ListAppVersionsUseCase } from '../application/use-cases/list-app-versions-use-case'
import { GenerateUploadUrlUseCase } from '../application/use-cases/generate-upload-url-use-case'
import { CreateAppVersionUseCase } from '../application/use-cases/create-app-version-use-case'
import { SetCurrentAppVersionUseCase } from '../application/use-cases/set-current-app-version-use-case'
import { DeleteAppVersionUseCase } from '../application/use-cases/delete-app-version-use-case'

// Controllers
import { GetCurrentAppVersionController } from './controllers/get-current-app-version.controller'
import { ListAppVersionsController } from './controllers/list-app-versions.controller'
import { GenerateUploadUrlController } from './controllers/generate-upload-url.controller'
import { CreateAppVersionController } from './controllers/create-app-version.controller'
import { SetCurrentAppVersionController } from './controllers/set-current-app-version.controller'
import { DeleteAppVersionController } from './controllers/delete-app-version.controller'

// Repos / Adapters
import { MobileAppVersionsRepository } from '../domain/repositories/mobile-app-versions-repository'
import { PrismaMobileAppVersionsRepository } from './repositories/prisma-mobile-app-versions-repository'
import { ObjectStoragePort } from '../application/ports/object-storage.port'
import { R2ObjectStorage } from './storage/r2-object-storage'

@Module({
  imports: [DatabaseModule, EnvModule, IdentityModule],
  controllers: [
    GetCurrentAppVersionController,
    ListAppVersionsController,
    GenerateUploadUrlController,
    CreateAppVersionController,
    SetCurrentAppVersionController,
    DeleteAppVersionController,
  ],
  providers: [
    GetCurrentAppVersionUseCase,
    ListAppVersionsUseCase,
    GenerateUploadUrlUseCase,
    CreateAppVersionUseCase,
    SetCurrentAppVersionUseCase,
    DeleteAppVersionUseCase,
    {
      provide: MobileAppVersionsRepository,
      useClass: PrismaMobileAppVersionsRepository,
    },
    {
      provide: ObjectStoragePort,
      useClass: R2ObjectStorage,
    },
  ],
})
export class MobileAppModule {}
