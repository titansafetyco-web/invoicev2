"use client";
import Link from "next/link";
import { FilePlus2, ReceiptText } from "lucide-react";
import { useDocs } from "@/components/DocList";
import OverviewVisuals from "@/components/OverviewVisuals";
import SiteMap from "@/components/SiteMap";
import { money, totals } from "@/lib/format";
import { normalizeResources } from "@/lib/resources";

export default function Overview() {
  const { docs } = useDocs();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Overview</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/new?type=estimate" className="btn btn-primary !py-5 text-base"><FilePlus2 size={20} /> Create estimate</Link>
          <Link href="/new?type=invoice" className="btn btn-dark !py-5 text-base"><ReceiptText size={20} /> Create invoice</Link>
        </div>
      </div>
      <OverviewVisuals docs={docs} activity={<RecentActivity />} />
      <SiteMap docs={docs} />
    </div>
  );
}
function RecentActivity() {
  const { docs } = useDocs(undefined, undefined, 6);
  return (
    <section className="panel h-full">
      <h2 className="mb-3 text-2xl font-bold">Recent activity</h2>
      {!docs ? <p className="text-asphalt-500">Loading…</p> : docs.length === 0 ? (
        <p className="text-asphalt-500">Nothing here yet. Start with an estimate.</p>
      ) : (
        <ul className="divide-y divide-asphalt-700/10">
          {docs.map((d) => (
            <li key={d.id}>
              <Link href={`/doc/${d.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-navy">
                <span className="min-w-0"><b className="font-display text-lg">{d.number}</b><br /><span className="text-sm text-asphalt-500">{d.client_name || "No client"} · {d.type} · {d.status}</span></span>
                <span className="font-display text-xl font-bold">{money(totals(d.line_items, d.tax_rate, normalizeResources(d.resources)).total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
