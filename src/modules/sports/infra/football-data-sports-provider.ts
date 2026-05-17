import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import type { AxiosInstance } from 'axios'

import { EnvService } from '@/shared/env/env.service'
import {
  SportsProviderPort,
  type FootballDataMatch,
  type FootballDataMatchesResponse,
} from '../domain/ports/sports-provider.port'

const BASE_URL = 'https://api.football-data.org/v4'

@Injectable()
export class FootballDataSportsProvider extends SportsProviderPort {
  private readonly api: AxiosInstance
  private readonly logger = new Logger(FootballDataSportsProvider.name)

  constructor(private env: EnvService) {
    super()
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10_000,
      maxRedirects: 0,
      headers: {
        'X-Auth-Token': this.env.get('FOOTBALL_DATA_API_TOKEN'),
        Accept: 'application/json',
      },
    })
  }

  async getMatchesByDate(date: string): Promise<FootballDataMatchesResponse> {
    try {
      const { data } = await this.api.get<FootballDataMatchesResponse>(
        '/matches',
        {
          params: { dateFrom: date, dateTo: date },
        },
      )
      return data
    } catch (error) {
      this.logger.warn(
        `football-data.org request failed: ${(error as Error).message}`,
      )
      return { matches: [] }
    }
  }

  async getMatchById(id: number): Promise<FootballDataMatch | null> {
    try {
      const { data } = await this.api.get<FootballDataMatch>(`/matches/${id}`)
      return data
    } catch (error) {
      this.logger.warn(
        `football-data.org getMatchById(${id}) failed: ${(error as Error).message}`,
      )
      return null
    }
  }
}
