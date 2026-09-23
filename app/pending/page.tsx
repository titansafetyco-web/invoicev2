import DocList from "@/components/DocList";
export default function Page() {
  return <DocList title="Pending" type="invoice" statuses={["pending"]} markPaid empty="Nothing unpaid. Sent invoices show up here until you mark them paid." />;
}
