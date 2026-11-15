export type TenantId = "county" | "estate" | "school";

export interface TenantConfig {
  id: TenantId;
  name: string;
  categories: string[];
  departments: Record<string, string>;
  slaHours: Record<"low" | "medium" | "high" | "critical", number>;
  fees: Record<string, number>; // category -> KES fee (0 = free)
}

export const TENANTS: Record<TenantId, TenantConfig> = {
  county: {
    id: "county",
    name: "County Service Desk",
    categories: ["water", "roads", "waste", "lighting", "drainage", "security"],
    departments: {
      water: "Water & Sanitation",
      roads: "Roads & Transport",
      waste: "Environment & Waste",
      lighting: "Energy & Street Lighting",
      drainage: "Storm Water & Drainage",
      security: "Security & Enforcement",
    },
    slaHours: { low: 72, medium: 48, high: 24, critical: 4 },
    fees: { water: 0, roads: 0, waste: 100, lighting: 0, drainage: 150, security: 0 },
  },
  estate: {
    id: "estate",
    name: "Estate HOA Desk",
    categories: ["maintenance", "security", "landscaping", "noise"],
    departments: {
      maintenance: "Maintenance Crew",
      security: "Security Team",
      landscaping: "Grounds Committee",
      noise: "Estate Manager",
    },
    slaHours: { low: 96, medium: 72, high: 24, critical: 1 },
    fees: { maintenance: 0, security: 0, landscaping: 0, noise: 0 },
  },
  school: {
    id: "school",
    name: "School Service Desk",
    categories: ["facilities", "bullying", "academics", "transport", "health"],
    departments: {
      facilities: "Facilities Office",
      bullying: "Discipline & Welfare",
      academics: "Academic Office",
      transport: "Transport Office",
      health: "School Nurse & Welfare",
    },
    slaHours: { low: 96, medium: 48, high: 24, critical: 2 },
    fees: { facilities: 0, bullying: 0, academics: 0, transport: 0, health: 0 },
  },
};

export function getTenant(id: string): TenantConfig {
  const t = TENANTS[id as TenantId];
  if (!t) throw new Error(`Unknown tenant: ${id}`);
  return t;
}
