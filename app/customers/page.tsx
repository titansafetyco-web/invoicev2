"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { dateFmt } from "@/lib/format";
import { Address, EMPTY_ADDRESS, formatAddress, formatPhone } from "@/lib/address";
import { AddressFields } from "@/components/Fields";

type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  estimates: number;
  invoices: number;
  last: string;
};

const blank = () => ({ name: "", email: "", phone: "", address: { ...EMPTY_ADDRESS } });

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    Promise.all([
      supabase.from("customers").select("name,email,phone,address,created_at").order("name"),
      supabase.from("documents").select("client_name,client_email,client_phone,client_address,type,created_at").order("created_at", { ascending: false }),
    ]).then(([saved, docs]) => {
      const grouped = new Map<string, Customer>();
      for (const c of saved.data ?? []) {
        const name = (c.name || "").trim();
        if (!name) continue;
        const email = (c.email || "").trim();
        grouped.set(`${name.toLowerCase()}|${email.toLowerCase()}`, {
          name, email, phone: c.phone || "", address: c.address || "",
          estimates: 0, invoices: 0, last: c.created_at,
        });
      }
      for (const d of docs.data ?? []) {
        const name = (d.client_name || "").trim();
        if (!name) continue;
        const email = (d.client_email || "").trim();
        const key = `${name.toLowerCase()}|${email.toLowerCase()}`;
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, {
            name, email, phone: d.client_phone || "", address: d.client_address || "",
            estimates: d.type === "estimate" ? 1 : 0, invoices: d.type === "invoice" ? 1 : 0, last: d.created_at,
          });
        } else {
          if (d.type === "estimate") existing.estimates += 1;
          if (d.type === "invoice") existing.invoices += 1;
          if (!existing.phone && d.client_phone) existing.phone = d.client_phone;
          if (!existing.address && d.client_address) existing.address = d.client_address;
          if (d.created_at > existing.last) existing.last = d.created_at;
        }
      }
      setRows([...grouped.values()].sort((a, b) => a.name.localeCompare(b.name)));
    });
  }

  useEffect(() => { load(); }, []);

  async function addCustomer() {
    const name = draft.name.trim();
    if (!name) { setError("Add a customer name."); return; }
    setBusy(true);
    setError("");
    const { error: saveError } = await supabase.from("customers").insert({
      name,
      email: draft.email.trim(),
      phone: formatPhone(draft.phone),
      address: formatAddress(draft.address),
    });
    setBusy(false);
    if (saveError) { setError(saveError.message); return; }
    setOpen(false);
    setDraft(blank());
    load();
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold">Customers</h1>
          <p className="text-asphalt-700">Clients from your estimates and invoices.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => { setError(""); setDraft(blank()); setOpen(true); }}><Plus size={16} /> Add customer</button>
      </div>
      {rows === null ? <p className="text-asphalt-500">Loading…</p> : rows.length === 0 ? (
        <div className="panel text-asphalt-500">No customers yet. Add one, or save an estimate and the client shows up here.</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((c) => (
            <li key={`${c.name}|${c.email}`} className="panel">
              <div className="font-display text-xl font-bold">{c.name}</div>
              <div className="text-asphalt-700">{c.email || "No email"}</div>
              {c.address && <div className="mt-1 text-sm text-asphalt-500">{c.address}</div>}
              <div className="mt-2 flex items-end justify-between gap-3 text-sm text-asphalt-500">
                <span>{c.phone ? formatPhone(c.phone) : "No phone"}</span>
                <span className="text-right">
                  {c.estimates} estimate{c.estimates === 1 ? "" : "s"} · {c.invoices} invoice{c.invoices === 1 ? "" : "s"}
                  <br />Last {dateFmt(c.last)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-navy-deep/50 p-4" onMouseDown={() => { if (!busy) setOpen(false); }}>
          <form className="panel my-4 w-full max-w-lg space-y-4" onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); addCustomer(); }}>
            <h2 className="text-2xl font-bold">Add customer</h2>
            <div>
              <label className="label" htmlFor="customer-name">Name</label>
              <input id="customer-name" className="field" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="customer-email">Email</label>
                <input id="customer-email" type="email" inputMode="email" className="field" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="customer-phone">Phone</label>
                <input id="customer-phone" type="tel" inputMode="tel" placeholder="(555) 555-5555" className="field" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: formatPhone(e.target.value, draft.phone) })} />
              </div>
            </div>
            <AddressFields idPrefix="customer" value={draft.address} onChange={(address: Address) => setDraft({ ...draft, address })} />
            {error && <p className="text-sm text-stripe">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Add customer"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
