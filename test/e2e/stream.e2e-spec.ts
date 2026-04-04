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

// ---------------------------------------------------------------------------
// Helpers local ao módulo
// ---------------------------------------------------------------------------

async function startStream(
  app: INestApplication,
  token: string,
  profileId: string,
  overrides: Partial<{
    tmdbId: number
    type: 'movie' | 'series'
    title: string
  }> = {},
) {
  return request(app.getHttpServer())
    .post('/streams/start')
    .set(authHeader(token))
    .send({
      profileId,
      tmdbId: overrides.tmdbId ?? 550,
      type: overrides.type ?? 'movie',
      title: overrides.title ?? 'Fight Club',
    })
}

async function createSecondProfile(
  app: INestApplication,
  token: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/profiles')
    .set(authHeader(token))
    .send({ name: 'Perfil 2' })

  return res.body.data.profile.id as string
}

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------

describe('Streams (E2E)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const created = await createE2EApp()
    app = created.app
    await fullCleanup(app)
  })

  afterAll(async () => {
    await app.close()
  })

  // =========================================================================
  // POST /streams/start
  // =========================================================================

  describe('POST /streams/start', () => {
    it('should start a stream and return 201 with a streamId', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await startStream(app, accessToken!, profileId)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.streamId).toBeDefined()
      expect(typeof response.body.data.streamId).toBe('string')
      expect(response.body.error).toBeNull()
    })

    it('should return 401 when no token is provided', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .post('/streams/start')
        .send({
          profileId,
          tmdbId: 550,
          type: 'movie',
          title: 'Fight Club',
        })

      expect(response.status).toBe(401)
    })

    it('should return 400 when the request body is invalid', async () => {
      const { accessToken } = await registerUser(app)

      const response = await request(app.getHttpServer())
        .post('/streams/start')
        .set(authHeader(accessToken!))
        .send({
          profileId: 'not-a-uuid',
          tmdbId: -1,
          type: 'unknown',
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('[IDOR] should return 404 when profileId belongs to a different user', async () => {
      const userA = await registerUser(app)
      const userB = await registerUser(app)
      const profileIdOfB = await getFirstProfileId(app, userB.accessToken!)

      const response = await startStream(app, userA.accessToken!, profileIdOfB)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    it('should replace an existing stream when the same profile starts again (does not count against limit)', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      // First start
      const first = await startStream(app, accessToken!, profileId, {
        title: 'The Matrix',
      })
      expect(first.status).toBe(201)
      const firstStreamId = first.body.data.streamId

      // Second start on same profile — must succeed (slot is replaced, not added)
      const second = await startStream(app, accessToken!, profileId, {
        title: 'Inception',
      })

      expect(second.status).toBe(201)
      expect(second.body.success).toBe(true)
      expect(second.body.data.streamId).toBeDefined()
      expect(second.body.data.streamId).not.toBe(firstStreamId)
    })

    it('should return 409 with active streams list when max streams (basico=1) is reached', async () => {
      const { accessToken, userId } = await registerUser(app)
      // basico plan allows 1 stream and 1 profile, so upgrade to padrao to get a 2nd profile
      // but keep maxStreams=1 by staying on basico — we need 2 profiles to trigger the limit
      // with different profileIds. Upgrade to padrao (maxStreams=2, maxProfiles=3) then we
      // manually downgrade streams back to 1 via a basico-like approach. Actually the simplest
      // path: upgrade to padrao to create the 2nd profile, then downgrade back to basico.
      await upgradePlan(app, userId!, 'padrao')
      const profileId1 = await getFirstProfileId(app, accessToken!)
      const profileId2 = await createSecondProfile(app, accessToken!)

      // Downgrade back to basico (maxStreams=1)
      await upgradePlan(app, userId!, 'basico')

      // Occupy the single allowed slot
      const first = await startStream(app, accessToken!, profileId1, {
        title: 'The Matrix',
      })
      expect(first.status).toBe(201)

      // Try to start a second stream on the OTHER profile — must hit the limit
      const second = await startStream(app, accessToken!, profileId2, {
        title: 'Inception',
      })

      expect(second.status).toBe(409)
      expect(second.body.success).toBe(false)
      expect(second.body.error).toBeDefined()
      expect(second.body.error.code).toBe('MAX_STREAMS_REACHED')
      expect(second.body.error.message).toContain('1')
      expect(second.body.error.maxStreams).toBe(1)
      expect(Array.isArray(second.body.error.activeStreams)).toBe(true)
      expect(second.body.error.activeStreams).toHaveLength(1)

      const activeStream = second.body.error.activeStreams[0]
      expect(activeStream.streamId).toBeDefined()
      expect(activeStream.profileName).toBeDefined()
      expect(activeStream.title).toBeDefined()
      expect(activeStream.type).toBeDefined()
      expect(activeStream.startedAt).toBeDefined()
    })
  })

  // =========================================================================
  // PUT /streams/:id/ping
  // =========================================================================

  describe('PUT /streams/:id/ping', () => {
    it('should ping an active stream and return 200', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const started = await startStream(app, accessToken!, profileId)
      expect(started.status).toBe(201)
      const streamId = started.body.data.streamId

      const response = await request(app.getHttpServer())
        .put(`/streams/${streamId}/ping`)
        .set(authHeader(accessToken!))

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeNull()
      expect(response.body.error).toBeNull()
    })

    it('should return 404 when pinging a non-existent stream', async () => {
      const { accessToken } = await registerUser(app)

      const response = await request(app.getHttpServer())
        .put('/streams/00000000-0000-0000-0000-000000000001/ping')
        .set(authHeader(accessToken!))

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    it('[IDOR] should return 404 when pinging a stream owned by another user', async () => {
      const userA = await registerUser(app)
      const userB = await registerUser(app)

      const profileIdA = await getFirstProfileId(app, userA.accessToken!)
      const started = await startStream(app, userA.accessToken!, profileIdA)
      expect(started.status).toBe(201)
      const streamId = started.body.data.streamId

      // userB tries to ping userA's stream
      const response = await request(app.getHttpServer())
        .put(`/streams/${streamId}/ping`)
        .set(authHeader(userB.accessToken!))

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })
  })

  // =========================================================================
  // DELETE /streams/:id
  // =========================================================================

  describe('DELETE /streams/:id', () => {
    it('should stop an active stream and return 200', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const started = await startStream(app, accessToken!, profileId)
      expect(started.status).toBe(201)
      const streamId = started.body.data.streamId

      const response = await request(app.getHttpServer())
        .delete(`/streams/${streamId}`)
        .set(authHeader(accessToken!))

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeNull()
      expect(response.body.error).toBeNull()
    })

    it('should return 404 when stopping a non-existent stream', async () => {
      const { accessToken } = await registerUser(app)

      const response = await request(app.getHttpServer())
        .delete('/streams/00000000-0000-0000-0000-000000000002')
        .set(authHeader(accessToken!))

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    it('[IDOR] should return 404 when stopping a stream owned by another user', async () => {
      const userA = await registerUser(app)
      const userB = await registerUser(app)

      const profileIdA = await getFirstProfileId(app, userA.accessToken!)
      const started = await startStream(app, userA.accessToken!, profileIdA)
      expect(started.status).toBe(201)
      const streamId = started.body.data.streamId

      // userB tries to stop userA's stream
      const response = await request(app.getHttpServer())
        .delete(`/streams/${streamId}`)
        .set(authHeader(userB.accessToken!))

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    it('should free the stream slot so a new stream can be started after stopping', async () => {
      const { accessToken, userId } = await registerUser(app)
      // Need 2 profiles to prove slot liberation — upgrade to padrao temporarily
      await upgradePlan(app, userId!, 'padrao')
      const profileId1 = await getFirstProfileId(app, accessToken!)
      const profileId2 = await createSecondProfile(app, accessToken!)

      // Downgrade to basico (maxStreams=1)
      await upgradePlan(app, userId!, 'basico')

      // Fill the single slot
      const first = await startStream(app, accessToken!, profileId1, {
        title: 'The Matrix',
      })
      expect(first.status).toBe(201)
      const streamId = first.body.data.streamId

      // Confirm the second profile is blocked
      const blocked = await startStream(app, accessToken!, profileId2, {
        title: 'Inception',
      })
      expect(blocked.status).toBe(409)

      // Free the slot by stopping the first stream
      const stopped = await request(app.getHttpServer())
        .delete(`/streams/${streamId}`)
        .set(authHeader(accessToken!))
      expect(stopped.status).toBe(200)

      // Now the second profile should be able to start
      const freed = await startStream(app, accessToken!, profileId2, {
        title: 'Inception',
      })

      expect(freed.status).toBe(201)
      expect(freed.body.success).toBe(true)
      expect(freed.body.data.streamId).toBeDefined()
    })
  })

  // =========================================================================
  // Plan limits
  // =========================================================================

  describe('Plan limits', () => {
    it('basico plan: allows exactly 1 simultaneous stream', async () => {
      const { accessToken, userId } = await registerUser(app)
      // Use padrao temporarily to create 2nd profile, then downgrade
      await upgradePlan(app, userId!, 'padrao')
      const profileId1 = await getFirstProfileId(app, accessToken!)
      const profileId2 = await createSecondProfile(app, accessToken!)
      await upgradePlan(app, userId!, 'basico')

      const first = await startStream(app, accessToken!, profileId1, {
        title: 'Parasite',
      })
      expect(first.status).toBe(201)

      const second = await startStream(app, accessToken!, profileId2, {
        title: 'Joker',
      })
      expect(second.status).toBe(409)
      expect(second.body.error.maxStreams).toBe(1)
    })

    it('padrao plan: allows exactly 2 simultaneous streams on different profiles', async () => {
      const { accessToken, userId } = await registerUser(app)
      await upgradePlan(app, userId!, 'padrao')

      const profileId1 = await getFirstProfileId(app, accessToken!)
      const profileId2 = await createSecondProfile(app, accessToken!)
      const profileId3 = await createSecondProfile(app, accessToken!)

      const first = await startStream(app, accessToken!, profileId1, {
        title: 'Dune',
      })
      expect(first.status).toBe(201)

      const second = await startStream(app, accessToken!, profileId2, {
        title: 'Oppenheimer',
      })
      expect(second.status).toBe(201)

      // Third stream must be blocked
      const third = await startStream(app, accessToken!, profileId3, {
        title: 'Interstellar',
      })
      expect(third.status).toBe(409)
      expect(third.body.error.maxStreams).toBe(2)
      expect(third.body.error.activeStreams).toHaveLength(2)
    })
  })
})
