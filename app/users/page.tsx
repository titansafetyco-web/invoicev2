"use client";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { dateFmt } from "@/lib/format";
import { formatPhone } from "@/lib/address";

const ROLES = ["Admin", "Manager", "Estimator", "Office", "Crew", "Member"] as const;

type Member = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
};

type Draft = {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  emailPending?: boolean;
};

const EMPTY: Draft = { full_name: "", email: "", phone: "", password: "", role: "Estimator" };

export default function UsersPage() {
  const [rows, setRows] = useState<Member[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: session }, { data }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.from("members").select("id,email,full_name,phone,role,created_at").order("full_name", { ascending: true }),
    ]);
    setMe(session.session?.user.id ?? null);
    setRows((data as Member[]) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isAdmin = rows?.some((row) => row.id === me && row.role === "Admin") ?? false;
  const groups = ROLES.map((role) => ({ role, people: (rows ?? []).filter((row) => (row.role || "Member") === role) })).filter((group) => group.people.length > 0);

  async function emailSignIn(person: Draft) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return "Sign in again, then retry.";
    const res = await fetch("/api/send-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email: person.email.trim(),
        password: person.password,
        full_name: person.full_name.trim(),
        role: person.role,
      }),
    });
    const body = await res.json().catch(() => ({}));
    return res.ok ? "" : body.error || "The sign-in email could not be sent.";
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    const args = {
      p_full_name: draft.full_name,
      p_email: draft.email,
      p_phone: draft.phone,
      p_password: draft.password,
      p_role: draft.role,
    };
    const shouldEmail = !draft.id || draft.emailPending;
    if (shouldEmail && draft.password.length < 8) {
      setBusy(false);
      setError("Password must be at least 8 characters.");
      return;
    }
    const result = draft.id
      ? await supabase.rpc("admin_update_member", { p_id: draft.id, ...args })
      : await supabase.rpc("admin_create_member", args);
    if (result.error) {
      setBusy(false);
      setError(result.error.message);
      return;
    }
    const id = draft.id || (result.data as string);
    if (shouldEmail) {
      const emailError = await emailSignIn({ ...draft, id });
      if (emailError) {
        setBusy(false);
        setDraft({ ...draft, id, emailPending: true });
        setError(`${draft.full_name.trim() || "This user"} was added, but the sign-in email did not send. ${emailError}`);
        load();
        return;
      }
    }
    setBusy(false);
    setDraft(null);
    load();
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    setError("");
    const { error: removeError } = await supabase.rpc("admin_delete_member", { p_id: removing.id });
    setBusy(false);
    if (removeError) {
      setError(removeError.message);
      return;
    }
    setRemoving(null);
    load();
  }

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold">Users</h1>
          <p className="text-asphalt-700">People who can sign in, grouped by role.</p>
        </div>
        {isAdmin && <button type="button" onClick={() => { setError(""); setDraft({ ...EMPTY }); }} className="btn btn-primary"><Plus size={18} /> Add user</button>}
      </div>
      {error && !draft && !removing && <p className="mb-4 text-sm text-stripe">{error}</p>}

      {rows === null ? <p className="text-asphalt-500">Loading…</p> : rows.length === 0 ? (
        <div className="panel text-asphalt-500">No users yet.</div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.role}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-2xl font-bold">{group.role}</h2>
                <span className="text-sm text-asphalt-500">{group.people.length}</span>
              </div>
              <ul className="grid gap-3 md:grid-cols-2">
                {group.people.map((member) => (
                  <li key={member.id} className="panel">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display text-xl font-bold">{member.full_name || "Unnamed"}</div>
                        <div className="truncate text-asphalt-700">{member.email || "No email"}</div>
                      </div>
                      {isAdmin && (
                        <div className="flex shrink-0">
                          <button type="button" aria-label={`Edit ${member.full_name || "user"}`} onClick={() => {
                            setError("");
                            setDraft({
                              id: member.id,
                              full_name: member.full_name || "",
                              email: member.email || "",
                              phone: member.phone ? formatPhone(member.phone) : "",
                              password: "",
                              role: member.role || "Member",
                            });
                          }} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-asphalt-700 hover:bg-asphalt-900/10"><Pencil size={16} /></button>
                          {member.id !== me && (
                            <button type="button" aria-label={`Delete ${member.full_name || "user"}`} onClick={() => { setError(""); setRemoving(member); }} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-asphalt-700 hover:bg-asphalt-900/10"><Trash2 size={16} /></button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-end justify-between text-sm text-asphalt-500">
                      <span>{member.phone ? formatPhone(member.phone) : "No phone"}</span>
                      <span>Joined {dateFmt(member.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-navy-deep/50 p-4" onMouseDown={() => { if (!busy) setDraft(null); }}>
          <form className="panel w-full max-w-md space-y-4" onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save(); }}>
            <h2 className="text-2xl font-bold">{draft.id ? "Edit user" : "Add user"}</h2>
            <p className="text-sm text-asphalt-500">{draft.id && !draft.emailPending ? "Update this person’s details and role." : "Their email and password are sent to this address when the account is created."}</p>
            <div><label className="label" htmlFor="user-name">Name</label><input id="user-name" className="field" value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} /></div>
            <div><label className="label" htmlFor="user-email">Email</label><input id="user-email" type="email" className="field" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
            <div><label className="label" htmlFor="user-phone">Phone</label><input id="user-phone" type="tel" inputMode="tel" placeholder="(555) 555-5555" className="field" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: formatPhone(e.target.value, draft.phone) })} /></div>
            <div>
              <label className="label" htmlFor="user-password">{draft.id ? "New password" : "Password"}</label>
              <input id="user-password" type="password" autoComplete="new-password" className="field" placeholder={draft.id ? "Leave blank to keep the current password" : "At least 8 characters"} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="user-role">Role</label>
              <select id="user-role" className="field" value={draft.role} disabled={draft.id === me} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-stripe">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : draft.emailPending ? "Email sign-in" : draft.id ? "Save" : "Add user"}</button>
            </div>
          </form>
        </div>
      )}

      {removing && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-navy-deep/50 p-4" onMouseDown={() => { if (!busy) setRemoving(null); }}>
          <div className="panel w-full max-w-md space-y-4" onMouseDown={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold">Delete {removing.full_name || "user"}?</h2>
            <p className="text-sm text-asphalt-500">They will no longer be able to sign in.</p>
            {error && <p className="text-sm text-stripe">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRemoving(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={confirmRemove}>{busy ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
