import { Service, SERVICE_GROUPS } from "@/lib/services";
import { CatalogItem, EQUIPMENT, LABOR, TEAMS } from "@/lib/resources";

export type PriceGroup = { category: string; items: Service[] };

export type PriceBook = {
  services: PriceGroup[];
  labor: CatalogItem[];
  teams: CatalogItem[];
  equipment: CatalogItem[];
};

function copyItems(items: CatalogItem[]) {
  return items.map((item) => ({ name: item.name, unit: item.unit, rate: Number(item.rate) || 0 }));
}

export const DEFAULT_PRICE_BOOK: PriceBook = {
  services: Object.entries(SERVICE_GROUPS).map(([category, items]) => ({ category, items: copyItems(items) })),
  labor: copyItems(LABOR),
  teams: copyItems(TEAMS),
  equipment: copyItems(EQUIPMENT),
};

function itemsOf(value: unknown, fallback: CatalogItem[]) {
  if (!Array.isArray(value)) return copyItems(fallback);
  return value
    .filter((item) => item && typeof item.name === "string")
    .map((item) => ({ name: String(item.name), unit: String(item.unit || "each"), rate: Number(item.rate) || 0 }));
}

export function normalizePriceBook(value: unknown): PriceBook {
  if (!value || typeof value !== "object") return structuredClone(DEFAULT_PRICE_BOOK);
  const raw = value as Partial<PriceBook>;
  const services = Array.isArray(raw.services)
    ? raw.services
        .filter((group) => group && typeof group.category === "string")
        .map((group) => ({ category: group.category, items: itemsOf(group.items, []) }))
    : structuredClone(DEFAULT_PRICE_BOOK.services);
  return {
    services,
    labor: itemsOf(raw.labor, DEFAULT_PRICE_BOOK.labor),
    teams: itemsOf(raw.teams, DEFAULT_PRICE_BOOK.teams),
    equipment: itemsOf(raw.equipment, DEFAULT_PRICE_BOOK.equipment),
  };
}
