import type { Resources } from "./resources";
export type LineItem = { id: string; group: string; service: string; unit: string; qty: number; rate: number; note?: string };
export type Doc = {
  id: string; number: string; invoice_number?: string | null; type: "estimate" | "invoice";
  status: "draft" | "converted" | "ready" | "pending" | "paid";
  client_name: string; client_email: string; client_phone: string; client_address: string; job_address: string;
  line_items: LineItem[]; resources?: Resources; tax_rate: number; notes: string; due_date: string | null;
  source_estimate_id: string | null; sent_at: string | null; paid_at: string | null; created_at: string;
};
export type Company = { name: string; address: string; phone: string; email: string; tax_rate: number; payment_terms: string; logo_url: string | null };
