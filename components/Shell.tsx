"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, Receipt, Clock, CheckCircle2, Contact, Users, Settings, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/estimates", label: "Estimates", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/pending", label: "Pending", icon: Clock },
  { href: "/paid", label: "Paid", icon: CheckCircle2 },
  { href: "/customers", label: "Customers", icon: Contact },
  { href: "/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

type Profile = { name: string; role: string };

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function load(session: { user: { id: string; email?: string; user_metadata?: { name?: string; full_name?: string } } } | null) {
      if (!session) {
        setProfile(null);
        if (path !== "/login") router.replace("/login");
        return;
      }
      const { data: member } = await supabase.from("members").select("full_name,role").eq("id", session.user.id).maybeSingle();
      const name = member?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User";
      setProfile({ name, role: member?.role || "Member" });
    }
    supabase.auth.getSession().then(async ({ data }) => {
      await load(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { load(s); });
    return () => sub.subscription.unsubscribe();
  }, [path, router]);

  if (path === "/login") return <>{children}</>;
  if (!ready) return null;

  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop / iPad-landscape sidebar */}
      <aside className="no-print hidden md:flex md:w-44 md:flex-col md:sticky md:top-0 md:h-screen bg-[linear-gradient(180deg,#163f86_0%,#0d2d64_100%)] text-white px-2 py-4">
        <div className="mb-6 border-l-4 border-stripe pl-2">
          <div className="font-display text-2xl leading-none">All American</div>
          <div className="mt-1 text-sm text-white/60">Asphalt · Billing</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-2 rounded-md px-2 py-2.5 text-base font-medium ${active(href) ? "bg-stripe text-white" : "text-white/80 hover:bg-white/10"}`}>
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/15 pt-3">
          <Link href="/profile"
            className={`flex items-center gap-2 rounded-md px-2 py-2 ${active("/profile") ? "bg-stripe text-white" : "hover:bg-white/10"}`}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-bold">{(profile?.name || "?").slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">{profile?.name || "…"}</span>
              <span className={`block truncate text-xs ${active("/profile") ? "text-white/80" : "text-white/60"}`}>{profile?.role || ""}</span>
            </span>
          </Link>
          <button onClick={() => supabase.auth.signOut()} className="flex w-full items-center gap-2 px-2 py-2 text-sm text-white/60 hover:text-white">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 max-w-6xl w-full mx-auto">{children}</main>

      {/* Phone bottom tab bar */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-20 grid grid-cols-8 bg-navy-deep text-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active(href) ? "text-stripe" : "text-white/70"}`}>
            <Icon size={20} /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
