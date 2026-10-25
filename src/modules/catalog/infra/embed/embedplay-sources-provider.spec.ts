import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest'
import { readFileSync } from 'node:fs'
import {
  createServer,
  type IncomingHttpHeaders,
  type OutgoingHttpHeaders,
  type Server,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { Logger } from '@nestjs/common'

import { EmbedplaySourcesProvider } from './embedplay-sources-provider'
import type { EnvService } from '@/shared/env/env.service'

const fixture = (name: string) =>
  readFileSync(`test/fixtures/embed/${name}`, 'utf8')

interface Hit {
  method: string
  url: string
  body: string
  headers: IncomingHttpHeaders
}

interface Route {
  status: number
  body: string
  headers?: OutgoingHttpHeaders
}

const baseRoutes: Record<string, Route> = {
  'GET /filme/550': { status: 200, body: fixture('filme-550.html') },
  'GET /serie/1396/1/1': { status: 200, body: fixture('serie-1396-1-1.html') },
  'POST action=getPlayer&video_id=71426': {
    status: 200,
    body: fixture('player-71426.json'),
  },
  'POST action=getOptions&contentid=16809': {
    status: 200,
    body: fixture('options-16809.json'),
  },
}

let server: Server
let baseUrl: string
let routes: Record<string, Route>
let hits: Hit[]
let warn: ReturnType<typeof vi.spyOn>
let sut: EmbedplaySourcesProvider

describe('EmbedplaySourcesProvider', () => {
  beforeAll(async () => {
    Logger.overrideLogger(false)
    server = createServer((req, res) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        hits.push({
          method: req.method!,
          url: req.url!,
          body,
          headers: req.headers,
        })
        const key = req.method === 'POST' ? `POST ${body}` : `GET ${req.url}`
        const route = routes[key] ?? { status: 500, body: '{"errors":"1"}' }
        res.writeHead(route.status, route.headers).end(route.body)
      })
    })
    await new Promise<void>((resolve) => server.listen(0, resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    routes = { ...baseRoutes }
    hits = []
    warn = vi.spyOn(Logger.prototype, 'warn')
    warn.mockClear()
    sut = new EmbedplaySourcesProvider({
      get: () => baseUrl,
    } as unknown as EnvService)
  })

  it('should resolve movie sources and drop the item whose getPlayer fails', async () => {
    const result = await sut.getMovieSources(550)

    expect(result).toEqual({
      complete: false,
      sources: [
        {
          audio: 'dublado',
          server: 'ABYS',
          label: 'Opção 1 (ABYS)',
          url: 'https://player.abyssplayer.com/?v=DiXWroq-N',
          sandbox: true,
          reportsTime: false,
        },
        {
          audio: 'legendado',
          server: 'EUA',
          label: 'Legendado (EUA)',
          url: 'https://vidsrc.sh/embed/movie?imdb=tt0137523&ds_lang=pt&autoplay=1',
          sandbox: false,
          reportsTime: true,
        },
      ],
    })
  })

  it('should mark movie sources complete when every getPlayer resolves', async () => {
    routes['POST action=getPlayer&video_id=71427'] = {
      status: 200,
      body: '{"data":{"video_url":"https://embedplayapiupn.upns.xyz/#kdvvqz"}}',
    }

    const result = await sut.getMovieSources(550)

    expect(result.complete).toBe(true)
    expect(result.sources.map((source) => source.label)).toEqual([
      'Opção 1 (ABYS)',
      'Opção 2 (UPNS)',
      'Legendado (EUA)',
    ])
  })

  it('should send the embed referer on pages and the page referer on the api', async () => {
    await sut.getMovieSources(550)

    const page = hits.find((hit) => hit.method === 'GET')!
    const api = hits.find((hit) => hit.method === 'POST')!

    expect(page.headers.referer).toBe('https://embedplayapi.top/')
    expect(page.headers['user-agent']).toContain('Chrome/')
    expect(api.headers.referer).toBe(`${baseUrl}/filme/550`)
    expect(api.headers['x-requested-with']).toBe('XMLHttpRequest')
    expect(api.headers['content-type']).toContain(
      'application/x-www-form-urlencoded',
    )
  })

  it('should resolve episode sources and append the Vidsrc subtitled option', async () => {
    const result = await sut.getEpisodeSources(1396, 1, 1)

    expect(result).toEqual({
      complete: true,
      sources: [
        {
          audio: 'dublado',
          server: 'ABYS',
          label: 'Opção 1 (ABYS)',
          url: 'https://player.abyssplayer.com/?v=iqYVq7a2S',
          sandbox: true,
          reportsTime: false,
        },
        {
          audio: 'legendado',
          server: 'EUA',
          label: 'Legendado (EUA)',
          url: 'https://vidsrc.sh/embed/tv?tmdb=1396&season=1&episode=1&ds_lang=pt&autoplay=1',
          sandbox: false,
          reportsTime: true,
        },
      ],
    })
  })

  it('should number options per audio and drop non-http urls', async () => {
    routes['GET /serie/1396/1/2'] = routes['GET /serie/1396/1/1']
    routes['POST action=getOptions&contentid=16810'] = {
      status: 200,
      body: JSON.stringify({
        data: {
          options: [
            { ID: 1, type: '2', url: 'https://x.upns.xyz/#a', server: 'UPNS' },
            { ID: 2, type: '1', url: 'javascript:alert(1)', server: 'BYSE' },
            {
              ID: 3,
              type: '1',
              url: 'https://embedplayabyss.top/player.html?v=abc',
              server: 'ABYS',
            },
            { ID: 4, type: '1', url: 'https://x.upns.xyz/#b', server: 'UPNS' },
          ],
        },
      }),
    }

    const { sources } = await sut.getEpisodeSources(1396, 1, 2)

    expect(sources.map(({ audio, label, url }) => [audio, label, url])).toEqual(
      [
        ['dublado', 'Opção 1 (ABYS)', 'https://player.abyssplayer.com/?v=abc'],
        ['dublado', 'Opção 2 (UPNS)', 'https://x.upns.xyz/#b'],
        ['legendado', 'Opção 1 (UPNS)', 'https://x.upns.xyz/#a'],
        [
          'legendado',
          'Legendado (EUA)',
          'https://vidsrc.sh/embed/tv?tmdb=1396&season=1&episode=2&ds_lang=pt&autoplay=1',
        ],
      ],
    )
  })

  it('should drop a movie player whose url is not http', async () => {
    routes['POST action=getPlayer&video_id=71427'] = {
      status: 200,
      body: '{"data":{"video_url":"javascript:alert(1)"}}',
    }

    const result = await sut.getMovieSources(550)

    expect(result.complete).toBe(false)
    expect(result.sources.map((source) => source.label)).toEqual([
      'Opção 1 (ABYS)',
      'Legendado (EUA)',
    ])
  })

  it('should return empty list without warning when the episode is not on the page', async () => {
    routes['GET /serie/1396/1/99'] = routes['GET /serie/1396/1/1']

    const result = await sut.getEpisodeSources(1396, 1, 99)

    expect(result.sources).toEqual([])
    expect(hits.some((hit) => hit.method === 'POST')).toBe(false)
    expect(warn).not.toHaveBeenCalled()
  })

  it('should warn about the layout when a 200 page has no expected block', async () => {
    routes['GET /filme/552'] = {
      status: 200,
      body: '<p>ACESSO NÃO AUTORIZADO</p>',
    }
    routes['GET /serie/1396/1/3'] = { status: 200, body: '<p>novo layout</p>' }

    expect((await sut.getMovieSources(552)).sources).toEqual([])
    expect((await sut.getEpisodeSources(1396, 1, 3)).sources).toEqual([])
    expect(warn).toHaveBeenCalledTimes(2)
    expect(
      warn.mock.calls.every(([msg]) => String(msg).includes('layout')),
    ).toBe(true)
  })

  it('should not follow the embed redirect for a missing title', async () => {
    routes['GET /filme/553'] = {
      status: 302,
      body: '',
      headers: { Location: '/404.php' },
    }
    routes['GET /404.php'] = { status: 200, body: '<p>404</p>' }

    const result = await sut.getMovieSources(553)

    expect(result).toEqual({ sources: [], complete: false })
    expect(hits.map((hit) => hit.url)).toEqual(['/filme/553'])
    expect(String(warn.mock.calls[0][0])).not.toContain('layout')
  })

  it('should return empty incomplete list when the embed fails', async () => {
    expect(await sut.getMovieSources(1)).toEqual({
      sources: [],
      complete: false,
    })
    expect(await sut.getEpisodeSources(1, 1, 1)).toEqual({
      sources: [],
      complete: false,
    })
  })
})
