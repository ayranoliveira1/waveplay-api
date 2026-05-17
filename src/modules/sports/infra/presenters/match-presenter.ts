import type {
  FootballDataMatch,
  FootballDataTeam,
  FootballDataCompetition,
} from '../../domain/ports/sports-provider.port'

export type MatchSection = 'live' | 'upcoming' | 'recent'

export class MatchPresenter {
  static toList(match: FootballDataMatch) {
    return {
      id: match.id,
      utcDate: match.utcDate,
      status: match.status,
      minute: match.minute ?? null,
      score: {
        home: match.score.fullTime.home,
        away: match.score.fullTime.away,
      },
      competition: MatchPresenter.competitionToHTTP(match.competition),
      homeTeam: MatchPresenter.teamToHTTP(match.homeTeam),
      awayTeam: MatchPresenter.teamToHTTP(match.awayTeam),
    }
  }

  static teamToHTTP(team: FootballDataTeam) {
    return {
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      tla: team.tla,
      crest: team.crest,
    }
  }

  static competitionToHTTP(competition: FootballDataCompetition) {
    return {
      id: competition.id,
      name: competition.name,
      code: competition.code,
      emblem: competition.emblem,
    }
  }
}
