const MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slab-dark text-navy" },
  converted: { label: "Invoiced", cls: "bg-navy text-white" },
  ready: { label: "Ready to send", cls: "bg-stripe text-white" },
  pending: { label: "Unpaid", cls: "bg-orange-100 text-orange-900" },
  paid: { label: "Paid", cls: "bg-green-100 text-green-900" },
};
export default function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? MAP.draft;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}
