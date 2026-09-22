/* =====================================================================
   portal-request.js
   POST { code?, viewerName?, program, from, kind, prospect, details, ncaaPeriod }
   A coach sends a request from the portal. It is saved for the admin
   Inbox and emailed to Don when RESEND_API_KEY is set.

   ENV: DATABASE_URL, RESEND_API_KEY (optional), REQUEST_EMAIL (optional)
===================================================================== */
const { sql, ensure, cleanCode, sendMail } = require('./lib/portal-users');
const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const fail = (c, m) => ({ statusCode: c, headers: HEADERS, body: JSON.stringify({ error: m }) });
const s = (v, n) => (v === null || v === undefined) ? null : String(v).trim().slice(0, n) || null;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
  let b; try { b = JSON.parse(event.body || '{}'); } catch { return fail(400, 'Bad request'); }
  const program = s(b.program, 120), kind = s(b.kind, 80), details = s(b.details, 4000);
  if (!program || !kind) return fail(400, 'program and kind required');
  try {
    await ensure();
    const code = cleanCode(b.code) || null;
    const [row] = await sql`
      INSERT INTO portal_requests (code, viewer_name, program, from_name, kind, prospect, details, ncaa_period)
      VALUES (${code}, ${s(b.viewerName, 120)}, ${program}, ${s(b.from, 200)}, ${kind}, ${s(b.prospect, 200)}, ${details}, ${s(b.ncaaPeriod, 120)})
      RETURNING id, created_at`;
    const text =
      `Program: ${program}\n` +
      `From: ${s(b.from, 200) || '(not given)'}${code ? ` (portal code ${code}${b.viewerName ? ', ' + b.viewerName : ''})` : ''}\n` +
      `Request: ${kind}\n` +
      `Prospect: ${s(b.prospect, 200) || '(not specified)'}\n` +
      `NCAA period: ${s(b.ncaaPeriod, 120) || 'n/a'}\n\n` +
      `Details:\n${details || '(none)'}\n\n` +
      `Open the admin Inbox to respond. Request #${row.id}.`;
    const emailed = await sendMail({ subject: `InHome request: ${kind}${b.prospect ? ' - ' + s(b.prospect, 200) : ''} (${program})`, text });
    if (emailed) await sql`UPDATE portal_requests SET emailed = true WHERE id = ${row.id}`;
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, id: row.id, emailed }) };
  } catch (err) {
    console.error('portal-request error:', err);
    return fail(500, err.message);
  }
};
