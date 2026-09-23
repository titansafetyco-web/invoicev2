export type Charge = { id: string; name: string; qty: number; unit: string; rate: number };
export type Resources = { labor: Charge[]; teams: Charge[]; equipment: Charge[] };

export const EMPTY_RESOURCES: Resources = { labor: [], teams: [], equipment: [] };

export type CatalogItem = { name: string; unit: string; rate: number };

// Placeholder day and hour rates. Adjust to match the crew.
export const LABOR: CatalogItem[] = [
  { name: "Foreman", unit: "hr", rate: 65 },
  { name: "Paving operator", unit: "hr", rate: 55 },
  { name: "Laborer", unit: "hr", rate: 35 },
  { name: "Raker", unit: "hr", rate: 40 },
  { name: "Truck driver", unit: "hr", rate: 42 },
];

export const TEAMS: CatalogItem[] = [
  { name: "Paving crew (4)", unit: "day", rate: 1800 },
  { name: "Seal coat crew (3)", unit: "day", rate: 950 },
  { name: "Striping crew (2)", unit: "day", rate: 650 },
  { name: "Concrete crew (3)", unit: "day", rate: 1200 },
  { name: "Repair crew (2)", unit: "day", rate: 800 },
];

export const EQUIPMENT: CatalogItem[] = [
  { name: "Asphalt paver", unit: "day", rate: 850 },
  { name: "Steel drum roller", unit: "day", rate: 275 },
  { name: "Pneumatic roller", unit: "day", rate: 225 },
  { name: "Milling machine", unit: "day", rate: 1100 },
  { name: "Dump truck", unit: "day", rate: 350 },
  { name: "Skid steer", unit: "day", rate: 275 },
  { name: "Seal coat distributor", unit: "day", rate: 400 },
  { name: "Line striper", unit: "day", rate: 150 },
];

export function normalizeResources(value: unknown): Resources {
  const raw = (value ?? {}) as Partial<Resources>;
  return {
    labor: Array.isArray(raw.labor) ? raw.labor : [],
    teams: Array.isArray(raw.teams) ? raw.teams : [],
    equipment: Array.isArray(raw.equipment) ? raw.equipment : [],
  };
}
