import {
  SportsProviderPort,
  type FootballDataMatch,
  type FootballDataMatchesResponse,
  type MatchStatus,
} from '@/modules/sports/domain/ports/sports-provider.port'

export function makeFakeMatch(
  overrides: Partial<FootballDataMatch> = {},
): FootballDataMatch {
  return {
    id: 419123,
    utcDate: '2026-05-17T19:00:00Z',
    status: 'SCHEDULED',
    minute: null,
    matchday: 5,
    stage: 'REGULAR_SEASON',
    group: null,
    lastUpdated: '2026-05-17T10:00:00Z',
    area: {
      id: 2032,
      name: 'Brazil',
      code: 'BRA',
      flag: 'https://crests.football-data.org/2032.svg',
    },
    competition: {
      id: 2013,
      name: 'Campeonato Brasileiro Série A',
      code: 'BSA',
      type: 'LEAGUE',
      emblem: 'https://crests.football-data.org/BSA.png',
    },
    homeTeam: {
      id: 1765,
      name: 'Sociedade Esportiva Palmeiras',
      shortName: 'Palmeiras',
      tla: 'PAL',
      crest: 'https://crests.football-data.org/1765.png',
    },
    awayTeam: {
      id: 1776,
      name: 'São Paulo FC',
      shortName: 'São Paulo',
      tla: 'SAO',
      crest: 'https://crests.football-data.org/1776.png',
    },
    score: {
      winner: null,
      duration: 'REGULAR',
      fullTime: { home: null, away: null },
      halfTime: { home: null, away: null },
    },
    ...overrides,
  }
}

export class FakeSportsProvider extends SportsProviderPort {
  public matches: FootballDataMatch[] = [makeFakeMatch()]

  setMatchesWithStatus(statuses: MatchStatus[]) {
    this.matches = statuses.map((status, index) =>
      makeFakeMatch({ id: 100 + index, status }),
    )
  }

  async getMatchesByDate(_date: string): Promise<FootballDataMatchesResponse> {
    return {
      matches: this.matches,
      resultSet: { count: this.matches.length },
    }
  }

  async getMatchById(id: number): Promise<FootballDataMatch | null> {
    return this.matches.find((m) => m.id === id) ?? null
  }
}
