"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Eye, HardHat, Pencil, Plus, Printer, Trash2, Truck, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Doc, LineItem, Company } from "@/lib/types";
import { money, totals, dateFmt } from "@/lib/format";
import { Address, companyAddressLines, formatAddress, formatPhone, parseAddress } from "@/lib/address";
import { Resources, normalizeResources } from "@/lib/resources";
import { DEFAULT_PRICE_BOOK, PriceBook, normalizePriceBook } from "@/lib/priceBook";
import { invoiceDigits, nextInvoiceNumber } from "@/lib/invoiceNumber";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import { AddressFields, NumericField } from "@/components/Fields";
import Charges from "@/components/Charges";
import LogoImage from "@/components/LogoImage";

const uid = () => Math.random().toString(36).slice(2, 9);
const numberFor = (t: string) => `${t === "estimate" ? "EST" : "INV"}-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

export default function Builder({ type, doc }: { type: "estimate" | "invoice"; doc?: Doc }) {
  const router = useRouter();
  const [f, setF] = useState({
    client_name: doc?.client_name ?? "", client_email: doc?.client_email ?? "", client_phone: formatPhone(doc?.client_phone ?? ""),
    notes: doc?.notes ?? "", tax_rate: doc?.tax_rate ?? 0, due_date: doc?.due_date ?? "",
  });
  const [billing, setBilling] = useState<Address>(() => parseAddress(doc?.client_address ?? ""));
  const [job, setJob] = useState<Address>(() => parseAddress(doc?.job_address ?? ""));
  const [sameAsBilling, setSameAsBilling] = useState((doc?.job_address ?? "") === (doc?.client_address ?? ""));
  const [items, setItems] = useState<LineItem[]>(doc?.line_items ?? []);
  const [resources, setResources] = useState<Resources>(() => normalizeResources(doc?.resources));
  const [book, setBook] = useState<PriceBook>(DEFAULT_PRICE_BOOK);
  const [co, setCo] = useState<Company | null>(null);
  const [preview, setPreview] = useState(false);
  const [group, setGroup] = useState(DEFAULT_PRICE_BOOK.services[0].category);
  const [svc, setSvc] = useState(0);
  const [qty, setQty] = useState(1);
  const [customName, setCustomName] = useState("");
  const [customRate, setCustomRate] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState(doc?.type === "invoice" ? invoiceDigits(doc.number) : invoiceDigits(doc?.invoice_number ?? ""));
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    supabase.from("documents").select("id, type, status, number, invoice_number").then(({ data }) => {
      const rows = (data ?? []) as Pick<Doc, "id" | "type" | "status" | "number" | "invoice_number">[];
      const used = rows.flatMap((row) => {
        if (row.id === doc?.id) return [];
        if (row.type === "invoice" && /^\d+$/.test(row.number)) return [row.number];
        if (row.type === "estimate" && row.status === "draft" && row.invoice_number && /^\d+$/.test(row.invoice_number)) return [row.invoice_number];
        return [];
      });
      const current = doc?.type === "invoice" ? invoiceDigits(doc.number) : invoiceDigits(doc?.invoice_number ?? "");
      setInvoiceNumber((prev) => current || prev || nextInvoiceNumber(used));
    });
    supabase.from("company_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (!data) return;
      setCo(data as Company);
      if (!doc) set("tax_rate", (data as Company).tax_rate ?? 0);
      const next = normalizePriceBook((data as Company & { price_book?: unknown }).price_book);
      setBook(next);
      setGroup((current) => next.services.some((row) => row.category === current && row.items.length) ? current : (next.services.find((row) => row.items.length)?.category ?? ""));
    });
  }, [doc]);

  const catalog = book.services.filter((row) => row.items.length > 0);
  const active = catalog.find((row) => row.category === group) ?? catalog[0];
  const services = active?.items ?? [];
  const chosenService = services[Math.min(svc, Math.max(services.length - 1, 0))];
  const custom = active?.category.trim().toLowerCase() === "other";
  const addItem = () => {
    if (!active) return;
    if (custom) {
      const name = customName.trim();
      if (!name) return;
      setItems((p) => [...p, { id: uid(), group: active.category, service: name, unit: "sq ft", qty, rate: customRate }]);
      setCustomName("");
      setCustomRate(0);
      setQty(1);
      return;
    }
    if (!chosenService) return;
    const s = chosenService;
    setItems((p) => [...p, { id: uid(), group: active.category, service: s.name, unit: s.unit, qty, rate: s.rate }]);
    setQty(1);
  };
  const upd = (id: string, patch: Partial<LineItem>) => setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const t = totals(items, f.tax_rate, resources);
  const setResource = (key: keyof Resources, rows: Resources[keyof Resources]) => setResources((p) => ({ ...p, [key]: rows }));

  async function save(publish: boolean) {
    if (!f.client_name.trim()) return alert("Add a client name first.");
    const hasCharges = items.length || resources.labor.length || resources.teams.length || resources.equipment.length;
    if (!hasCharges) return alert("Add a service, labor charge, team, or equipment assignment.");
    setBusy(true);
    const { data: taken } = await supabase.from("documents").select("id, type, status, number, invoice_number");
    const used = ((taken ?? []) as Pick<Doc, "id" | "type" | "status" | "number" | "invoice_number">[]).flatMap((row) => {
      if (row.id === doc?.id) return [];
      if (row.type === "invoice" && /^\d+$/.test(row.number)) return [row.number];
      if (row.type === "estimate" && row.status === "draft" && row.invoice_number && /^\d+$/.test(row.invoice_number)) return [row.invoice_number];
      return [];
    });
    const wanted = invoiceDigits(invoiceNumber);
    const assigned = wanted && !used.includes(wanted) ? wanted : nextInvoiceNumber(used);
    setInvoiceNumber(assigned);
    const base = {
      ...f,
      client_phone: formatPhone(f.client_phone),
      client_address: formatAddress(billing),
      job_address: formatAddress(sameAsBilling ? billing : job),
      due_date: f.due_date || null,
      line_items: items,
      resources,
    };
    let id = doc?.id;

    if (type === "estimate") {
      if (id) await supabase.from("documents").update(base).eq("id", id);
      else { const { data } = await supabase.from("documents").insert({ ...base, number: numberFor("estimate"), invoice_number: assigned, type: "estimate", status: "draft" }).select().single(); id = data?.id; }
      if (id && doc?.id) await supabase.from("documents").update({ invoice_number: assigned }).eq("id", id);
      if (publish && id) {
        const { data: inv } = await supabase.from("documents").insert({ ...base, number: assigned, invoice_number: assigned, type: "invoice", status: "ready", source_estimate_id: id }).select().single();
        await supabase.from("documents").update({ status: "converted" }).eq("id", id);
        id = inv?.id;
      }
    } else {
      if (id) await supabase.from("documents").update(base).eq("id", id);
      else { const { data } = await supabase.from("documents").insert({ ...base, number: assigned, invoice_number: assigned, type: "invoice", status: "ready" }).select().single(); id = data?.id; }
      if (id && doc?.id) await supabase.from("documents").update({ number: assigned, invoice_number: assigned }).eq("id", id);
    }
    setBusy(false);
    router.push(id ? `/doc/${id}` : "/");
  }

  const billTo = formatAddress(billing);
  const site = formatAddress(sameAsBilling ? billing : job);
  const issued = dateFmt(new Date().toISOString());

  return (
    <>
    <div className={`space-y-5 ${preview ? "no-print" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">{doc ? "Edit" : "New"} {type}</h1>
        <Link href={doc ? `/doc/${doc.id}` : type === "invoice" ? "/invoices" : "/estimates"} className="btn btn-ghost"><ArrowLeft size={16} /> Back</Link>
      </div>

      <section className="panel space-y-6">
        <div className="border-b border-asphalt-700/10 pb-3">
          <h2 className="text-2xl font-bold">Client</h2>
          <p className="text-sm text-asphalt-500">Who to bill, and where the work happens.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <div>
              <label className="label" htmlFor="client-name">Client name</label>
              <input id="client-name" className="field" autoComplete="name" value={f.client_name} onChange={(e) => set("client_name", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="invoice-number">Invoice #</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-asphalt-700">#</span>
                <input id="invoice-number" inputMode="numeric" className="field pl-7" value={invoiceNumber} onChange={(e) => setInvoiceNumber(invoiceDigits(e.target.value))} />
              </div>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="client-email">Client email</label>
            <input id="client-email" type="email" inputMode="email" autoComplete="email" className="field" value={f.client_email} onChange={(e) => set("client_email", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="client-phone">Client phone</label>
            <input id="client-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 555-5555" className="field" value={f.client_phone} onChange={(e) => set("client_phone", formatPhone(e.target.value, f.client_phone))} />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md bg-slab p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-asphalt-700">Billing address</h3>
            <AddressFields idPrefix="billing" value={billing} onChange={setBilling} />
          </div>
          <div className="rounded-md bg-slab p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-asphalt-700">Job site</h3>
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-navy"
                  checked={sameAsBilling}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setSameAsBilling(on);
                    if (!on) setJob(billing);
                  }}
                />
                Same as billing
              </label>
            </div>
            <AddressFields idPrefix="job" value={sameAsBilling ? billing : job} onChange={setJob} disabled={sameAsBilling} />
          </div>
        </div>
      </section>

      <div className="panel space-y-4">
        <h2 className="text-2xl font-bold">Add services</h2>
        <div className={`grid gap-3 sm:items-end ${custom ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_7rem_8.5rem_auto]" : "sm:grid-cols-[1fr_2fr_7rem_auto]"}`}>
          <div><label className="label">Category</label>
            <select className="field" value={active?.category ?? ""} onChange={(e) => { setGroup(e.target.value); setSvc(0); }}>
              {catalog.map((row, i) => <option key={`${row.category}-${i}`}>{row.category}</option>)}
            </select></div>
          {custom ? (
            <div><label className="label" htmlFor="custom-service">Service</label>
              <input id="custom-service" className="field" placeholder="Service name" value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} /></div>
          ) : (
            <div><label className="label">Service</label>
              <select className="field" value={services.length ? Math.min(svc, services.length - 1) : 0} onChange={(e) => setSvc(+e.target.value)}>
                {services.map((s, i) => <option key={s.name} value={i}>{s.name} ({money(s.rate)}/{s.unit})</option>)}
              </select></div>
          )}
          {custom && (
            <div><label className="label" htmlFor="custom-rate">Rate / sq ft</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-asphalt-700">$</span>
                <NumericField id="custom-rate" money className="field pl-7" value={customRate} onValue={setCustomRate} />
              </div>
            </div>
          )}
          <div><label className="label">Qty ({custom ? "sq ft" : chosenService?.unit ?? "unit"})</label>
            <NumericField value={qty} onValue={setQty} /></div>
          <button onClick={addItem} disabled={custom ? !customName.trim() : !chosenService} className="btn btn-dark"><Plus size={18} /> Add</button>
        </div>

        {items.length === 0 ? <p className="text-asphalt-500">No services yet. Pick a category and service above.</p> : (
          <div className="sheet">
            <div className="sheet-head">
              <div className="sheet-cell">Service</div>
              <div className="sheet-cell normal-case">Qty ({items.every((i) => i.unit === items[0].unit) ? items[0].unit : "unit"})</div>
              <div className="sheet-cell normal-case">Rate Qty ({items.every((i) => i.unit === items[0].unit) ? items[0].unit : "unit"})</div>
              <div className="sheet-cell sm:text-right">Amount</div>
              <div className="sm:border-0" />
            </div>
            <ul>
              {items.map((i) => (
                <li key={i.id} className="sheet-row">
                  <div className="sheet-cell">
                    <div className="font-medium leading-snug">{i.service}</div>
                    <div className="text-xs text-asphalt-500">{i.group}</div>
                  </div>
                  <label className="sheet-cell">
                    <span className="text-xs text-asphalt-500 sm:sr-only">Qty ({i.unit})</span>
                    <NumericField className="sheet-input" value={i.qty} onValue={(qty) => upd(i.id, { qty })} />
                  </label>
                  <label className="sheet-cell">
                    <span className="text-xs text-asphalt-500 sm:sr-only">Rate</span>
                    <NumericField id={`rate-${i.id}`} className="sheet-input" value={i.rate} onValue={(rate) => upd(i.id, { rate })} />
                  </label>
                  <div className="sheet-cell font-display text-xl font-bold sm:text-right">{money(i.qty * i.rate)}</div>
                  <div className="flex items-center gap-0.5 sm:justify-center sm:border-0">
                    <button aria-label="Edit price" onClick={() => {
                      const el = document.getElementById(`rate-${i.id}`) as HTMLInputElement | null;
                      el?.focus();
                      requestAnimationFrame(() => el?.select());
                    }} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-asphalt-700 hover:bg-asphalt-900/10"><Pencil size={16} /></button>
                    <button aria-label="Remove" onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-asphalt-700 hover:bg-asphalt-900/10"><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <section className="panel space-y-5">
        <div className="border-b border-asphalt-700/10 pb-3">
          <h2 className="text-2xl font-bold">Crew & equipment</h2>
          <p className="text-sm text-asphalt-500">Labor, teams, and machines roll into the total below.</p>
        </div>
        <div className="grid items-start gap-3 md:grid-cols-3">
          <Charges title="Labor" icon={HardHat} options={book.labor} rows={resources.labor} onChange={(rows) => setResource("labor", rows)} />
          <Charges title="Teams" icon={Users} options={book.teams} rows={resources.teams} onChange={(rows) => setResource("teams", rows)} />
          <Charges title="Equipment" icon={Truck} options={book.equipment} rows={resources.equipment} onChange={(rows) => setResource("equipment", rows)} />
        </div>
        <div className="grid gap-4 border-t border-asphalt-700/10 pt-4 sm:grid-cols-2">
          <div className="space-y-4">
            <div><label className="label">Tax rate (%)</label><NumericField value={f.tax_rate} onValue={(tax_rate) => set("tax_rate", tax_rate)} /></div>
            {type === "invoice" && <div><label className="label">Due date</label><input type="date" className="field" value={f.due_date ?? ""} onChange={(e) => set("due_date", e.target.value)} /></div>}
            <div><label className="label">Notes</label><textarea rows={3} className="field" value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </div>
          <dl className="space-y-2 self-end text-lg">
            <div className="flex justify-between"><dt>Services</dt><dd>{money(t.services)}</dd></div>
            <div className="flex justify-between"><dt>Labor</dt><dd>{money(t.labor)}</dd></div>
            <div className="flex justify-between"><dt>Teams</dt><dd>{money(t.teams)}</dd></div>
            <div className="flex justify-between"><dt>Equipment</dt><dd>{money(t.equipment)}</dd></div>
            <div className="flex justify-between border-t border-asphalt-700/20 pt-2"><dt>Subtotal</dt><dd>{money(t.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Tax</dt><dd>{money(t.tax)}</dd></div>
            <div className="flex justify-between border-t-2 border-asphalt-900 pt-2 font-display text-3xl font-bold"><dt>Total</dt><dd>{money(t.total)}</dd></div>
          </dl>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {type === "estimate" ? (<>
          <button type="button" onClick={() => setPreview(true)} className="btn btn-ghost"><Eye size={16} /> Invoice preview</button>
          <button disabled={busy} onClick={() => save(false)} className="btn btn-ghost">Save draft</button>
          <button disabled={busy} onClick={() => save(true)} className="btn btn-primary">Publish to invoice</button>
        </>) : (
          <button disabled={busy} onClick={() => save(false)} className="btn btn-primary">Save invoice</button>
        )}
      </div>
    </div>

      {preview && (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-navy-deep/50 p-4 print:static print:bg-white print:p-0" onMouseDown={() => setPreview(false)}>
          <div className="mx-auto my-4 w-full max-w-3xl print:m-0" onMouseDown={(e) => e.stopPropagation()}>
            <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Invoice PDF preview. Nothing is saved.</p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-primary" onClick={() => downloadInvoicePdf({
                  number: invoiceNumber,
                  issued,
                  due: f.due_date ? dateFmt(f.due_date) : undefined,
                  companyName: co?.name || "Company name",
                  companyLines: companyAddressLines(co?.address ?? "", co?.phone),
                  email: co?.email || undefined,
                  logoUrl: co?.logo_url,
                  billTo: [f.client_name || "—", billTo, f.client_email, f.client_phone].filter(Boolean),
                  jobSite: site || "—",
                  services: items.map((item) => ({ label: item.service, qty: `${item.qty} ${item.unit}`, rate: money(item.rate), amount: money(item.qty * item.rate) })),
                  groups: ([["Labor", resources.labor], ["Teams", resources.teams], ["Equipment", resources.equipment]] as const)
                    .filter(([, rows]) => rows.length > 0)
                    .map(([title, rows]) => ({ title, rows: rows.map((row) => ({ label: row.name, qty: `${row.qty} ${row.unit}`, rate: money(row.rate), amount: money(row.qty * row.rate) })) })),
                  totals: [
                    { label: "Services", value: money(t.services) },
                    { label: "Labor", value: money(t.labor) },
                    { label: "Teams", value: money(t.teams) },
                    { label: "Equipment", value: money(t.equipment) },
                    { label: "Subtotal", value: money(t.subtotal) },
                    { label: `Tax (${f.tax_rate}%)`, value: money(t.tax) },
                    { label: "Total", value: money(t.total), strong: true },
                  ],
                  notes: f.notes,
                  terms: co?.payment_terms,
                })}><Download size={16} /> Download PDF</button>
                <button type="button" className="btn btn-ghost bg-white" onClick={() => { document.title = invoiceNumber ? `#${invoiceNumber}` : "Invoice"; setTimeout(() => window.print(), 50); }}><Printer size={16} /> Print</button>
                <button type="button" className="btn btn-ghost bg-white" onClick={() => setPreview(false)}>Close</button>
              </div>
            </div>
            <article className="panel print-sheet !p-6 sm:!p-10">
              <header className="grid items-start gap-6 border-b-4 border-stripe pb-6 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex min-w-0 items-center gap-4">
                  {co?.logo_url && <LogoImage src={co.logo_url} />}
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold leading-tight">{co?.name || "Company name"}</h2>
                    {(co?.address || co?.phone) && <p className="mt-1.5 text-sm leading-snug text-asphalt-700">{companyAddressLines(co.address ?? "", co.phone).map((line) => <span key={line} className="block">{line}</span>)}</p>}
                    {co?.email && <p className="mt-1 text-sm text-asphalt-500">{co.email}</p>}
                  </div>
                </div>
                <div className="sm:pl-6 sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stripe">Invoice</p>
                  <p className="mt-1 font-display text-xl font-bold tracking-tight">#{invoiceNumber || "—"}</p>
                  <p className="mt-2 whitespace-nowrap text-sm text-asphalt-500">Issued {issued}</p>
                  {f.due_date && <p className="whitespace-nowrap text-sm text-asphalt-500">Due {dateFmt(f.due_date)}</p>}
                </div>
              </header>
              <section className="grid gap-4 py-5 text-sm sm:grid-cols-2">
                <div>
                  <div className="font-semibold">Bill to</div>
                  {f.client_name || "—"}<br />
                  {billTo}<br />
                  {f.client_email}<br />
                  {f.client_phone}
                </div>
                <div><div className="font-semibold">Job site</div>{site || "—"}</div>
              </section>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead><tr className="border-b-2 border-asphalt-900"><th className="py-2">Service</th><th>Qty</th><th>Rate</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className="border-b border-asphalt-700/15">
                        <td className="py-2 pr-2">{i.service}</td><td>{i.qty} {i.unit}</td><td>{money(i.rate)}</td><td className="text-right">{money(i.qty * i.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {([["Labor", resources.labor], ["Teams", resources.teams], ["Equipment", resources.equipment]] as const).map(([label, rows]) => rows.length > 0 && (
                <div key={label} className="mt-4">
                  <div className="font-semibold">{label}</div>
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-asphalt-700/15">
                          <td className="py-2 pr-2">{r.name}</td><td>{r.qty} {r.unit}</td><td>{money(r.rate)}</td><td className="text-right">{money(r.qty * r.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <dl className="ml-auto mt-4 w-full max-w-xs space-y-1">
                <div className="flex justify-between"><dt>Services</dt><dd>{money(t.services)}</dd></div>
                <div className="flex justify-between"><dt>Labor</dt><dd>{money(t.labor)}</dd></div>
                <div className="flex justify-between"><dt>Teams</dt><dd>{money(t.teams)}</dd></div>
                <div className="flex justify-between"><dt>Equipment</dt><dd>{money(t.equipment)}</dd></div>
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(t.subtotal)}</dd></div>
                <div className="flex justify-between"><dt>Tax ({f.tax_rate}%)</dt><dd>{money(t.tax)}</dd></div>
                <div className="flex justify-between border-t-2 border-asphalt-900 pt-1 font-display text-3xl font-bold"><dt>Total</dt><dd>{money(t.total)}</dd></div>
              </dl>
              {(f.notes || co?.payment_terms) && (
                <footer className="mt-8 text-sm text-asphalt-700">
                  {f.notes && <p className="mb-2">{f.notes}</p>}
                  {co?.payment_terms && <p>{co.payment_terms}</p>}
                </footer>
              )}
            </article>
          </div>
        </div>
      )}
    </>
  );
}
