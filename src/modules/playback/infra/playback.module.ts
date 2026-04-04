import { Module } from '@nestjs/common'

import { SaveProgressUseCase } from '../application/use-cases/save-progress-use-case'
import { GetContinueWatchingUseCase } from '../application/use-cases/get-continue-watching-use-case'
import { AddToHistoryUseCase } from '../application/use-cases/add-to-history-use-case'
import { ListHistoryUseCase } from '../application/use-cases/list-history-use-case'
import { ClearHistoryUseCase } from '../application/use-cases/clear-history-use-case'

import { SaveProgressController } from './controllers/save-progress.controller'
import { ContinueWatchingController } from './controllers/continue-watching.controller'
import { AddToHistoryController } from './controllers/add-to-history.controller'
import { ListHistoryController } from './controllers/list-history.controller'
import { ClearHistoryController } from './controllers/clear-history.controller'

import { ProgressRepository } from '../domain/repositories/progress-repository'
import { PrismaProgressRepository } from './repositories/prisma-progress-repository'
import { HistoryRepository } from '../domain/repositories/history-repository'
import { PrismaHistoryRepository } from './repositories/prisma-history-repository'

import { ProfileOwnershipGatewayPort } from '../application/ports/profile-ownership-gateway.port'
import { PrismaProfileOwnershipGateway } from './gateways/prisma-profile-ownership-gateway'

@Module({
  controllers: [
    SaveProgressController,
    ContinueWatchingController,
    AddToHistoryController,
    ListHistoryController,
    ClearHistoryController,
  ],
  providers: [
    SaveProgressUseCase,
    GetContinueWatchingUseCase,
    AddToHistoryUseCase,
    ListHistoryUseCase,
    ClearHistoryUseCase,

    { provide: ProgressRepository, useClass: PrismaProgressRepository },
    { provide: HistoryRepository, useClass: PrismaHistoryRepository },

    {
      provide: ProfileOwnershipGatewayPort,
      useClass: PrismaProfileOwnershipGateway,
    },
  ],
})
export class PlaybackModule {}
