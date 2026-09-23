import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSignInEmail } from "@/lib/signInMail";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Sign in again, then retry." }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "Sign in again, then retry." }, { status: 401 });

  const { data: admin } = await supabase.from("members").select("role").eq("id", auth.user.id).maybeSingle();
  if (admin?.role !== "Admin") return NextResponse.json({ error: "Only an admin can email a sign-in." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const fullName = String(body?.full_name ?? "").trim();
  const role = String(body?.role ?? "").trim();
  if (!fullName) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (password.length < 8 || /[\r\n]/.test(password)) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const { data: member } = await supabase.from("members").select("id").eq("email", email).maybeSingle();
  if (!member) return NextResponse.json({ error: "Add the user before emailing a sign-in." }, { status: 400 });

  const { data: company } = await supabase.from("company_settings").select("name,email").eq("id", 1).maybeSingle();
  const origin = req.headers.get("origin") || "http://localhost:3000";
  const replyTo = EMAIL.test(String(company?.email ?? "")) ? String(company?.email) : undefined;

  try {
    await sendSignInEmail({
      to: email,
      fullName,
      password,
      role,
      loginUrl: `${origin}/login`,
      companyName: company?.name || "All American Asphalt",
      replyTo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The sign-in email could not be sent.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
