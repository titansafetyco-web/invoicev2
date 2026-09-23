"use client";
import { useState } from "react";
import { Plus, Trash2, type LucideIcon } from "lucide-react";
import { money } from "@/lib/format";
import { CatalogItem, Charge } from "@/lib/resources";
import { NumericField } from "@/components/Fields";

const uid = () => Math.random().toString(36).slice(2, 9);

export default function Charges({
  title,
  icon: Icon,
  options,
  rows,
  onChange,
}: {
  title: string;
  icon: LucideIcon;
  options: CatalogItem[];
  rows: Charge[];
  onChange: (rows: Charge[]) => void;
}) {
  const [pick, setPick] = useState(0);
  const [qty, setQty] = useState(1);
  const chosen = options[pick] ?? options[0];
  const sum = rows.reduce((s, r) => s + r.qty * r.rate, 0);
  const qtyLabel = chosen?.unit === "hr" ? "Hours" : "Days";

  function add() {
    if (!chosen) return;
    onChange([...rows, { id: uid(), name: chosen.name, qty, unit: chosen.unit, rate: chosen.rate }]);
    setQty(1);
  }
  function patch(id: string, next: Partial<Charge>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...next } : r)));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-asphalt-700/15">
      <div className="flex items-center justify-between gap-2 border-b border-asphalt-700/10 bg-slab px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-navy text-white"><Icon size={13} /></span>
          <h3 className="truncate text-sm font-semibold">{title}</h3>
        </div>
        <div className="font-display text-base font-bold leading-none">{money(sum)}</div>
      </div>

      <div className="space-y-2 p-3">
        {options.length === 0 ? <p className="text-xs text-asphalt-500">Add prices in Settings.</p> : (
        <>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-asphalt-700" htmlFor={`${title}-pick`}>Assignment</label>
          <select id={`${title}-pick`} className="field-compact" value={pick} onChange={(e) => setPick(+e.target.value)}>
            {options.map((o, i) => <option key={`${o.name}-${i}`} value={i}>{o.name} · {money(o.rate)}/{o.unit}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <div>
            <label className="mb-0.5 block text-xs font-medium text-asphalt-700" htmlFor={`${title}-qty`}>{qtyLabel}</label>
            <NumericField id={`${title}-qty`} className="field-compact" value={qty} onValue={setQty} />
          </div>
          <button type="button" onClick={add} disabled={!chosen} className="btn btn-dark !min-h-0 !gap-1 !px-2.5 !py-1.5 text-xs"><Plus size={13} /> Add</button>
        </div>
        </>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-auto border-t border-asphalt-700/10 px-3 py-2 text-xs text-asphalt-500">Nothing assigned yet.</p>
      ) : (
        <ul className="mt-auto border-t border-asphalt-700/15">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_4.25rem_4.5rem_1.75rem] items-center gap-1.5 border-b border-asphalt-700/10 bg-white px-2 py-1.5 last:border-b-0 even:bg-[#f3f4f6]">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium leading-tight">{r.name}</div>
                <div className="text-[11px] leading-tight text-asphalt-500">{money(r.qty * r.rate)}</div>
              </div>
              <NumericField className="field-compact !px-1.5 text-center" value={r.qty} onValue={(qty) => patch(r.id, { qty })} />
              <NumericField className="field-compact !px-1.5 text-center" value={r.rate} onValue={(rate) => patch(r.id, { rate })} />
              <button type="button" aria-label={`Remove ${r.name}`} onClick={() => onChange(rows.filter((x) => x.id !== r.id))} className="inline-flex h-7 w-7 items-center justify-center rounded text-asphalt-700 hover:bg-asphalt-900/10"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
