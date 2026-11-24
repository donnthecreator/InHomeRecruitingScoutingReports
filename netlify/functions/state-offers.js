/* =====================================================================
   state-offers.js
   GET /.netlify/functions/state-offers?state=CO

   The Offer Tracker on a high school's portal: every high school player
   in that state with a publicly reported college offer, what offered him,
   and whether he has committed. Built from public recruiting reports
   (247Sports, On3, MaxPreps, newspapers, school sites) by a research pass,
   saved in lib/state-offers/<STATE>.json, and refreshed by committing a
   new file. Every offer carries the URL it was reported at.

   Each offer and commitment comes back with the college's logo: ESPN's
   for the 230-odd programs in the directory, or one uploaded to the logo
   library (D2, NAIA, HBCU programs) when there is one.

   No contact details of any kind are stored or served.

   ENV: DATABASE_URL (logos only; without it the data still serves)
===================================================================== */

/* Static requires so the bundler ships every state file with the function.
   Add a line here when a new state's file is added. */
const STATES = {
  CO: require('./lib/state-offers/CO.json'),
};

const { schoolKey, logoMap } = require('./lib/logos');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
/* Names the research uses that differ from the directory's. */
const ALIAS = { olemiss: 'mississippi', mississippi: 'olemiss', miamifl: 'miami', pitt: 'pittsburgh', uconn: 'connecticut',
  ncstate: 'northcarolinastate', usc: 'southerncalifornia', southernmiss: 'southernmississippi', umass: 'massachusetts',
  ul: 'louisiana', ulm: 'louisianamonroe', utep: 'texaselpaso', utsa: 'texassanantonio', fiu: 'floridainternational',
  fau: 'floridaatlantic', ucf: 'centralflorida', smu: 'southernmethodist', tcu: 'texaschristian', byu: 'brighamyoung',
  lsu: 'louisianastate', unlv: 'nevadalasvegas', uab: 'alabamabirmingham', alabamaam: 'alabamaam', jaxstate: 'jacksonvillestate' };

let LOGO_CACHE = null, LOGO_AT = 0;
async function logoIndex(base) {
  if (LOGO_CACHE && Date.now() - LOGO_AT < 10 * 60 * 1000) return LOGO_CACHE;
  const idx = {};
  try {
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT name, short_name, school_key, espn_logo_id FROM programs WHERE active AND espn_logo_id IS NOT NULL`;
    rows.forEach(r => {
      const url = `https://a.espncdn.com/i/teamlogos/ncaa/500/${r.espn_logo_id}.png`;
      [r.name, r.short_name, r.school_key].forEach(n => { if (n) idx[norm(n)] = url; });
    });
    /* Uploaded logos (photo-tool) fill in the schools ESPN does not carry. */
    const up = await logoMap(sql, base);
    Object.keys(up).forEach(k => { if (!idx[k]) idx[k] = up[k]; });
  } catch (e) { /* no database: chips fall back to names */ }
  LOGO_CACHE = idx; LOGO_AT = Date.now();
  return idx;
}
function logoFor(idx, school) {
  const k = norm(school);
  return idx[k] || idx[ALIAS[k]] || idx[schoolKey(school)] || null;
}

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' };

exports.handler = async (event) => {
  const st = String((event.queryStringParameters || {}).state || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(st)) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'state required, e.g. CO' }) };
  const data = STATES[st];
  if (!data) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ state: st, retrieved: null, players: [] }) };
  const h = event.headers || {};
  const base = `${h['x-forwarded-proto'] || 'https'}://${h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com'}`;
  const idx = await logoIndex(base);
  const players = (data.players || []).map(p => ({
    ...p,
    offers: (p.offers || []).map(o => ({ ...o, logo: logoFor(idx, o.school) })),
    committed: p.committed ? { ...p.committed, logo: logoFor(idx, p.committed.school) } : p.committed,
  }));
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ...data, players }) };
};
