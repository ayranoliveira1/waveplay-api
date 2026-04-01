import {
  PlanProps,
  PlansGatewayPort,
} from '@/modules/identity/application/ports/plans-gateway.port'

export class FakePlansGateway implements PlansGatewayPort {
  public plans: PlanProps[] = [{ id: 'plan-basico-id', slug: 'basico' }]

  async findBySlug(slug: string): Promise<PlanProps | null> {
    return this.plans.find((p) => p.slug === slug) ?? null
  }
}
