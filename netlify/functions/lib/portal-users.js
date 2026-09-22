/* =====================================================================
   portal-users.js
   College coaches with their own portal code, managed from admin the
   way scouts are. One row per person. The code is what they type at
   the portal gate; `school` ties them to a program directory row so the
   portal can paint their colors and find their program's board.

   portal_views     every prospect profile a coach opened, by code
   portal_requests  every request a coach sent from the portal
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

let ready = false;
async function ensure() {
  if (ready) return;
  await sql`CREATE TABLE IF NOT EXISTS portal_users (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    title TEXT,
    school TEXT,
    email TEXT,
    phone TEXT,
    note TEXT,
    headshot_key TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ,
    sign_ins INTEGER NOT NULL DEFAULT 0)`;
  await sql`ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS sms_opt_in_at TIMESTAMPTZ`;
  await sql`ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS sms_opt_in_how TEXT`;
  await sql`CREATE TABLE IF NOT EXISTS portal_texts (
    id SERIAL PRIMARY KEY,
    code TEXT,
    coach_name TEXT,
    to_phone TEXT,
    body TEXT,
    prospect_id INTEGER,
    prospect_name TEXT,
    sent BOOLEAN NOT NULL DEFAULT false,
    twilio_sid TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS portal_views (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    prospect_id INTEGER,
    prospect_name TEXT,
    prospect_school TEXT,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await sql`CREATE INDEX IF NOT EXISTS portal_views_code_idx ON portal_views (code, viewed_at DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS portal_requests (
    id SERIAL PRIMARY KEY,
    code TEXT,
    viewer_name TEXT,
    program TEXT,
    from_name TEXT,
    kind TEXT,
    prospect TEXT,
    details TEXT,
    ncaa_period TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    admin_note TEXT,
    emailed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  ready = true;
}

const cleanCode = (c) => String(c || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);

async function userByCode(code) {
  const c = cleanCode(code);
  if (!c) return null;
  await ensure();
  const [u] = await sql`SELECT * FROM portal_users WHERE code = ${c} LIMIT 1`;
  return u || null;
}

/* Send Don an email through Resend when RESEND_API_KEY is set. Without
   the key this quietly does nothing and returns false, so the request
   still lands in admin. */
async function sendMail({ subject, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const to = process.env.REQUEST_EMAIL || 'drlee@inhomerecruiting.com';
  const from = process.env.REQUEST_FROM || 'InHome Portal <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text })
    });
    if (!res.ok) { console.error('resend:', res.status, await res.text()); return false; }
    return true;
  } catch (e) { console.error('resend:', e.message); return false; }
}

module.exports = { sql, ensure, cleanCode, userByCode, sendMail };
