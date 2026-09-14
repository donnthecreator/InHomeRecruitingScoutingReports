/* =====================================================================
   profile-invite.js
   Self-service profile invite. A token tied to one prospect. No login,
   no password: possession of the link is the credential, same pattern
   as assessment.js. The athlete (or his coach/parent) fills in bio,
   uploads a photo, adds his film links, then is hydrated straight into
   the Full Assessment.

     GET  ?t=<token>                      -> prospect stub to prefill
     POST { t, fields }                   -> save profile fields
     POST { t, photo:{dataBase64,contentType} } -> save headshot
     POST { t, startAssessment:true }     -> creates/reuses a 'full'
           assessment for this prospect, returns its token

   ENV: DATABASE_URL
===================================================================== */
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const HEADERS = { 'Content-Type': 'application/json' };
const fail = (c, m) => ({ statusCode: c, headers: HEADERS, body: JSON.stringify({ error: m }) });

async function ensure() {
  await sql`CREATE TABLE IF NOT EXISTS profile_invites (
    id SERIAL PRIMARY KEY, token TEXT UNIQUE NOT NULL, prospect_id INTEGER,
    athlete_name TEXT, school TEXT, sent_to TEXT, sent_by TEXT, status TEXT NOT NULL DEFAULT 'sent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ)`;
  await sql`ALTER TABLE profile_invites ADD COLUMN IF NOT EXISTS reason TEXT`;
  await sql`ALTER TABLE profile_invites ADD COLUMN IF NOT EXISTS reason_detail TEXT`;
}

function frameStore() {
  const { getStore } = require('@netlify/blobs');
  const siteID = process.env.INHOME_SITE_ID, token = process.env.INHOME_BLOBS_TOKEN;
  return (siteID && token) ? getStore({ name: 'inhome-frames', siteID, token }) : getStore('inhome-frames');
}

exports.handler = async (event) => {
  try {
    await ensure();
    const qs = event.queryStringParameters || {};
    const token = String(qs.t || (JSON.parse(event.body || '{}').t) || '').trim();
    if (!token || token.length < 12) return fail(400, 'Missing invite link');
    const [inv] = await sql`SELECT * FROM profile_invites WHERE token = ${token}`;
    if (!inv) return fail(404, 'This invite link is not valid');

    if (event.httpMethod === 'GET') {
      let p = null;
      if (inv.prospect_id) [p] = await sql`SELECT * FROM prospects WHERE id = ${inv.prospect_id}`;
      if (inv.status === 'sent') await sql`UPDATE profile_invites SET status = 'started' WHERE id = ${inv.id}`;
      /* The invite is marked completed the moment the athlete clicks into the
         assessment, before he has answered anything. If he leaves and comes
         back on the same link, the profile is done but the assessment may
         not be. Hand the open assessment token back so the page can send him
         straight to where he left off instead of dead-ending him. */
      let openAssessment = null;
      if (inv.status === 'completed' && inv.prospect_id) {
        try {
          const [a] = await sql`SELECT token, status FROM assessments WHERE kind = 'full' AND prospect_id = ${inv.prospect_id} ORDER BY created_at DESC LIMIT 1`;
          if (a && a.status !== 'complete') openAssessment = a.token;
        } catch (e) { openAssessment = null; }
      }
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({
        status: inv.status === 'completed' ? 'completed' : 'open',
        assessmentToken: openAssessment,
        reason: inv.reason || 'film', reasonDetail: inv.reason_detail || null,
        prospect: p ? {
          id: p.id, name: p.name, school: p.school, position: p.position, classYear: p.class_year, level: p.level,
          homeCity: p.home_city, homeState: p.home_state, height: p.height, weight: p.weight, filmLink: p.film_link,
          headshotUrl: p.headshot_key ? `/.netlify/functions/frame?key=${encodeURIComponent(p.headshot_key)}` : null,
          hudlLink: p.hudl_link || null, milesplitLink: p.milesplit_link || null
        } : { name: inv.athlete_name, school: inv.school }
      }) };
    }

    if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
    const b = JSON.parse(event.body || '{}');

    if (b.startAssessment) {
      let pid = inv.prospect_id;
      if (!pid) return fail(400, 'Finish your profile first');
      await sql`CREATE TABLE IF NOT EXISTS assessments (
        id SERIAL PRIMARY KEY, token TEXT UNIQUE NOT NULL, prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
        athlete_name TEXT, school TEXT, position TEXT, kind TEXT NOT NULL DEFAULT 'interview', status TEXT NOT NULL DEFAULT 'sent',
        answers JSONB NOT NULL DEFAULT '{}'::jsonb, score_pct NUMERIC, score_detail JSONB, sent_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ)`;
      const [p] = await sql`SELECT name, school, position FROM prospects WHERE id = ${pid}`;
      const [open] = await sql`SELECT token FROM assessments WHERE kind = 'full' AND status <> 'complete' AND prospect_id = ${pid} LIMIT 1`;
      let atoken = open ? open.token : crypto.randomBytes(16).toString('base64url');
      if (!open) await sql`INSERT INTO assessments (token, prospect_id, athlete_name, school, position, kind, sent_by) VALUES (${atoken}, ${pid}, ${p.name}, ${p.school}, ${p.position}, 'full', 'self-invite')`;
      await sql`UPDATE profile_invites SET status = 'completed', completed_at = now() WHERE id = ${inv.id}`;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ assessmentToken: atoken }) };
    }

    if (b.photo) {
      if (!inv.prospect_id) return fail(400, 'Save your basic info first');
      const ct = b.photo.contentType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(ct)) return fail(400, 'Only JPEG, PNG, or WebP images');
      let buf; try { buf = Buffer.from(b.photo.dataBase64, 'base64'); } catch { return fail(400, 'Bad image data'); }
      if (!buf.length || buf.length > 8 * 1024 * 1024) return fail(413, 'Image too large');
      const store = frameStore();
      const key = `headshot_${inv.prospect_id}_${Date.now()}`;
      await store.set(key, buf, { metadata: { contentType: ct } });
      const [old] = await sql`SELECT headshot_key FROM prospects WHERE id = ${inv.prospect_id}`;
      await sql`UPDATE prospects SET headshot_key = ${key}, updated_at = now() WHERE id = ${inv.prospect_id}`;
      if (old && old.headshot_key) { try { await store.delete(old.headshot_key); } catch (e) {} }
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ headshotUrl: `/.netlify/functions/frame?key=${encodeURIComponent(key)}` }) };
    }

    /* save bio + links, creating the prospect on first save */
    const f = b.fields || {};
    const name = String(f.name || inv.athlete_name || '').trim().slice(0, 120);
    if (!name || name.length < 3) return fail(400, 'Your name is required');
    const val = (k, max) => (f[k] === undefined || f[k] === null || String(f[k]).trim() === '') ? null : String(f[k]).trim().slice(0, max);
    const nk = name.toLowerCase().replace(/[^a-z]/g, '');
    await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS hudl_link TEXT`;
    await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS milesplit_link TEXT`;
    let pid = inv.prospect_id;
    const fields = { school: val('school', 160), position: val('position', 20), class_year: val('classYear', 12), level: val('level', 12) || 'HS',
      home_city: val('homeCity', 80), home_state: val('homeState', 4), height: val('height', 12), weight: val('weight', 12),
      film_link: val('filmLink', 400), hudl_link: val('hudlLink', 400), milesplit_link: val('milesplitLink', 400) };
    if (pid) {
      await sql`UPDATE prospects SET name = ${name}, name_key = ${nk},
        school = COALESCE(${fields.school}, school), position = COALESCE(${fields.position}, position), class_year = COALESCE(${fields.class_year}, class_year),
        level = COALESCE(${fields.level}, level), home_city = COALESCE(${fields.home_city}, home_city), home_state = COALESCE(${fields.home_state}, home_state),
        height = COALESCE(${fields.height}, height), weight = COALESCE(${fields.weight}, weight), film_link = COALESCE(${fields.film_link}, film_link),
        hudl_link = COALESCE(${fields.hudl_link}, hudl_link), milesplit_link = COALESCE(${fields.milesplit_link}, milesplit_link), updated_at = now()
        WHERE id = ${pid}`;
    } else {
      const [exact] = await sql`SELECT id FROM prospects WHERE name_key = ${nk} AND COALESCE(school,'') = ${fields.school || ''} LIMIT 1`;
      if (exact) pid = exact.id;
      else {
        const rows = await sql`INSERT INTO prospects (name, name_key, school, position, class_year, level, home_city, home_state, height, weight, film_link, hudl_link, milesplit_link)
          VALUES (${name}, ${nk}, ${fields.school}, ${fields.position}, ${fields.class_year}, ${fields.level}, ${fields.home_city}, ${fields.home_state}, ${fields.height}, ${fields.weight}, ${fields.film_link}, ${fields.hudl_link}, ${fields.milesplit_link})
          RETURNING id`;
        pid = rows[0].id;
      }
      await sql`UPDATE profile_invites SET prospect_id = ${pid}, athlete_name = ${name}, school = ${fields.school} WHERE id = ${inv.id}`;
    }
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ prospectId: pid }) };
  } catch (err) {
    console.error('profile-invite error:', err);
    return fail(500, err.message);
  }
};
