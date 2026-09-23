"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Mail, Download, Printer, Send, CheckCircle2, Pencil, ArrowRightCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Doc, Company } from "@/lib/types";
import { money, totals, dateFmt } from "@/lib/format";
import { companyAddressLines } from "@/lib/address";
import { invoiceDigits, nextInvoiceNumber } from "@/lib/invoiceNumber";
import { normalizeResources } from "@/lib/resources";
import StatusBadge from "@/components/StatusBadge";
import LogoImage from "@/components/LogoImage";

export default function DocPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [co, setCo] = useState<Company | null>(null);

  const load = async () => {
    const [d, c] = await Promise.all([
      supabase.from("documents").select("*").eq("id", id).single(),
      supabase.from("company_settings").select("*").eq("id", 1).single(),
    ]);
    setDoc(d.data as Doc); setCo(c.data as Company);
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (!doc || !co) return <p className="text-asphalt-500">Loading…</p>;
  const resources = normalizeResources(doc.resources);
  const t = totals(doc.line_items, doc.tax_rate, resources);
  const isInvoice = doc.type === "invoice";

  // Any delivery action (email / PDF / print / process) moves a ready invoice to Pending.
  async function dispatch(kind: "email" | "pdf" | "print" | "process") {
    if (kind === "email") {
      const subj = encodeURIComponent(`${doc!.type === "invoice" ? "Invoice" : "Estimate"} ${doc!.number} from ${co!.name}`);
      const body = encodeURIComponent(`Hi ${doc!.client_name},\n\nYour ${doc!.type} ${doc!.number} for ${money(t.total)} is ready.\n\n${co!.payment_terms}\n\nThank you,\n${co!.name}\n${co!.phone}`);
      window.location.href = `mailto:${doc!.client_email}?subject=${subj}&body=${body}`;
    }
    if (kind === "pdf" || kind === "print") { document.title = doc!.number; setTimeout(() => window.print(), 50); } // "Save as PDF" in the print dialog
    if (isInvoice && doc!.status === "ready") {
      await supabase.from("documents").update({ status: "pending", sent_at: new Date().toISOString() }).eq("id", doc!.id);
      load();
    }
  }
  async function markPaid() {
    await supabase.from("documents").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", doc!.id);
    load();
  }
  async function publish() {
    const { id: _i, created_at, invoice_number, ...rest } = doc as any;
    const { data: taken } = await supabase.from("documents").select("id, type, status, number, invoice_number");
    const used = (taken ?? []).flatMap((row) => {
      if (row.id === doc!.id) return [];
      if (row.type === "invoice" && /^\d+$/.test(row.number)) return [row.number];
      if (row.type === "estimate" && row.status === "draft" && row.invoice_number && /^\d+$/.test(row.invoice_number)) return [row.invoice_number];
      return [];
    });
    const wanted = invoiceDigits(invoice_number ?? "");
    const num = wanted && !used.includes(wanted) ? wanted : nextInvoiceNumber(used);
    const { data } = await supabase.from("documents").insert({ ...rest, number: num, invoice_number: num, type: "invoice", status: "ready", source_estimate_id: doc!.id, sent_at: null, paid_at: null }).select().single();
    await supabase.from("documents").update({ status: "converted" }).eq("id", doc!.id);
    if (data) router.push(`/doc/${data.id}`);
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-3">
        <StatusBadge status={doc.status} />
        <div className="ml-auto grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          {doc.status === "draft" && <Link href={`/new?id=${doc.id}`} className="btn btn-ghost"><Pencil size={16} /> Edit</Link>}
          {doc.status === "draft" && <button onClick={publish} className="btn btn-primary"><ArrowRightCircle size={16} /> Publish to invoice</button>}
          {(isInvoice && doc.status !== "paid") || doc.type === "estimate" ? (<>
            {isInvoice && doc.status === "ready" && <Link href={`/new?id=${doc.id}`} className="btn btn-ghost"><Pencil size={16} /> Edit</Link>}
            <button onClick={() => dispatch("email")} className="btn btn-ghost"><Mail size={16} /> Email</button>
            <button onClick={() => dispatch("pdf")} className="btn btn-ghost"><Download size={16} /> Download PDF</button>
            <button onClick={() => dispatch("print")} className="btn btn-ghost"><Printer size={16} /> Print</button>
            {isInvoice && doc.status === "ready" && <button onClick={() => dispatch("process")} className="btn btn-dark"><Send size={16} /> Process</button>}
          </>) : null}
          {isInvoice && doc.status === "pending" && <button onClick={markPaid} className="btn btn-primary"><CheckCircle2 size={16} /> Mark as paid</button>}
          {doc.status === "paid" && <button onClick={() => dispatch("pdf")} className="btn btn-ghost"><Download size={16} /> Receipt PDF</button>}
        </div>
      </div>

      <article className="panel print-sheet !p-6 sm:!p-10">
        <header className="grid items-start gap-6 border-b-4 border-stripe pb-6 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 items-center gap-4">
            {co.logo_url && <LogoImage src={co.logo_url} />}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight">{co.name}</h1>
              {(co.address || co.phone) && <p className="mt-1.5 text-sm leading-snug text-asphalt-700">{companyAddressLines(co.address, co.phone).map((line) => <span key={line} className="block">{line}</span>)}</p>}
              {co.email && <p className="mt-1 text-sm text-asphalt-500">{co.email}</p>}
            </div>
          </div>
          <div className="sm:pl-6 sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stripe">{doc.type}</p>
            <p className="mt-1 font-display text-xl font-bold tracking-tight">{doc.number}</p>
            <p className="mt-2 whitespace-nowrap text-sm text-asphalt-500">Issued {dateFmt(doc.created_at)}</p>
            {doc.due_date && <p className="whitespace-nowrap text-sm text-asphalt-500">Due {dateFmt(doc.due_date)}</p>}
            {doc.status === "paid" && <p className="mt-2 text-sm font-bold text-green-700">Paid {dateFmt(doc.paid_at)}</p>}
          </div>
        </header>

        <section className="grid gap-4 py-5 sm:grid-cols-2 text-sm">
          <div><div className="font-semibold">Bill to</div>{doc.client_name}<br />{doc.client_address}<br />{doc.client_email}<br />{doc.client_phone}</div>
          <div><div className="font-semibold">Job site</div>{doc.job_address || "—"}</div>
        </section>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead><tr className="border-b-2 border-asphalt-900"><th className="py-2">Service</th><th>Qty</th><th>Rate</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {doc.line_items.map((i) => (
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
          <div className="flex justify-between"><dt>Tax ({doc.tax_rate}%)</dt><dd>{money(t.tax)}</dd></div>
          <div className="flex justify-between border-t-2 border-asphalt-900 pt-1 font-display text-3xl font-bold"><dt>Total</dt><dd>{money(t.total)}</dd></div>
        </dl>

        {(doc.notes || isInvoice) && <footer className="mt-8 text-sm text-asphalt-700">{doc.notes && <p className="mb-2">{doc.notes}</p>}{isInvoice && <p>{co.payment_terms}</p>}</footer>}
      </article>
    </div>
  );
}
