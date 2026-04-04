import { Module } from '@nestjs/common'

import { ToggleFavoriteUseCase } from '../application/use-cases/toggle-favorite-use-case'
import { ListFavoritesUseCase } from '../application/use-cases/list-favorites-use-case'
import { ToggleWatchlistUseCase } from '../application/use-cases/toggle-watchlist-use-case'
import { ListWatchlistUseCase } from '../application/use-cases/list-watchlist-use-case'

import { ToggleFavoriteController } from './controllers/toggle-favorite.controller'
import { ListFavoritesController } from './controllers/list-favorites.controller'
import { ToggleWatchlistController } from './controllers/toggle-watchlist.controller'
import { ListWatchlistController } from './controllers/list-watchlist.controller'

import { FavoritesRepository } from '../domain/repositories/favorites-repository'
import { PrismaFavoritesRepository } from './repositories/prisma-favorites-repository'
import { WatchlistRepository } from '../domain/repositories/watchlist-repository'
import { PrismaWatchlistRepository } from './repositories/prisma-watchlist-repository'

import { ProfileOwnershipGatewayPort } from '../application/ports/profile-ownership-gateway.port'
import { PrismaProfileOwnershipGateway } from './gateways/prisma-profile-ownership-gateway'

@Module({
  controllers: [
    ToggleFavoriteController,
    ListFavoritesController,
    ToggleWatchlistController,
    ListWatchlistController,
  ],
  providers: [
    ToggleFavoriteUseCase,
    ListFavoritesUseCase,
    ToggleWatchlistUseCase,
    ListWatchlistUseCase,

    { provide: FavoritesRepository, useClass: PrismaFavoritesRepository },
    { provide: WatchlistRepository, useClass: PrismaWatchlistRepository },

    {
      provide: ProfileOwnershipGatewayPort,
      useClass: PrismaProfileOwnershipGateway,
    },
  ],
})
export class LibraryModule {}
