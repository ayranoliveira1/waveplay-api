import { Module } from '@nestjs/common'

import { GetLiveBroadcastsUseCase } from '../application/use-cases/get-live-broadcasts-use-case'
import { GetMatchDetailUseCase } from '../application/use-cases/get-match-detail-use-case'
import { TodayMatchesController } from './controllers/today-matches.controller'
import { MatchDetailController } from './controllers/match-detail.controller'
import { SportsCacheService } from './sports-cache.service'
import { SportsProviderPort } from '../domain/ports/sports-provider.port'
import { YouTubeBroadcastProviderPort } from '../domain/ports/youtube-broadcast.port'
import { FootballDataSportsProvider } from './football-data-sports-provider'
import { YouTubeBroadcastProvider } from './youtube-broadcast.provider'

@Module({
  controllers: [
    // Static routes first
    TodayMatchesController,
    MatchDetailController,
  ],
  providers: [
    GetLiveBroadcastsUseCase,
    GetMatchDetailUseCase,
    SportsCacheService,
    { provide: SportsProviderPort, useClass: FootballDataSportsProvider },
    {
      provide: YouTubeBroadcastProviderPort,
      useClass: YouTubeBroadcastProvider,
    },
  ],
})
export class SportsModule {}
