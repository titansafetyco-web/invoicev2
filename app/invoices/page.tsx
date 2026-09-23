import DocList from "@/components/DocList";
export default function Page() {
  return <DocList title="Invoices" type="invoice" create="invoice" empty="No invoices yet. Publish an estimate or create an invoice." />;
}
