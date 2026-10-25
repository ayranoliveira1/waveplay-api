import 'dotenv/config'

import { EmbedplaySourcesProvider } from '../src/modules/catalog/infra/embed/embedplay-sources-provider'
import { envSchema } from '../src/shared/env/env'
import type { EnvService } from '../src/shared/env/env.service'

// Checagem pós-deploy: confirma que o embed ainda devolve fontes pelo caminho do servidor
async function main() {
  const [tmdbId, season, episode] = process.argv.slice(2).map(Number)

  if (!tmdbId || (season === undefined) !== (episode === undefined)) {
    console.error('Uso: pnpm sources:check <tmdbId> [season episode]')
    process.exit(1)
  }

  const baseUrl = envSchema.shape.EMBED_SOURCES_BASE_URL.parse(
    process.env.EMBED_SOURCES_BASE_URL,
  )
  const provider = new EmbedplaySourcesProvider({
    get: () => baseUrl,
  } as unknown as EnvService)

  const sources =
    season === undefined
      ? await provider.getMovieSources(tmdbId)
      : await provider.getEpisodeSources(tmdbId, season, episode)

  process.stdout.write(`${JSON.stringify(sources, null, 2)}\n`)
  if (sources.length === 0) process.exitCode = 1
}

main()
