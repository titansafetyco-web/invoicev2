"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Builder from "@/components/Builder";
import { supabase } from "@/lib/supabase";
import { Doc } from "@/lib/types";

function Inner() {
  const sp = useSearchParams();
  const id = sp.get("id");
  const [doc, setDoc] = useState<Doc | undefined>();
  const [loading, setLoading] = useState(!!id);
  useEffect(() => {
    if (!id) return;
    supabase.from("documents").select("*").eq("id", id).single().then(({ data }) => { setDoc(data as Doc); setLoading(false); });
  }, [id]);
  if (loading) return <p className="text-asphalt-500">Loading…</p>;
  const type = (doc?.type ?? (sp.get("type") === "invoice" ? "invoice" : "estimate")) as "estimate" | "invoice";
  return <Builder type={type} doc={doc} />;
}
export default function Page() { return <Suspense><Inner /></Suspense>; }
