import DocList from "@/components/DocList";
export default function Page() {
  return <DocList title="Drafts" type="estimate" statuses={["draft"]} create="estimate" empty="No draft estimates. Save an estimate as a draft and it will show up here." />;
}
