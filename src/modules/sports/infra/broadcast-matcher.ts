import type {
  FootballDataMatch,
  FootballDataTeam,
} from '../domain/ports/sports-provider.port'

export interface ParsedTitleTeams {
  home: string
  away: string
}

const SEPARATOR_RE = /\s+(?:x|vs|×|×)\s+/i
const LEADING_DECORATORS_RE =
  /^(?:🔴|⚽|🏆|⭐|🎯|🇧🇷|🇪🇺|\s|AO\s*VIVO|LIVE|HOJE|JOGO)+/gi
const TRAILING_DECORATORS_RE = /\s*[-–—|].*$/

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseTeamsFromTitle(title: string): ParsedTitleTeams | null {
  const cleaned = title.replace(LEADING_DECORATORS_RE, '').trim()
  const parts = cleaned.split(SEPARATOR_RE)
  if (parts.length < 2) return null

  const home = parts[0].replace(LEADING_DECORATORS_RE, '').trim()
  const awayRaw = parts.slice(1).join(' ')
  const away = awayRaw.replace(TRAILING_DECORATORS_RE, '').trim()

  if (!home || !away) return null
  return { home, away }
}

function teamMatches(parsed: string, team: FootballDataTeam): boolean {
  const p = normalize(parsed)
  if (!p) return false

  const aliases = [team.name, team.shortName, team.tla]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map(normalize)

  for (const alias of aliases) {
    if (!alias) continue
    if (alias === p) return true
    if (alias.includes(p) && p.length >= 3) return true
    if (p.includes(alias) && alias.length >= 3) return true
  }
  return false
}

export function findMatchByTeams(
  matches: FootballDataMatch[],
  parsed: ParsedTitleTeams,
): FootballDataMatch | null {
  for (const match of matches) {
    if (
      teamMatches(parsed.home, match.homeTeam) &&
      teamMatches(parsed.away, match.awayTeam)
    ) {
      return match
    }
  }
  return null
}
