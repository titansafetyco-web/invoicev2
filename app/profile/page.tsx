"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatPhone } from "@/lib/address";

type Profile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id;
      if (!id) return;
      const { data: member } = await supabase.from("members").select("full_name,email,phone,role").eq("id", id).maybeSingle();
      setProfile(member ?? { full_name: null, email: data.session?.user.email ?? null, phone: null, role: "Member" });
    });
  }, []);

  if (!profile) return <p className="text-asphalt-500">Loading…</p>;

  const name = profile.full_name || "Unnamed";
  return (
    <section className="max-w-xl">
      <h1 className="mb-5 text-4xl font-bold">Profile</h1>
      <div className="panel flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-navy text-xl font-bold text-white">{name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0">
          <div className="font-display text-2xl font-bold">{name}</div>
          <div className="text-asphalt-500">{profile.role || "Member"}</div>
        </div>
      </div>
      <dl className="panel mt-3 space-y-3">
        <div><dt className="text-sm text-asphalt-500">Email</dt><dd>{profile.email || "—"}</dd></div>
        <div><dt className="text-sm text-asphalt-500">Phone</dt><dd>{profile.phone ? formatPhone(profile.phone) : "—"}</dd></div>
        <div><dt className="text-sm text-asphalt-500">Role</dt><dd>{profile.role || "Member"}</dd></div>
      </dl>
    </section>
  );
}
