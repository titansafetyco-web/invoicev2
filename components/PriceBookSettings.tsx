"use client";
import { useEffect, useState } from "react";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CatalogItem } from "@/lib/resources";
import { PriceBook, PriceGroup, normalizePriceBook } from "@/lib/priceBook";
import { NumericField } from "@/components/Fields";

const UNITS = ["sq ft", "lin ft", "each", "stall", "hr", "day"];

function UnitField({ label, value, onChange }: { label: string; value: string; onChange: (unit: string) => void }) {
  const options = UNITS.includes(value) ? UNITS : [value, ...UNITS];
  return (
    <select aria-label={label} className="field !bg-[length:0.85rem] !bg-[right_0.55rem_center] !px-2.5 !pr-7" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
    </select>
  );
}

function CatalogEditor({
  title,
  items,
  defaultUnit,
  onChange,
  showTitle = true,
}: {
  title: string;
  items: CatalogItem[];
  defaultUnit: string;
  onChange: (items: CatalogItem[]) => void;
  showTitle?: boolean;
}) {
  const [draft, setDraft] = useState({ name: "", unit: defaultUnit, rate: 0 });

  function add() {
    const name = draft.name.trim();
    if (!name) return;
    onChange([...items, { name, unit: draft.unit.trim() || defaultUnit, rate: Number(draft.rate) || 0 }]);
    setDraft({ name: "", unit: defaultUnit, rate: 0 });
  }

  return (
    <div className="space-y-2">
      {showTitle && <h3 className="text-lg font-bold">{title}</h3>}
      {items.length === 0 ? <p className="text-sm text-asphalt-500">None yet.</p> : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem_auto]">
              <input aria-label={`${title} name`} className="field" value={item.name} onChange={(e) => onChange(items.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} />
              <UnitField label={`${title} unit`} value={item.unit} onChange={(unit) => onChange(items.map((row, i) => i === index ? { ...row, unit } : row))} />
              <NumericField value={item.rate} onValue={(rate) => onChange(items.map((row, i) => i === index ? { ...row, rate } : row))} />
              <button type="button" aria-label={`Remove ${item.name || title}`} onClick={() => onChange(items.filter((_, i) => i !== index))} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-asphalt-700 hover:bg-asphalt-900/10"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem_auto]">
        <input aria-label={`New ${title} name`} className="field" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <UnitField label={`New ${title} unit`} value={draft.unit} onChange={(unit) => setDraft({ ...draft, unit })} />
        <NumericField value={draft.rate} onValue={(rate) => setDraft({ ...draft, rate })} />
        <button type="button" onClick={add} className="btn btn-dark"><Plus size={16} /> Add</button>
      </div>
    </div>
  );
}

export default function PriceBookSettings() {
  const [book, setBook] = useState<PriceBook | null>(null);
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("company_settings").select("price_book").eq("id", 1).maybeSingle()
      .then(({ data, error: loadError }) => {
        if (loadError) setError(loadError.message);
        setBook(normalizePriceBook(data?.price_book ?? null));
      });
  }, []);

  async function save(next: PriceBook) {
    setBook(next);
    setError("");
    const { error: saveError } = await supabase.from("company_settings").update({ price_book: next }).eq("id", 1);
    if (saveError) setError(saveError.message);
  }

  function setGroup(index: number, group: PriceGroup) {
    if (!book) return;
    save({ ...book, services: book.services.map((row, i) => i === index ? group : row) });
  }

  if (!book) return <p className="text-asphalt-500">Loading prices…</p>;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <section className="panel space-y-5">
        <div>
          <h2 className="text-xl font-bold">Services</h2>
          <p className="mt-1 text-sm text-asphalt-500">Prices the estimator picks from when building an estimate.</p>
        </div>
        {book.services.map((group, index) => {
          const expanded = open.includes(group.category);
          return (
            <div key={`${group.category}-${index}`} className="border-t border-asphalt-700/10 pt-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen((prev) => expanded ? prev.filter((name) => name !== group.category) : [...prev, group.category])}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left hover:bg-slab"
                >
                  <ChevronRight size={18} className={`shrink-0 text-asphalt-700 transition ${expanded ? "rotate-90" : ""}`} />
                  <span className="truncate text-lg font-bold">{group.category}</span>
                  <span className="text-sm font-medium text-asphalt-500">{group.items.length}</span>
                </button>
                <button type="button" className="text-sm font-semibold text-asphalt-700 hover:text-stripe" onClick={() => save({ ...book, services: book.services.filter((_, i) => i !== index) })}>Remove category</button>
              </div>
              {expanded && (
                <div className="mt-3">
                  <CatalogEditor
                    title={group.category}
                    items={group.items}
                    defaultUnit="sq ft"
                    showTitle={false}
                    onChange={(items) => setGroup(index, { ...group, items })}
                  />
                </div>
              )}
            </div>
          );
        })}
        <div className="flex flex-wrap items-end gap-2 border-t border-asphalt-700/10 pt-4">
          <div className="min-w-[16rem] flex-1">
            <label className="label" htmlFor="new-category">New category</label>
            <input id="new-category" className="field" value={category} onChange={(e) => setCategory(e.target.value)} onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const name = category.trim();
              if (!name) return;
              save({ ...book, services: [...book.services, { category: name, items: [] }] });
              setOpen((prev) => prev.includes(name) ? prev : [...prev, name]);
              setCategory("");
            }} />
          </div>
          <button type="button" className="btn btn-dark" onClick={() => {
            const name = category.trim();
            if (!name) return;
            save({ ...book, services: [...book.services, { category: name, items: [] }] });
            setOpen((prev) => prev.includes(name) ? prev : [...prev, name]);
            setCategory("");
          }}><Plus size={16} /> Add category</button>
        </div>
      </section>

      <section className="panel space-y-5">
        <div>
          <h2 className="text-xl font-bold">Crew</h2>
          <p className="mt-1 text-sm text-asphalt-500">Labor, teams, and equipment prices for the estimator.</p>
        </div>
        {([
          ["Labor", book.labor, "hr", "labor"],
          ["Teams", book.teams, "day", "teams"],
          ["Equipment", book.equipment, "day", "equipment"],
        ] as const).map(([title, items, unit, key]) => {
          const name = `crew:${title}`;
          const expanded = open.includes(name);
          return (
            <div key={title} className="border-t border-asphalt-700/10 pt-3">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen((prev) => expanded ? prev.filter((row) => row !== name) : [...prev, name])}
                className="flex w-full items-center gap-2 rounded-md py-1 text-left hover:bg-slab"
              >
                <ChevronRight size={18} className={`shrink-0 text-asphalt-700 transition ${expanded ? "rotate-90" : ""}`} />
                <span className="text-lg font-bold">{title}</span>
                <span className="text-sm font-medium text-asphalt-500">{items.length}</span>
              </button>
              {expanded && (
                <div className="mt-3">
                  <CatalogEditor title={title} items={[...items]} defaultUnit={unit} showTitle={false} onChange={(rows) => save({ ...book, [key]: rows })} />
                </div>
              )}
            </div>
          );
        })}
      </section>
      {error && <p className="text-sm text-stripe lg:col-span-2">{error}</p>}
    </div>
  );
}
