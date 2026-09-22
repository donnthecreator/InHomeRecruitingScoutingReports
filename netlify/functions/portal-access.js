/* =====================================================================
   portal-access.js
   GET ?code=SWINNEY26
   The coach portal asks here when a code is typed at the gate. Answers
   with who the coach is and which program he belongs to, so a code
   issued from admin works without touching the portal file.

   Public and CORS-open (the portal is on another domain). A wrong code
   returns 404 and nothing else; a right code returns only that coach's
   own name, title, photo, and his program's directory row.

   ENV: DATABASE_URL
===================================================================== */
const { sql, ensure, cleanCode } = require('./lib/portal-users');
const { schoolKey } = require('./lib/logos');

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

exports.handler = async (event) => {
  const code = cleanCode((event.queryStringParameters || {}).code);
  if (!code) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'code required' }) };
  try {
    await ensure();
    const [u] = await sql`SELECT * FROM portal_users WHERE code = ${code} LIMIT 1`;
    if (!u || u.active === false) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'not found' }) };

    const h = event.headers || {};
    const base = `${h['x-forwarded-proto'] || 'https'}://${h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com'}`;

    /* The program directory row: colors, logo, conference, and the
       program-level portal code that its prospect board is stored under. */
    let program = null;
    if (u.school) {
      const sk = schoolKey(u.school);
      const rows = await sql`
        SELECT school_key, name, short_name, conference, division, espn_logo_id, primary_color, access_code
        FROM programs
        WHERE school_key = ${sk} OR lower(name) = ${String(u.school).toLowerCase()} OR lower(short_name) = ${String(u.school).toLowerCase()}
        LIMIT 1`;
      program = rows[0] || null;
    }
    /* Any board already stored under a code for this school. */
    let boardCode = program && program.access_code ? program.access_code.toUpperCase() : null;
    if (!boardCode && u.school) {
      const [b] = await sql`
        SELECT pp.program_code FROM program_prospects pp
        JOIN programs pr ON upper(pr.access_code) = upper(pp.program_code)
        WHERE pr.school_key = ${schoolKey(u.school)} LIMIT 1`.catch(() => [null]);
      if (b) boardCode = b.program_code.toUpperCase();
    }

    await sql`UPDATE portal_users SET last_seen = now(), sign_ins = sign_ins + 1 WHERE id = ${u.id}`;

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({
      code: u.code, name: u.name, title: u.title, school: u.school,
      photoUrl: u.headshot_key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(u.headshot_key)}` : null,
      program: program ? {
        name: program.name, short: program.short_name, conference: program.conference, division: program.division,
        logoId: program.espn_logo_id, color: program.primary_color
      } : null,
      boardCode
    }) };
  } catch (err) {
    console.error('portal-access error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
