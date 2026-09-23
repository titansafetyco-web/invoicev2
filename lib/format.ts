import { LineItem } from "./types";
import { Charge, Resources } from "./resources";
export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const chargeSum = (rows: Charge[] = []) => rows.reduce((s, r) => s + r.qty * r.rate, 0);
export const totals = (items: LineItem[] = [], taxRate: number, resources?: Resources) => {
  const services = (items ?? []).reduce((s, i) => s + i.qty * i.rate, 0);
  const labor = chargeSum(resources?.labor);
  const teams = chargeSum(resources?.teams);
  const equipment = chargeSum(resources?.equipment);
  const subtotal = services + labor + teams + equipment;
  const tax = subtotal * (taxRate / 100);
  return { services, labor, teams, equipment, subtotal, tax, total: subtotal + tax };
};
export const dateFmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
