import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './helpers/e2e-app'
import {
  registerUser,
  authHeader,
  getFirstProfileId,
  fullCleanup,
  upgradePlan,
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

describe('Favorites', () => {
  describe('POST /favorites/:profileId', () => {
    it('should toggle favorite ON → 200 { added: true }', async () => {
      const { accessToken } = await registerUser(app)

      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .post(`/favorites/${profileId}`)
        .set(authHeader(accessToken!))
        .send({
          tmdbId: 550,
          type: 'movie',
          title: 'Fight Club',
          rating: 8.4,
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.added).toBe(true)
    })

    it('should toggle favorite OFF → 200 { added: false }', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const body = {
        tmdbId: 550,
        type: 'movie',
        title: 'Fight Club',
        rating: 8.4,
      }

      await request(app.getHttpServer())
        .post(`/favorites/${profileId}`)
        .set(authHeader(accessToken!))
        .send(body)

      const response = await request(app.getHttpServer())
        .post(`/favorites/${profileId}`)
        .set(authHeader(accessToken!))
        .send(body)

      expect(response.status).toBe(200)
      expect(response.body.data.added).toBe(false)
    })

    it('should return 404 for IDOR (profile of another user)', async () => {
      const { accessToken: tokenA } = await registerUser(app)
      const { accessToken: tokenB } = await registerUser(app)

      const profileIdB = await getFirstProfileId(app, tokenB!)

      const response = await request(app.getHttpServer())
        .post(`/favorites/${profileIdB}`)
        .set(authHeader(tokenA!))
        .send({
          tmdbId: 550,
          type: 'movie',
          title: 'Fight Club',
          rating: 8.4,
        })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    it('should return 400 for invalid body', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .post(`/favorites/${profileId}`)
        .set(authHeader(accessToken!))
        .send({
          tmdbId: 'not-a-number',
          type: 'invalid',
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should reject extra fields (mass assignment via .strict())', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .post(`/favorites/${profileId}`)
        .set(authHeader(accessToken!))
        .send({
          tmdbId: 550,
          type: 'movie',
          title: 'Fight Club',
          rating: 8.4,
          profileId: 'injected-id',
          userId: 'injected-user',
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /favorites/:profileId', () => {
    it('should list favorites with pagination', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      await request(app.getHttpServer())
        .post(`/favorites/${profileId}`)
        .set(authHeader(accessToken!))
        .send({
          tmdbId: 550,
          type: 'movie',
          title: 'Fight Club',
          rating: 8.4,
        })

      await request(app.getHttpServer())
        .post(`/favorites/${profileId}`)
        .set(authHeader(accessToken!))
        .send({
          tmdbId: 680,
          type: 'movie',
          title: 'Pulp Fiction',
          rating: 8.9,
        })

      const response = await request(app.getHttpServer())
        .get(`/favorites/${profileId}`)
        .set(authHeader(accessToken!))

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.favorites).toHaveLength(2)
      expect(response.body.data.page).toBe(1)
      expect(response.body.data.totalPages).toBeGreaterThanOrEqual(1)
    })

    it('should return empty list', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .get(`/favorites/${profileId}`)
        .set(authHeader(accessToken!))

      expect(response.status).toBe(200)
      expect(response.body.data.favorites).toHaveLength(0)
    })

    it('should return 404 for IDOR', async () => {
      const { accessToken: tokenA } = await registerUser(app)
      const { accessToken: tokenB } = await registerUser(app)

      const profileIdB = await getFirstProfileId(app, tokenB!)

      const response = await request(app.getHttpServer())
        .get(`/favorites/${profileIdB}`)
        .set(authHeader(tokenA!))

      expect(response.status).toBe(404)
    })
  })
})

describe('Watchlist', () => {
  describe('POST /watchlist/:profileId', () => {
    it('should toggle watchlist ON → 200 { added: true }', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .post(`/watchlist/${profileId}`)
        .set(authHeader(accessToken!))
        .send({
          tmdbId: 1396,
          type: 'series',
          title: 'Breaking Bad',
          rating: 9.5,
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.added).toBe(true)
    })

    it('should toggle watchlist OFF → 200 { added: false }', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const body = {
        tmdbId: 1396,
        type: 'series',
        title: 'Breaking Bad',
        rating: 9.5,
      }

      await request(app.getHttpServer())
        .post(`/watchlist/${profileId}`)
        .set(authHeader(accessToken!))
        .send(body)

      const response = await request(app.getHttpServer())
        .post(`/watchlist/${profileId}`)
        .set(authHeader(accessToken!))
        .send(body)

      expect(response.status).toBe(200)
      expect(response.body.data.added).toBe(false)
    })

    it('should return 404 for IDOR', async () => {
      const { accessToken: tokenA } = await registerUser(app)
      const { accessToken: tokenB } = await registerUser(app)

      const profileIdB = await getFirstProfileId(app, tokenB!)

      const response = await request(app.getHttpServer())
        .post(`/watchlist/${profileIdB}`)
        .set(authHeader(tokenA!))
        .send({
          tmdbId: 1396,
          type: 'series',
          title: 'Breaking Bad',
          rating: 9.5,
        })

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid body', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .post(`/watchlist/${profileId}`)
        .set(authHeader(accessToken!))
        .send({ tmdbId: -1 })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /watchlist/:profileId', () => {
    it('should list watchlist with pagination', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      await request(app.getHttpServer())
        .post(`/watchlist/${profileId}`)
        .set(authHeader(accessToken!))
        .send({
          tmdbId: 1396,
          type: 'series',
          title: 'Breaking Bad',
          rating: 9.5,
        })

      const response = await request(app.getHttpServer())
        .get(`/watchlist/${profileId}`)
        .set(authHeader(accessToken!))

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.items).toHaveLength(1)
      expect(response.body.data.page).toBe(1)
      expect(response.body.data.totalPages).toBeGreaterThanOrEqual(1)
    })

    it('should return empty list', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .get(`/watchlist/${profileId}`)
        .set(authHeader(accessToken!))

      expect(response.status).toBe(200)
      expect(response.body.data.items).toHaveLength(0)
    })

    it('should return 404 for IDOR', async () => {
      const { accessToken: tokenA } = await registerUser(app)
      const { accessToken: tokenB } = await registerUser(app)

      const profileIdB = await getFirstProfileId(app, tokenB!)

      const response = await request(app.getHttpServer())
        .get(`/watchlist/${profileIdB}`)
        .set(authHeader(tokenA!))

      expect(response.status).toBe(404)
    })
  })
})

describe('Isolation', () => {
  it('favorites from profile A should not appear in profile B', async () => {
    const { accessToken, userId } = await registerUser(app)
    await upgradePlan(app, userId!, 'padrao')

    const profileIdA = await getFirstProfileId(app, accessToken!)

    const createRes = await request(app.getHttpServer())
      .post('/profiles')
      .set(authHeader(accessToken!))
      .send({ name: 'Profile B' })

    const profileIdB = createRes.body.data.profile.id

    await request(app.getHttpServer())
      .post(`/favorites/${profileIdA}`)
      .set(authHeader(accessToken!))
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Fight Club',
        rating: 8.4,
      })

    const responseA = await request(app.getHttpServer())
      .get(`/favorites/${profileIdA}`)
      .set(authHeader(accessToken!))

    const responseB = await request(app.getHttpServer())
      .get(`/favorites/${profileIdB}`)
      .set(authHeader(accessToken!))

    expect(responseA.body.data.favorites).toHaveLength(1)
    expect(responseB.body.data.favorites).toHaveLength(0)
  })
})
