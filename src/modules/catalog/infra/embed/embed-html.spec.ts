import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

import {
  parseMovieItems,
  findEpisodeContentId,
  serverOf,
  toDirectUrl,
  isVidsrc,
  isHttpUrl,
} from './embed-html'

const movieHtml = readFileSync('test/fixtures/embed/filme-550.html', 'utf8')
const episodeHtml = readFileSync(
  'test/fixtures/embed/serie-1396-1-1.html',
  'utf8',
)

describe('embed-html', () => {
  it('parseMovieItems reads both tabs', () => {
    expect(parseMovieItems(movieHtml)).toEqual([
      {
        audio: 'dublado',
        label: 'Opção 1 (ABYS)',
        videoId: '71426',
        url: null,
      },
      {
        audio: 'dublado',
        label: 'Opção 2 (UPNS)',
        videoId: '71427',
        url: null,
      },
      {
        audio: 'legendado',
        label: 'Legendado (EUA)',
        videoId: null,
        url: 'https://vidsrc.sh/embed/movie?imdb=tt0137523&ds_lang=pt&autoplay=1',
      },
    ])
  })

  it('findEpisodeContentId finds S1E1', () => {
    expect(findEpisodeContentId(episodeHtml, 1, 1)).toBe('16809')
  })

  it('findEpisodeContentId returns null for missing episode', () => {
    expect(findEpisodeContentId(episodeHtml, 1, 99)).toBeNull()
    expect(findEpisodeContentId(episodeHtml, 9, 1)).toBeNull()
  })

  it('serverOf', () => {
    expect(serverOf('Opção 2 (UPNS)')).toBe('UPNS')
    expect(serverOf('Legendado (EUA)')).toBe('EUA')
    expect(serverOf('Servidor Premium')).toBe('SERVIDOR PREMIUM')
  })

  it('toDirectUrl strips the ABYS ad wrapper', () => {
    expect(
      toDirectUrl(
        'https://embedplayabyss.top/player.html?v=iqYVq7a2S&thumbnail=https://image.tmdb.org/x.jpg',
      ),
    ).toBe('https://player.abyssplayer.com/?v=iqYVq7a2S')
    expect(toDirectUrl('https://embedplayapiupn.upns.xyz/#kdvvqz')).toBe(
      'https://embedplayapiupn.upns.xyz/#kdvvqz',
    )
  })

  it('isVidsrc', () => {
    expect(
      isVidsrc(
        'https://vidsrc.sh/embed/tv?tmdb=1396&season=1&episode=1&ds_lang=pt&autoplay=1',
      ),
    ).toBe(true)
    expect(isVidsrc('https://evil.com/?vidsrc.sh')).toBe(false)
    expect(isVidsrc('https://cdn.vidsrc.sh/embed/movie?tmdb=550')).toBe(false)
    expect(isVidsrc('http://vidsrc.sh/embed/movie?tmdb=550')).toBe(false)
  })

  it('isHttpUrl', () => {
    expect(isHttpUrl('https://x.upns.xyz/#a')).toBe(true)
    expect(isHttpUrl('http://x.upns.xyz/#a')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('httpx://x.upns.xyz')).toBe(false)
  })
})
