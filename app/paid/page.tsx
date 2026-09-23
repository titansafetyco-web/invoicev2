import DocList from "@/components/DocList";
export default function Page() {
  return <DocList title="Paid" type="invoice" statuses={["paid"]} empty="No paid invoices yet." />;
}
