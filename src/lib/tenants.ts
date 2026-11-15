export type TenantId = "county" | "estate" | "school";

export interface TenantConfig {
  id: TenantId;
  name: string;
  categories: string[];
  departments: Record<string, string>;
  slaHours: Record<"low" | "medium" | "high" | "critical", number>;
  fees: Record<string, number>; // category -> KES fee
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
    slaHours2: undefined,
    fees: { maintenance: 0, security:  reportError,
  },
  // placeholder
}