export interface PlanProps {
  id: string
  slug: string
}

export abstract class PlansGatewayPort {
  abstract findBySlug(slug: string): Promise<PlanProps | null>
}
