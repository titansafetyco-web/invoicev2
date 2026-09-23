"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { REMEMBER_KEY, REMEMBER_USER_KEY, supabase } from "@/lib/supabase";

type Mode = "sign-in" | "forgot" | "sent" | "recover";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_USER_KEY);
    if (saved) { setUser(saved); setRemember(true); }
    if (window.location.hash.includes("type=recovery")) setMode("recover");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("recover");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function accountEmail(value: string) {
    const name = value.trim();
    if (name.toLowerCase() === "admin") return "admin@allamericanasphaltpaving.com";
    return name;
  }

  async function go() {
    setBusy(true);
    setErr("");
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    if (remember) localStorage.setItem(REMEMBER_USER_KEY, user.trim());
    else localStorage.removeItem(REMEMBER_USER_KEY);
    const { error } = await supabase.auth.signInWithPassword({ email: accountEmail(user), password });
    setBusy(false);
    if (error) setErr(error.message);
    else router.replace("/");
  }

  async function sendReset() {
    const address = email.trim();
    if (!address.includes("@")) { setErr("Enter the email address from the user account."); return; }
    setBusy(true);
    setErr("");
    const { data: allowed, error: lookupError } = await supabase.rpc("member_can_reset", { p_email: address });
    if (lookupError) { setBusy(false); setErr(lookupError.message); return; }
    if (!allowed) { setBusy(false); setErr("That email is not a created user. Use the email saved on the user account."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/login` });
    setBusy(false);
    if (error) setErr(error.message);
    else setMode("sent");
  }

  async function savePassword() {
    if (nextPassword.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (nextPassword !== confirm) { setErr("Those passwords do not match."); return; }
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    setBusy(false);
    if (error) setErr(error.message);
    else router.replace("/");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#6ea2e8_0%,#4b7ec8_100%)] p-4">
      <div className="panel w-full max-w-sm overflow-hidden border-x-0 border-b-0 border-t-8 border-t-stripe p-0">
        <div className="bg-[linear-gradient(180deg,#163f86_0%,#0d2d64_100%)] px-5 pb-4 pt-5">
          <img src="/logo.png" alt="All American Asphalt" className="mx-auto w-full" />
        </div>
        <div className="space-y-4 p-5">
          {mode === "sign-in" && (
            <>
              <h1 className="text-3xl font-bold">Sign in</h1>
              <div>
                <label className="label" htmlFor="user">User</label>
                <input id="user" className="field" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <input id="password" type={show ? "text" : "password"} autoComplete="current-password" className="field pr-12" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-asphalt-700" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className="h-4 w-4 accent-navy" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Remember me
                </label>
                <button type="button" className="text-sm font-medium text-navy underline" onClick={() => { setErr(""); setMode("forgot"); }}>Forgot password?</button>
              </div>
              {err && <p className="text-sm text-red-700">{err}</p>}
              <button onClick={go} disabled={busy} className="btn btn-primary w-full">{busy ? "Signing in…" : "Sign in"}</button>
            </>
          )}

          {mode === "forgot" && (
            <>
              <h1 className="text-3xl font-bold">Reset password</h1>
              <p className="text-sm text-asphalt-700">Enter the email address saved on the user account. Supabase will send a link to choose a new password.</p>
              <div>
                <label className="label" htmlFor="reset-email">Email</label>
                <input id="reset-email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReset()} />
              </div>
              {err && <p className="text-sm text-red-700">{err}</p>}
              <button onClick={sendReset} disabled={busy} className="btn btn-primary w-full">{busy ? "Sending…" : "Send reset link"}</button>
              <button type="button" className="btn btn-ghost w-full" onClick={() => { setErr(""); setMode("sign-in"); }}>Back to sign in</button>
            </>
          )}

          {mode === "sent" && (
            <>
              <h1 className="text-3xl font-bold">Check your email</h1>
              <p className="text-sm text-asphalt-700">A reset link was sent to {email.trim()}. Open it on this device to choose a new password.</p>
              <button type="button" className="btn btn-ghost w-full" onClick={() => { setErr(""); setMode("sign-in"); }}>Back to sign in</button>
            </>
          )}

          {mode === "recover" && (
            <>
              <h1 className="text-3xl font-bold">New password</h1>
              <div>
                <label className="label" htmlFor="new-password">Password</label>
                <div className="relative">
                  <input id="new-password" type={show ? "text" : "password"} autoComplete="new-password" className="field pr-12" value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-asphalt-700" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="confirm-password">Confirm password</label>
                <input id="confirm-password" type={show ? "text" : "password"} autoComplete="new-password" className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePassword()} />
              </div>
              {err && <p className="text-sm text-red-700">{err}</p>}
              <button onClick={savePassword} disabled={busy} className="btn btn-primary w-full">{busy ? "Saving…" : "Save password"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
