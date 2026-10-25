import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
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

const routes: Record<string, { status: number; body: string }> = {
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
let hits: Hit[]
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
        res.writeHead(route.status).end(route.body)
      })
    })
    await new Promise<void>((resolve) => server.listen(0, resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    hits = []
    sut = new EmbedplaySourcesProvider({
      get: () => baseUrl,
    } as unknown as EnvService)
  })

  it('should resolve movie sources and drop the item whose getPlayer fails', async () => {
    const sources = await sut.getMovieSources(550)

    expect(sources).toEqual([
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
    const sources = await sut.getEpisodeSources(1396, 1, 1)

    expect(sources).toEqual([
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
    ])
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

    const sources = await sut.getEpisodeSources(1396, 1, 2)

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
    routes['GET /filme/551'] = routes['GET /filme/550']
    routes['POST action=getPlayer&video_id=71427'] = {
      status: 200,
      body: '{"data":{"video_url":"javascript:alert(1)"}}',
    }

    const sources = await sut.getMovieSources(551)

    expect(sources.map((source) => source.label)).toEqual([
      'Opção 1 (ABYS)',
      'Legendado (EUA)',
    ])
    delete routes['POST action=getPlayer&video_id=71427']
  })

  it('should return empty list when the episode is not on the page', async () => {
    routes['GET /serie/1396/1/99'] = routes['GET /serie/1396/1/1']

    expect(await sut.getEpisodeSources(1396, 1, 99)).toEqual([])
    expect(hits.some((hit) => hit.method === 'POST')).toBe(false)
  })

  it('should return empty list when the embed fails', async () => {
    expect(await sut.getMovieSources(1)).toEqual([])
    expect(await sut.getEpisodeSources(1, 1, 1)).toEqual([])
  })
})
