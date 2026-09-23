"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Doc } from "@/lib/types";
import { money, totals, dateFmt } from "@/lib/format";
import { normalizeResources } from "@/lib/resources";
import StatusBadge from "./StatusBadge";

type Props = { title: string; type?: "estimate" | "invoice"; statuses?: string[]; empty: string; create?: "estimate" | "invoice"; markPaid?: boolean; limit?: number };

export function useDocs(type?: string, statuses?: string[], limit?: number) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const load = useCallback(async () => {
    let q = supabase.from("documents").select("*").order("created_at", { ascending: false });
    if (type) q = q.eq("type", type);
    if (statuses) q = q.in("status", statuses);
    if (limit) q = q.limit(limit);
    const { data } = await q;
    setDocs((data as Doc[]) ?? []);
  }, [type, statuses?.join(","), limit]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  return { docs, reload: load };
}

export default function DocList({ title, type, statuses, empty, create, markPaid, limit }: Props) {
  const { docs, reload } = useDocs(type, statuses, limit);

  async function pay(id: string) {
    await supabase.from("documents").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    reload();
  }

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">{title}</h1>
        {create && <Link href={`/new?type=${create}`} className="btn btn-primary"><Plus size={18} /> New {create}</Link>}
      </div>
      {docs === null ? <p className="text-asphalt-500">Loading…</p> : docs.length === 0 ? (
        <div className="panel text-asphalt-500">{empty}</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {docs.map((d) => (
            <li key={d.id} className="panel flex flex-col gap-3">
              <Link href={`/doc/${d.id}`} className="block">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-xl font-bold">{d.number}</div>
                    <div className="text-asphalt-700">{d.client_name || "No client"}</div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="mt-2 flex items-end justify-between text-sm text-asphalt-500">
                  <span>{d.status === "paid" ? `Paid ${dateFmt(d.paid_at)}` : dateFmt(d.created_at)}</span>
                  <span className="font-display text-2xl font-bold text-asphalt-900">{money(totals(d.line_items, d.tax_rate, normalizeResources(d.resources)).total)}</span>
                </div>
              </Link>
              {markPaid && d.status === "pending" && (
                <button onClick={() => pay(d.id)} className="btn btn-dark w-full">Mark as paid</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
