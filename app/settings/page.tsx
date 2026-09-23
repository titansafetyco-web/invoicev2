"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LogoImage from "@/components/LogoImage";
import PriceBookSettings from "@/components/PriceBookSettings";
import { Company } from "@/lib/types";
import { companyAddressLines, formatPhone } from "@/lib/address";
import { money } from "@/lib/format";
import { NumericField } from "@/components/Fields";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const LOGO_NAMES = ["company-logo.png", "company-logo.jpg", "company-logo.jpeg", "company-logo.webp", "company-logo.svg"];

export default function Settings() {
  const [c, setC] = useState<Company | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => { supabase.from("company_settings").select("*").eq("id", 1).single().then(({ data }) => setC(data as Company)); }, []);
  if (!c) return <p className="text-asphalt-500">Loading…</p>;
  const set = (k: keyof Company, v: any) => { setSaved(false); setC({ ...c, [k]: v }); };

  async function save() {
    if (!c) return;
    const { logo_url: _logo, ...fields } = c;
    await supabase.from("company_settings").update(fields).eq("id", 1);
    setSaved(true);
  }

  async function onLogo(file: File | undefined) {
    if (!file || !c) return;
    setLogoError("");
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError("Use a PNG, JPG, WEBP, or SVG logo.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo must be 2 MB or smaller.");
      return;
    }
    setUploading(true);
    const ext = file.type === "image/svg+xml" ? "svg" : file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const path = `company-logo.${ext}`;
    await supabase.storage.from("branding").remove(LOGO_NAMES);
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploading(false);
      setLogoError(error.message);
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    const logo_url = `${data.publicUrl}?v=${Date.now()}`;
    const { error: saveError } = await supabase.from("company_settings").update({ logo_url }).eq("id", 1);
    setUploading(false);
    if (saveError) {
      setLogoError(saveError.message);
      return;
    }
    setC({ ...c, logo_url });
  }

  async function removeLogo() {
    if (!c) return;
    setLogoError("");
    setUploading(true);
    await supabase.storage.from("branding").remove(LOGO_NAMES);
    const { error } = await supabase.from("company_settings").update({ logo_url: null }).eq("id", 1);
    setUploading(false);
    if (error) {
      setLogoError(error.message);
      return;
    }
    setC({ ...c, logo_url: null });
  }

  return (
    <div className="space-y-5">
      <section className="panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Settings</h1>
            <p className="mt-1 text-asphalt-700">This information appears on every estimate and invoice you issue.</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setPreview(true)}>Invoice preview</button>
        </div>

        <div className="mt-6 grid gap-6 border-t border-asphalt-700/10 pt-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            {c.logo_url && <LogoImage src={c.logo_url} alt="Company logo" variant="settings" />}
            <div>
              <p className="text-sm font-semibold">Logo</p>
              <p className="mt-0.5 text-sm text-asphalt-500">Sits beside your company name.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className={`btn btn-dark cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                {uploading ? "Uploading…" : c.logo_url ? "Replace logo" : "Upload logo"}
                <input type="file" accept={LOGO_TYPES.join(",")} className="sr-only" onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {c.logo_url && <button type="button" className="btn btn-ghost" disabled={uploading} onClick={removeLogo}>Remove</button>}
            </div>
            {logoError && <p className="text-sm text-stripe">{logoError}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="company-name">Company name</label>
              <input id="company-name" className="field" value={c.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="company-address">Address</label>
              <input id="company-address" className="field" value={c.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="company-phone">Phone</label>
              <input id="company-phone" type="tel" inputMode="tel" placeholder="(555) 555-5555" className="field" value={c.phone} onChange={(e) => set("phone", formatPhone(e.target.value, c.phone))} />
            </div>
            <div>
              <label className="label" htmlFor="company-email">Email</label>
              <input id="company-email" type="email" inputMode="email" className="field" value={c.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="tax-rate">Tax rate</label>
              <div className="relative max-w-[10rem]">
                <NumericField id="tax-rate" className="field pr-8" value={c.tax_rate} onValue={(tax_rate) => set("tax_rate", tax_rate)} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-asphalt-500">%</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="payment-terms">Payment terms</label>
              <textarea id="payment-terms" rows={2} className="field" value={c.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-asphalt-700/10 pt-4">
          {saved && <span className="text-sm font-medium text-green-700">Saved</span>}
          <button onClick={save} className="btn btn-primary">Save changes</button>
        </div>
      </section>
      {preview && (
        <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-navy-deep/50 p-4" onMouseDown={() => setPreview(false)}>
          <div className="panel my-4 w-full max-w-3xl !p-6 sm:!p-10" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-asphalt-500">How this logo and company information look on an invoice.</p>
              <button type="button" className="btn btn-ghost" onClick={() => setPreview(false)}>Close</button>
            </div>
            <header className="grid items-start gap-6 border-b-4 border-stripe pb-6 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex min-w-0 items-center gap-4">
                {c.logo_url && <LogoImage src={c.logo_url} />}
                <div className="min-w-0">
                  <h3 className="text-2xl font-bold leading-tight">{c.name || "Company name"}</h3>
                  {(c.address || c.phone) && <p className="mt-1.5 text-sm leading-snug text-asphalt-700">{companyAddressLines(c.address, c.phone).map((line) => <span key={line} className="block">{line}</span>)}</p>}
                  {c.email && <p className="mt-1 text-sm text-asphalt-500">{c.email}</p>}
                </div>
              </div>
              <div className="sm:pl-6 sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stripe">Invoice</p>
                <p className="mt-1 font-display text-xl font-bold tracking-tight">INV-PREVIEW</p>
                <p className="mt-2 whitespace-nowrap text-sm text-asphalt-500">Issued {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            </header>
            <section className="grid gap-4 py-5 text-sm sm:grid-cols-2">
              <div><div className="font-semibold">Bill to</div>Sample client<br />123 Main St, West Palm Beach, FL 33401</div>
              <div><div className="font-semibold">Job site</div>123 Main St, West Palm Beach, FL 33401</div>
            </section>
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b-2 border-asphalt-900"><th className="py-2">Service</th><th>Qty</th><th>Rate</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                <tr className="border-b border-asphalt-700/15"><td className="py-2">Asphalt overlay</td><td>1,000 sq ft</td><td>{money(2.75)}</td><td className="text-right">{money(2750)}</td></tr>
              </tbody>
            </table>
            <dl className="ml-auto mt-4 w-full max-w-xs space-y-1">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(2750)}</dd></div>
              <div className="flex justify-between"><dt>Tax ({c.tax_rate}%)</dt><dd>{money(2750 * (Number(c.tax_rate) || 0) / 100)}</dd></div>
              <div className="flex justify-between border-t-2 border-asphalt-900 pt-1 font-display text-3xl font-bold"><dt>Total</dt><dd>{money(2750 * (1 + (Number(c.tax_rate) || 0) / 100))}</dd></div>
            </dl>
            {c.payment_terms && <p className="mt-8 text-sm text-asphalt-700">{c.payment_terms}</p>}
          </div>
        </div>
      )}
      <PriceBookSettings />
    </div>
  );
}
