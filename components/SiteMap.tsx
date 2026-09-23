"use client";
import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Doc } from "@/lib/types";

type Site = { address: string; label: string };

export default function SiteMap({ docs }: { docs: Doc[] | null }) {
  const [office, setOffice] = useState("");
  const [picked, setPicked] = useState(0);

  useEffect(() => {
    supabase.from("company_settings").select("address").eq("id", 1).maybeSingle()
      .then(({ data }) => setOffice((data?.address || "").trim()));
  }, []);

  const sites = useMemo(() => {
    const seen = new Set<string>();
    const rows: Site[] = [];
    for (const doc of docs ?? []) {
      const address = (doc.job_address || "").trim();
      if (!address) continue;
      const key = address.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ address, label: doc.client_name || doc.number });
    }
    return rows;
  }, [docs]);

  const current = sites[Math.min(picked, Math.max(sites.length - 1, 0))];
  const address = current?.address || office;
  const mapSrc = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`
    : "";

  return (
    <section className="panel">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Job sites</h2>
          <p className="text-sm text-asphalt-500">
            {current ? current.label : office ? "Office, until a job site is added." : "Add an address in Settings to show the map."}
          </p>
        </div>
        {address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-navy hover:underline"
          >
            Open in Google Maps
          </a>
        )}
      </div>
      {sites.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {sites.map((site, i) => (
            <button
              key={site.address}
              type="button"
              aria-pressed={address === site.address}
              onClick={() => setPicked(i)}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-xs font-semibold ${address === site.address ? "bg-navy text-white" : "bg-slab text-asphalt-700 hover:bg-slab-dark"}`}
            >
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{site.label}</span>
            </button>
          ))}
        </div>
      )}
      {address && (
        <p className="mb-3 flex items-start gap-1.5 text-sm text-asphalt-700">
          <MapPin size={16} className="mt-0.5 shrink-0 text-stripe" />
          <span>{address}</span>
        </p>
      )}
      {mapSrc ? (
        <iframe
          title={`Map of ${address}`}
          src={mapSrc}
          className="h-80 w-full rounded-md border border-asphalt-700/15"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <p className="text-asphalt-500">{docs === null ? "Loading…" : "No address to map yet."}</p>
      )}
    </section>
  );
}
