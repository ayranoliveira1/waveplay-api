export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'LIVE'
  | 'FINISHED'
  | 'POSTPONED'
  | 'SUSPENDED'
  | 'CANCELLED'

export interface FootballDataArea {
  id: number
  name: string
  code: string
  flag: string | null
}

export interface FootballDataCompetition {
  id: number
  name: string
  code: string
  type: string
  emblem: string | null
}

export interface FootballDataTeam {
  id: number | null
  name: string | null
  shortName: string | null
  tla: string | null
  crest: string | null
}

export interface FootballDataScoreSide {
  home: number | null
  away: number | null
}

export interface FootballDataScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
  duration: string
  fullTime: FootballDataScoreSide
  halfTime: FootballDataScoreSide
}

export interface FootballDataMatch {
  id: number
  utcDate: string
  status: MatchStatus
  minute?: number | null
  injuryTime?: number | null
  matchday?: number | null
  stage?: string | null
  group?: string | null
  lastUpdated?: string
  area: FootballDataArea
  competition: FootballDataCompetition
  homeTeam: FootballDataTeam
  awayTeam: FootballDataTeam
  score: FootballDataScore
}

export interface FootballDataMatchesResponse {
  matches: FootballDataMatch[]
  resultSet?: {
    count: number
    first?: string
    last?: string
    played?: number
  }
  filters?: Record<string, unknown>
}

export abstract class SportsProviderPort {
  abstract getMatchesByDate(date: string): Promise<FootballDataMatchesResponse>
  abstract getMatchById(id: number): Promise<FootballDataMatch | null>
}
