"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [user, setUser] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState("");
  function accountEmail(value: string) {
    const name = value.trim();
    if (name.toLowerCase() === "admin") return "admin@allamericanasphaltpaving.com";
    return name;
  }
  async function go() {
    const { error } = await supabase.auth.signInWithPassword({ email: accountEmail(user), password });
    if (error) setErr(error.message); else router.replace("/");
  }
  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#163f86_0%,#0d2d64_100%)] p-4">
      <div className="panel w-full max-w-sm space-y-4 border-t-8 border-t-stripe">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <div><label className="label">User</label><input className="field" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} /></div>
        <div><label className="label">Password</label><input type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} /></div>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button onClick={go} className="btn btn-primary w-full">Sign in</button>
      </div>
    </div>
  );
}
