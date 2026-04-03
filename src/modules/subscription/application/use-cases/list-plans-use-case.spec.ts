import { describe, it, expect, beforeEach } from 'vitest'

import { ListPlansUseCase } from './list-plans-use-case'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { Plan } from '../../domain/entities/plan'

let plansRepository: InMemoryPlansRepository
let sut: ListPlansUseCase

describe('ListPlansUseCase', () => {
  beforeEach(() => {
    plansRepository = new InMemoryPlansRepository()
    sut = new ListPlansUseCase(plansRepository)
  })

  it('should return only active plans', async () => {
    plansRepository.items.push(
      Plan.create({
        name: 'Básico',
        slug: 'basico',
        priceCents: 0,
        maxProfiles: 1,
        maxStreams: 1,
      }),
      Plan.create({
        name: 'Padrão',
        slug: 'padrao',
        priceCents: 1990,
        maxProfiles: 3,
        maxStreams: 2,
      }),
      Plan.create({
        name: 'Inativo',
        slug: 'inativo',
        priceCents: 9990,
        maxProfiles: 10,
        maxStreams: 10,
        active: false,
      }),
    )

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.plans).toHaveLength(2)
    expect(result.value.plans.map((p) => p.slug)).toEqual(['basico', 'padrao'])
  })

  it('should return empty array when no active plans exist', async () => {
    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.plans).toHaveLength(0)
  })
})
