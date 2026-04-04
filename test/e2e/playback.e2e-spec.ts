import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './helpers/e2e-app'
import {
  registerUser,
  authHeader,
  getFirstProfileId,
  fullCleanup,
} from './helpers/e2e-helpers'

let app: INestApplication

beforeAll(async () => {
  const e2e = await createE2EApp()
  app = e2e.app
  await fullCleanup(app)
})

afterAll(async () => {
  await app.close()
})

describe('PUT /progress/:profileId', () => {
  it('should save progress for a movie → 200', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    const response = await request(app.getHttpServer())
      .put(`/progress/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 3600,
        durationSeconds: 7200,
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
  })

  it('should save progress for a series (season/episode) → 200', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    const response = await request(app.getHttpServer())
      .put(`/progress/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 1396,
        type: 'series',
        season: 1,
        episode: 1,
        progressSeconds: 1800,
        durationSeconds: 3600,
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
  })

  it('should upsert existing progress', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    await request(app.getHttpServer())
      .put(`/progress/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 1000,
        durationSeconds: 7200,
      })

    const response = await request(app.getHttpServer())
      .put(`/progress/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 5000,
        durationSeconds: 7200,
      })

    expect(response.status).toBe(200)

    const continueRes = await request(app.getHttpServer())
      .get(`/progress/${profileId}/continue`)
      .set(authHeader(accessToken!))

    const item = continueRes.body.data.items.find((i: any) => i.tmdbId === 550)
    expect(item.progressSeconds).toBe(5000)
  })

  it('should return 404 for IDOR', async () => {
    const { accessToken: tokenA } = await registerUser(app)
    const { accessToken: tokenB } = await registerUser(app)

    const profileIdB = await getFirstProfileId(app, tokenB!)

    const response = await request(app.getHttpServer())
      .put(`/progress/${profileIdB}`)
      .set(authHeader(tokenA!))
      .send({
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 1000,
        durationSeconds: 7200,
      })

    expect(response.status).toBe(404)
  })

  it('should return 400 for negative values', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    const response = await request(app.getHttpServer())
      .put(`/progress/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        progressSeconds: -100,
        durationSeconds: 7200,
      })

    expect(response.status).toBe(400)
  })

  it('should reject extra fields (mass assignment via .strict())', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    const response = await request(app.getHttpServer())
      .put(`/progress/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 1000,
        durationSeconds: 7200,
        profileId: 'injected',
        userId: 'injected',
      })

    expect(response.status).toBe(400)
  })
})

describe('GET /progress/:profileId/continue', () => {
  it('should return items with progress >0% and <90%', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    // 50% progress (should appear)
    await request(app.getHttpServer())
      .put(`/progress/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 3600,
        durationSeconds: 7200,
      })

    const response = await request(app.getHttpServer())
      .get(`/progress/${profileId}/continue`)
      .set(authHeader(accessToken!))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.items).toHaveLength(1)
    expect(response.body.data.items[0].tmdbId).toBe(550)
  })

  it('should NOT return items with >=90% progress', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    // 95% progress (should NOT appear)
    await request(app.getHttpServer())
      .put(`/progress/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 680,
        type: 'movie',
        progressSeconds: 6840,
        durationSeconds: 7200,
      })

    const response = await request(app.getHttpServer())
      .get(`/progress/${profileId}/continue`)
      .set(authHeader(accessToken!))

    const found = response.body.data.items.find((i: any) => i.tmdbId === 680)
    expect(found).toBeUndefined()
  })

  it('should return empty list', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    const response = await request(app.getHttpServer())
      .get(`/progress/${profileId}/continue`)
      .set(authHeader(accessToken!))

    expect(response.status).toBe(200)
    expect(response.body.data.items).toHaveLength(0)
  })

  it('should return 404 for IDOR', async () => {
    const { accessToken: tokenA } = await registerUser(app)
    const { accessToken: tokenB } = await registerUser(app)

    const profileIdB = await getFirstProfileId(app, tokenB!)

    const response = await request(app.getHttpServer())
      .get(`/progress/${profileIdB}/continue`)
      .set(authHeader(tokenA!))

    expect(response.status).toBe(404)
  })
})

describe('POST /history/:profileId', () => {
  it('should add to history → 201', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    const response = await request(app.getHttpServer())
      .post(`/history/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Fight Club',
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
  })

  it('should upsert existing history item', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    await request(app.getHttpServer())
      .post(`/history/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Fight Club',
      })

    const response = await request(app.getHttpServer())
      .post(`/history/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Fight Club',
      })

    expect(response.status).toBe(201)

    const listRes = await request(app.getHttpServer())
      .get(`/history/${profileId}`)
      .set(authHeader(accessToken!))

    const items = listRes.body.data.items.filter((i: any) => i.tmdbId === 550)
    expect(items).toHaveLength(1)
  })

  it('should return 404 for IDOR', async () => {
    const { accessToken: tokenA } = await registerUser(app)
    const { accessToken: tokenB } = await registerUser(app)

    const profileIdB = await getFirstProfileId(app, tokenB!)

    const response = await request(app.getHttpServer())
      .post(`/history/${profileIdB}`)
      .set(authHeader(tokenA!))
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Fight Club',
      })

    expect(response.status).toBe(404)
  })

  it('should return 400 for invalid body', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    const response = await request(app.getHttpServer())
      .post(`/history/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 'not-a-number',
      })

    expect(response.status).toBe(400)
  })
})

describe('GET /history/:profileId', () => {
  it('should list history ordered by watchedAt DESC', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    await request(app.getHttpServer())
      .post(`/history/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Fight Club',
      })

    await new Promise((r) => setTimeout(r, 50))

    await request(app.getHttpServer())
      .post(`/history/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 680,
        type: 'movie',
        title: 'Pulp Fiction',
      })

    const response = await request(app.getHttpServer())
      .get(`/history/${profileId}`)
      .set(authHeader(accessToken!))

    expect(response.status).toBe(200)
    expect(response.body.data.items).toHaveLength(2)
    expect(response.body.data.items[0].title).toBe('Pulp Fiction')
    expect(response.body.data.items[1].title).toBe('Fight Club')
    expect(response.body.data.page).toBe(1)
    expect(response.body.data.totalPages).toBeGreaterThanOrEqual(1)
  })

  it('should return 404 for IDOR', async () => {
    const { accessToken: tokenA } = await registerUser(app)
    const { accessToken: tokenB } = await registerUser(app)

    const profileIdB = await getFirstProfileId(app, tokenB!)

    const response = await request(app.getHttpServer())
      .get(`/history/${profileIdB}`)
      .set(authHeader(tokenA!))

    expect(response.status).toBe(404)
  })
})

describe('DELETE /history/:profileId', () => {
  it('should clear history → 200', async () => {
    const { accessToken } = await registerUser(app)
    const profileId = await getFirstProfileId(app, accessToken!)

    await request(app.getHttpServer())
      .post(`/history/${profileId}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Fight Club',
      })

    const response = await request(app.getHttpServer())
      .delete(`/history/${profileId}`)
      .set(authHeader(accessToken!))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)

    const listRes = await request(app.getHttpServer())
      .get(`/history/${profileId}`)
      .set(authHeader(accessToken!))

    expect(listRes.body.data.items).toHaveLength(0)
  })

  it('should return 404 for IDOR', async () => {
    const { accessToken: tokenA } = await registerUser(app)
    const { accessToken: tokenB } = await registerUser(app)

    const profileIdB = await getFirstProfileId(app, tokenB!)

    const response = await request(app.getHttpServer())
      .delete(`/history/${profileIdB}`)
      .set(authHeader(tokenA!))

    expect(response.status).toBe(404)
  })
})
