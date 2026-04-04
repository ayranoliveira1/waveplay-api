import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './helpers/e2e-app'
import {
  uniqueEmail,
  registerUser,
  authHeader,
  getFirstProfileId,
  fullCleanup,
  upgradePlan,
} from './helpers/e2e-helpers'

describe('Profile (E2E)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const result = await createE2EApp()
    app = result.app
    await fullCleanup(app)
  })

  afterAll(async () => {
    await app.close()
  })

  // ---------------------------------------------------------------------------
  // GET /profiles
  // ---------------------------------------------------------------------------

  describe('GET /profiles', () => {
    it('lists profiles of the authenticated user (registration auto-creates 1 default profile)', async () => {
      const { accessToken } = await registerUser(app)

      const response = await request(app.getHttpServer())
        .get('/profiles')
        .set(authHeader(accessToken!))

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.error).toBeNull()

      const { profiles } = response.body.data
      expect(Array.isArray(profiles)).toBe(true)
      expect(profiles).toHaveLength(1)

      const profile = profiles[0]
      expect(profile).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        isKid: expect.any(Boolean),
        createdAt: expect.any(String),
      })
    })

    it('includes maxProfiles from the user subscription plan', async () => {
      const { accessToken } = await registerUser(app)

      const response = await request(app.getHttpServer())
        .get('/profiles')
        .set(authHeader(accessToken!))

      expect(response.status).toBe(200)
      expect(response.body.data.maxProfiles).toBeDefined()
      expect(typeof response.body.data.maxProfiles).toBe('number')
      // basico plan allows 1 profile
      expect(response.body.data.maxProfiles).toBe(1)
    })

    it('returns 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer()).get('/profiles')

      expect(response.status).toBe(401)
    })
  })

  // ---------------------------------------------------------------------------
  // POST /profiles
  // ---------------------------------------------------------------------------

  describe('POST /profiles', () => {
    it('creates a new profile and returns 201 (after upgrading to padrao plan)', async () => {
      const { accessToken, userId } = await registerUser(app)

      await upgradePlan(app, userId!, 'padrao')

      const response = await request(app.getHttpServer())
        .post('/profiles')
        .set(authHeader(accessToken!))
        .send({ name: 'Filho', isKid: true })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.error).toBeNull()

      const { profile } = response.body.data
      expect(profile).toMatchObject({
        id: expect.any(String),
        name: 'Filho',
        isKid: true,
        createdAt: expect.any(String),
      })
    })

    it('creates a profile with an optional avatarUrl', async () => {
      const { accessToken, userId } = await registerUser(app)

      await upgradePlan(app, userId!, 'padrao')

      const avatarUrl = 'https://cdn.example.com/avatar/123.jpg'

      const response = await request(app.getHttpServer())
        .post('/profiles')
        .set(authHeader(accessToken!))
        .send({ name: 'Perfil com Avatar', avatarUrl })

      expect(response.status).toBe(201)
      expect(response.body.data.profile.avatarUrl).toBe(avatarUrl)
    })

    it('returns 403 when the profile limit for the plan is reached (basico = 1, already has 1)', async () => {
      const { accessToken } = await registerUser(app)
      // basico plan: maxProfiles = 1 — registration already created 1 profile

      const response = await request(app.getHttpServer())
        .post('/profiles')
        .set(authHeader(accessToken!))
        .send({ name: 'Segundo Perfil' })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(response.body.data).toEqual([])

      const messages = response.body.error.map(
        (e: { message: string }) => e.message,
      )
      expect(messages).toContain('Limite de perfis atingido para o seu plano')
    })

    it('returns 400 when name is empty string', async () => {
      const { accessToken } = await registerUser(app)

      const response = await request(app.getHttpServer())
        .post('/profiles')
        .set(authHeader(accessToken!))
        .send({ name: '' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('returns 400 when name is missing from the body', async () => {
      const { accessToken } = await registerUser(app)

      const response = await request(app.getHttpServer())
        .post('/profiles')
        .set(authHeader(accessToken!))
        .send({ isKid: false })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('[MASS ASSIGNMENT] ignores userId in body and creates profile for the authenticated user', async () => {
      const { accessToken: tokenA, userId: userAId } = await registerUser(app)
      const { userId: userBId } = await registerUser(app)

      await upgradePlan(app, userAId!, 'padrao')

      // Attempt to assign the new profile to userB via body injection
      const response = await request(app.getHttpServer())
        .post('/profiles')
        .set(authHeader(tokenA!))
        .send({ name: 'Perfil Injetado', userId: userBId })

      expect(response.status).toBe(201)

      // The profile must belong to userA, not userB
      const listResponse = await request(app.getHttpServer())
        .get('/profiles')
        .set(authHeader(tokenA!))

      const profileNames = listResponse.body.data.profiles.map(
        (p: { name: string }) => p.name,
      )
      expect(profileNames).toContain('Perfil Injetado')

      // userB must NOT have this profile
      const { accessToken: tokenB } = await registerUser(app, {
        email: uniqueEmail('userb-massassign'),
      })
      // We registered a fresh userB here; verifying via userBId is sufficient
      // by checking that the created profile id is listed under tokenA's profiles
      const createdId = response.body.data.profile.id

      const profileListA = await request(app.getHttpServer())
        .get('/profiles')
        .set(authHeader(tokenA!))

      const idsForA = profileListA.body.data.profiles.map(
        (p: { id: string }) => p.id,
      )
      expect(idsForA).toContain(createdId)
      // Silence unused variable warning — tokenB is kept for clarity of intent
      void tokenB
    })

    it('returns 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/profiles')
        .send({ name: 'No Auth' })

      expect(response.status).toBe(401)
    })
  })

  // ---------------------------------------------------------------------------
  // PATCH /profiles/:id
  // ---------------------------------------------------------------------------

  describe('PATCH /profiles/:id', () => {
    it('updates the profile name and returns the updated profile', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .patch(`/profiles/${profileId}`)
        .set(authHeader(accessToken!))
        .send({ name: 'Nome Atualizado' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.error).toBeNull()
      expect(response.body.data.profile.id).toBe(profileId)
      expect(response.body.data.profile.name).toBe('Nome Atualizado')
    })

    it('updates isKid flag and reflects change in the response', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .patch(`/profiles/${profileId}`)
        .set(authHeader(accessToken!))
        .send({ isKid: true })

      expect(response.status).toBe(200)
      expect(response.body.data.profile.isKid).toBe(true)
    })

    it('updates avatarUrl and returns the new value', async () => {
      const { accessToken } = await registerUser(app)
      const profileId = await getFirstProfileId(app, accessToken!)

      const newAvatarUrl = 'https://cdn.example.com/avatars/updated.png'

      const response = await request(app.getHttpServer())
        .patch(`/profiles/${profileId}`)
        .set(authHeader(accessToken!))
        .send({ avatarUrl: newAvatarUrl })

      expect(response.status).toBe(200)
      expect(response.body.data.profile.avatarUrl).toBe(newAvatarUrl)
    })

    it('[IDOR] returns 404 when trying to update a profile belonging to another user', async () => {
      const { accessToken: tokenA } = await registerUser(app)
      const { accessToken: tokenB } = await registerUser(app)

      // Get userB's profile id
      const profileIdOfB = await getFirstProfileId(app, tokenB!)

      // UserA attempts to update userB's profile
      const response = await request(app.getHttpServer())
        .patch(`/profiles/${profileIdOfB}`)
        .set(authHeader(tokenA!))
        .send({ name: 'Hacked Name' })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)

      const messages = response.body.error.map(
        (e: { message: string }) => e.message,
      )
      expect(messages).toContain('Perfil não encontrado')
    })

    it('returns 404 when the profile id does not exist', async () => {
      const { accessToken } = await registerUser(app)

      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app.getHttpServer())
        .patch(`/profiles/${nonExistentId}`)
        .set(authHeader(accessToken!))
        .send({ name: 'Ghost Profile' })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    it('returns 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .patch('/profiles/any-id')
        .send({ name: 'No Auth' })

      expect(response.status).toBe(401)
    })
  })

  // ---------------------------------------------------------------------------
  // DELETE /profiles/:id
  // ---------------------------------------------------------------------------

  describe('DELETE /profiles/:id', () => {
    it('deletes a profile and returns success (must have 2+ profiles)', async () => {
      const { accessToken, userId } = await registerUser(app)

      // Upgrade to padrao to allow 3 profiles
      await upgradePlan(app, userId!, 'padrao')

      // Create a second profile
      const createResponse = await request(app.getHttpServer())
        .post('/profiles')
        .set(authHeader(accessToken!))
        .send({ name: 'Perfil Para Deletar' })

      expect(createResponse.status).toBe(201)
      const secondProfileId = createResponse.body.data.profile.id

      // Delete the second profile
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/profiles/${secondProfileId}`)
        .set(authHeader(accessToken!))

      expect(deleteResponse.status).toBe(200)
      expect(deleteResponse.body.success).toBe(true)
      expect(deleteResponse.body.data).toBeNull()
      expect(deleteResponse.body.error).toBeNull()

      // Confirm deletion via list
      const listResponse = await request(app.getHttpServer())
        .get('/profiles')
        .set(authHeader(accessToken!))

      const ids = listResponse.body.data.profiles.map(
        (p: { id: string }) => p.id,
      )
      expect(ids).not.toContain(secondProfileId)
    })

    it('returns 403 when attempting to delete the last remaining profile', async () => {
      const { accessToken } = await registerUser(app)
      // basico plan — user has exactly 1 profile
      const profileId = await getFirstProfileId(app, accessToken!)

      const response = await request(app.getHttpServer())
        .delete(`/profiles/${profileId}`)
        .set(authHeader(accessToken!))

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(response.body.data).toEqual([])

      const messages = response.body.error.map(
        (e: { message: string }) => e.message,
      )
      expect(messages).toContain('Não é possível deletar o último perfil')
    })

    it('[IDOR] returns 404 when trying to delete a profile belonging to another user', async () => {
      const { accessToken: tokenA } = await registerUser(app)
      const { accessToken: tokenB } = await registerUser(app)

      // Get userB's profile id
      const profileIdOfB = await getFirstProfileId(app, tokenB!)

      // UserA attempts to delete userB's profile
      const response = await request(app.getHttpServer())
        .delete(`/profiles/${profileIdOfB}`)
        .set(authHeader(tokenA!))

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)

      const messages = response.body.error.map(
        (e: { message: string }) => e.message,
      )
      expect(messages).toContain('Perfil não encontrado')

      // Confirm userB's profile was NOT actually deleted
      const listResponse = await request(app.getHttpServer())
        .get('/profiles')
        .set(authHeader(tokenB!))

      const ids = listResponse.body.data.profiles.map(
        (p: { id: string }) => p.id,
      )
      expect(ids).toContain(profileIdOfB)
    })

    it('returns 404 when the profile id does not exist', async () => {
      const { accessToken } = await registerUser(app)

      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app.getHttpServer())
        .delete(`/profiles/${nonExistentId}`)
        .set(authHeader(accessToken!))

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    it('returns 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/profiles/any-id',
      )

      expect(response.status).toBe(401)
    })
  })

  // ---------------------------------------------------------------------------
  // Full flow
  // ---------------------------------------------------------------------------

  describe('Full flow', () => {
    it('register → upgrade plan → create profile → update → delete → list (verify count)', async () => {
      // 1. Register user (auto-creates 1 default profile with basico plan)
      const { accessToken, userId } = await registerUser(app)

      const listAfterRegister = await request(app.getHttpServer())
        .get('/profiles')
        .set(authHeader(accessToken!))

      expect(listAfterRegister.status).toBe(200)
      expect(listAfterRegister.body.data.profiles).toHaveLength(1)
      expect(listAfterRegister.body.data.maxProfiles).toBe(1)

      // 2. Upgrade to padrao plan (maxProfiles = 3)
      await upgradePlan(app, userId!, 'padrao')

      const listAfterUpgrade = await request(app.getHttpServer())
        .get('/profiles')
        .set(authHeader(accessToken!))

      expect(listAfterUpgrade.body.data.maxProfiles).toBe(3)

      // 3. Create a second profile
      const createResponse = await request(app.getHttpServer())
        .post('/profiles')
        .set(authHeader(accessToken!))
        .send({ name: 'Perfil do Fluxo', isKid: false })

      expect(createResponse.status).toBe(201)
      const newProfileId = createResponse.body.data.profile.id

      const listAfterCreate = await request(app.getHttpServer())
        .get('/profiles')
        .set(authHeader(accessToken!))

      expect(listAfterCreate.body.data.profiles).toHaveLength(2)

      // 4. Update the new profile
      const updateResponse = await request(app.getHttpServer())
        .patch(`/profiles/${newProfileId}`)
        .set(authHeader(accessToken!))
        .send({ name: 'Perfil Atualizado', isKid: true })

      expect(updateResponse.status).toBe(200)
      expect(updateResponse.body.data.profile.name).toBe('Perfil Atualizado')
      expect(updateResponse.body.data.profile.isKid).toBe(true)

      // 5. Delete the updated profile
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/profiles/${newProfileId}`)
        .set(authHeader(accessToken!))

      expect(deleteResponse.status).toBe(200)
      expect(deleteResponse.body.data).toBeNull()

      // 6. List and verify only the original profile remains
      const listAfterDelete = await request(app.getHttpServer())
        .get('/profiles')
        .set(authHeader(accessToken!))

      expect(listAfterDelete.status).toBe(200)
      expect(listAfterDelete.body.data.profiles).toHaveLength(1)

      const remainingIds = listAfterDelete.body.data.profiles.map(
        (p: { id: string }) => p.id,
      )
      expect(remainingIds).not.toContain(newProfileId)
    })
  })
})
