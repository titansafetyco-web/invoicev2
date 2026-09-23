import { jsPDF } from "jspdf";

export type PdfLine = { label: string; qty: string; rate: string; amount: string };

export type InvoicePdfInput = {
  number: string;
  issued: string;
  due?: string;
  companyName: string;
  companyLines: string[];
  email?: string;
  logoUrl?: string | null;
  billTo: string[];
  jobSite: string;
  services: PdfLine[];
  groups: { title: string; rows: PdfLine[] }[];
  totals: { label: string; value: string; strong?: boolean }[];
  notes?: string;
  terms?: string;
};

async function logoData(url: string) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const format = blob.type.includes("png") ? "PNG" : blob.type.includes("webp") ? "WEBP" : "JPEG";
  return { dataUrl, format: format as "PNG" | "JPEG" | "WEBP" };
}

export async function buildInvoicePdf(input: InvoicePdfInput) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const left = 48;
  const right = pageWidth - 48;
  let y = 48;

  function nextPage(needed = 24) {
    if (y + needed < pageHeight - 48) return;
    pdf.addPage();
    y = 48;
  }

  function text(value: string, x: number, size: number, style: "normal" | "bold" = "normal", align: "left" | "right" = "left") {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.text(value, x, y, { align });
  }

  if (input.logoUrl) {
    try {
      const logo = await logoData(input.logoUrl);
      if (logo) {
        pdf.addImage(logo.dataUrl, logo.format, left, y, 120, 36);
      }
    } catch {
      // A missing logo still leaves a usable invoice.
    }
  }

  pdf.setTextColor(200, 16, 46);
  text("INVOICE", right, 11, "bold", "right");
  y += 16;
  pdf.setTextColor(17, 17, 17);
  text(input.number ? `#${input.number}` : "—", right, 16, "bold", "right");
  y += 18;
  pdf.setTextColor(90, 90, 90);
  text(`Issued ${input.issued}`, right, 10, "normal", "right");
  if (input.due) {
    y += 14;
    text(`Due ${input.due}`, right, 10, "normal", "right");
  }

  y = Math.max(y, 92);
  pdf.setTextColor(17, 17, 17);
  text(input.companyName || "Company name", left, 16, "bold");
  y += 16;
  pdf.setTextColor(70, 70, 70);
  for (const line of input.companyLines) {
    text(line, left, 10);
    y += 13;
  }
  if (input.email) {
    text(input.email, left, 10);
    y += 13;
  }

  y += 8;
  pdf.setDrawColor(200, 16, 46);
  pdf.setLineWidth(3);
  pdf.line(left, y, right, y);
  y += 22;

  pdf.setTextColor(17, 17, 17);
  text("Bill to", left, 11, "bold");
  text("Job site", left + 250, 11, "bold");
  y += 14;
  pdf.setTextColor(50, 50, 50);
  const bill = input.billTo.filter(Boolean);
  const siteLines = pdf.splitTextToSize(input.jobSite || "—", 220) as string[];
  const rows = Math.max(bill.length, siteLines.length, 1);
  for (let i = 0; i < rows; i += 1) {
    nextPage(16);
    if (bill[i]) text(bill[i], left, 10);
    if (siteLines[i]) text(siteLines[i], left + 250, 10);
    y += 13;
  }

  function drawTable(lines: PdfLine[], title?: string) {
    if (!lines.length && !title) return;
    nextPage(36);
    y += 10;
    if (title) {
      pdf.setTextColor(17, 17, 17);
      text(title, left, 11, "bold");
      y += 16;
    }
    pdf.setTextColor(17, 17, 17);
    text("Service", left, 10, "bold");
    text("Qty", left + 280, 10, "bold");
    text("Rate", left + 370, 10, "bold");
    text("Amount", right, 10, "bold", "right");
    y += 6;
    pdf.setDrawColor(17, 17, 17);
    pdf.setLineWidth(1);
    pdf.line(left, y, right, y);
    y += 16;
    pdf.setTextColor(40, 40, 40);
    for (const line of lines) {
      nextPage(18);
      const label = pdf.splitTextToSize(line.label, 250) as string[];
      text(label[0] || "", left, 10);
      text(line.qty, left + 280, 10);
      text(line.rate, left + 370, 10);
      text(line.amount, right, 10, "normal", "right");
      y += 16;
    }
  }

  drawTable(input.services);
  for (const group of input.groups) drawTable(group.rows, group.title);

  y += 12;
  for (const row of input.totals) {
    nextPage(row.strong ? 28 : 16);
    if (row.strong) {
      pdf.setDrawColor(17, 17, 17);
      pdf.setLineWidth(1.5);
      pdf.line(right - 180, y - 12, right, y - 12);
      text(row.label, right - 180, 14, "bold");
      text(row.value, right, 14, "bold", "right");
      y += 22;
    } else {
      pdf.setTextColor(40, 40, 40);
      text(row.label, right - 180, 10);
      text(row.value, right, 10, "normal", "right");
      y += 14;
    }
  }

  const footer = [input.notes, input.terms].filter(Boolean).join("\n\n");
  if (footer) {
    y += 16;
    pdf.setTextColor(70, 70, 70);
    for (const line of pdf.splitTextToSize(footer, right - left) as string[]) {
      nextPage(14);
      text(line, left, 10);
      y += 13;
    }
  }

  return pdf;
}

export async function downloadInvoicePdf(input: InvoicePdfInput) {
  const pdf = await buildInvoicePdf(input);
  const name = input.number ? `Invoice-${input.number}.pdf` : "Invoice.pdf";
  pdf.save(name);
}
