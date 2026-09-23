export type Address = { street: string; city: string; state: string; zip: string };

export const EMPTY_ADDRESS: Address = { street: "", city: "", state: "", zip: "" };

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
  "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY",
];

const SUITE = /^(.*?)(?:,\s*|\s+)((?:suite|ste\.?|unit|apt\.?|apartment|floor|#)\s*.+)$/i;

export function addressDisplayLines(raw: string): string[] {
  const a = parseAddress(raw);
  const cityLine = [a.city, [a.state, a.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const suite = a.street.match(SUITE);
  const streetLines = suite ? [suite[1].replace(/,\s*$/, "").trim(), suite[2].trim()] : [a.street];
  return [...streetLines, cityLine].map((line) => line.trim()).filter(Boolean);
}

export function companyAddressLines(address: string, phone?: string | null): string[] {
  const lines = addressDisplayLines(address);
  const formatted = phone ? formatPhone(phone) : "";
  if (!formatted) return lines;
  if (!lines.length) return [formatted];
  const next = [...lines];
  next[next.length - 1] = `${next[next.length - 1]} · ${formatted}`;
  return next;
}

export function formatAddress(a: Address) {
  const cityLine = [a.city.trim(), [a.state.trim(), a.zip.trim()].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [a.street.trim(), cityLine].filter(Boolean).join(", ");
}

export function parseAddress(raw: string): Address {
  const text = raw.trim();
  if (!text) return { ...EMPTY_ADDRESS };
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1].match(/^([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/);
    if (tail && parts.length >= 3) {
      return {
        street: parts.slice(0, -2).join(", "),
        city: parts[parts.length - 2],
        state: tail[1].toUpperCase(),
        zip: tail[2] ?? "",
      };
    }
    const cityState = parts[parts.length - 1].match(/^(.+?)\s+([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/);
    if (cityState) {
      return {
        street: parts.slice(0, -1).join(", "),
        city: cityState[1],
        state: cityState[2].toUpperCase(),
        zip: cityState[3] ?? "",
      };
    }
  }
  return { ...EMPTY_ADDRESS, street: text };
}

export function formatZip(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatPhone(input: string, previous = "") {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  const prevDigits = previous.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  if (input.length < previous.length && digits === prevDigits && digits.length > 0) digits = digits.slice(0, -1);
  if (!digits) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
