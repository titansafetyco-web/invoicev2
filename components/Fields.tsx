"use client";
import { useState } from "react";
import { Address, US_STATES, formatZip } from "@/lib/address";

export function NumericField({
  value,
  onValue,
  min = 0,
  className = "field",
  id,
  money = false,
}: {
  value: number;
  onValue: (n: number) => void;
  min?: number;
  className?: string;
  id?: string;
  money?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (Number.isFinite(value) ? (money ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value)) : "");

  return (
    <input
      id={id}
      inputMode="decimal"
      className={className}
      value={shown}
      onFocus={(e) => {
        const el = e.currentTarget;
        setDraft(money ? value.toFixed(2) : String(value));
        requestAnimationFrame(() => el.select());
      }}
      onMouseUp={(e) => e.preventDefault()}
      onClick={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
        setDraft(cleaned);
        if (cleaned === "" || cleaned === ".") return;
        const n = Number(cleaned);
        if (!Number.isNaN(n)) onValue(Math.max(min, n));
      }}
      onBlur={() => {
        if (draft === "" || draft === "." || draft == null) onValue(min);
        setDraft(null);
      }}
    />
  );
}

export function AddressFields({
  value,
  onChange,
  disabled = false,
  idPrefix,
}: {
  value: Address;
  onChange: (next: Address) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const set = (key: keyof Address, next: string) => onChange({ ...value, [key]: next });
  return (
    <div className={`space-y-3 ${disabled ? "opacity-60" : ""}`}>
      <div>
        <label className="label" htmlFor={`${idPrefix}-street`}>Street address</label>
        <input id={`${idPrefix}-street`} className="field" autoComplete="street-address" disabled={disabled} value={value.street} onChange={(e) => set("street", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_8.75rem_7.25rem]">
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor={`${idPrefix}-city`}>City</label>
          <input id={`${idPrefix}-city`} className="field" autoComplete="address-level2" disabled={disabled} value={value.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-state`}>State</label>
          <select id={`${idPrefix}-state`} className="field" autoComplete="address-level1" disabled={disabled} value={value.state} onChange={(e) => set("state", e.target.value)}>
            <option value="">State</option>
            {US_STATES.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-zip`}>ZIP</label>
          <input id={`${idPrefix}-zip`} className="field" inputMode="numeric" autoComplete="postal-code" disabled={disabled} value={value.zip} onChange={(e) => set("zip", formatZip(e.target.value))} />
        </div>
      </div>
    </div>
  );
}
