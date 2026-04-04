import { Module } from '@nestjs/common'

// Use cases
import { ToggleFavoriteUseCase } from '../application/use-cases/toggle-favorite-use-case'
import { ListFavoritesUseCase } from '../application/use-cases/list-favorites-use-case'
import { ToggleWatchlistUseCase } from '../application/use-cases/toggle-watchlist-use-case'
import { ListWatchlistUseCase } from '../application/use-cases/list-watchlist-use-case'

// Controllers
import { ToggleFavoriteController } from './controllers/toggle-favorite.controller'
import { ListFavoritesController } from './controllers/list-favorites.controller'
import { ToggleWatchlistController } from './controllers/toggle-watchlist.controller'
import { ListWatchlistController } from './controllers/list-watchlist.controller'

// Repositories
import { FavoritesRepository } from '../domain/repositories/favorites-repository'
import { PrismaFavoritesRepository } from './repositories/prisma-favorites-repository'
import { WatchlistRepository } from '../domain/repositories/watchlist-repository'
import { PrismaWatchlistRepository } from './repositories/prisma-watchlist-repository'

// Ports
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
    // Use cases
    ToggleFavoriteUseCase,
    ListFavoritesUseCase,
    ToggleWatchlistUseCase,
    ListWatchlistUseCase,

    // Repositories
    { provide: FavoritesRepository, useClass: PrismaFavoritesRepository },
    { provide: WatchlistRepository, useClass: PrismaWatchlistRepository },

    // Ports
    {
      provide: ProfileOwnershipGatewayPort,
      useClass: PrismaProfileOwnershipGateway,
    },
  ],
})
export class LibraryModule {}
