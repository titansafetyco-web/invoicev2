const START = 1001;

export function nextInvoiceNumber(used: string[]) {
  let max = START - 1;
  for (const raw of used) {
    const match = String(raw ?? "").trim().match(/^#?(\d+)$/);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }
  return String(max + 1);
}

export function invoiceDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}
