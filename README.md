# Paving Invoices (Next.js + Supabase + Vercel)

Pipeline: **Estimate (draft) → Publish to invoice (ready) → Email / PDF / Print / Process → Pending (unpaid) → Mark as paid → Paid**

## Setup
1. `npm install`
2. Create a Supabase project, run `supabase/schema.sql` in the SQL editor, add a user under Authentication.
3. `cp .env.example .env.local` and fill in the URL + anon key.
4. `npm run dev`
5. Push to GitHub, import in Vercel, add the same two env vars.

## Edit your pricing
`lib/services.ts` — services come from allamericanasphaltpaving.com; **rates are placeholders**.
