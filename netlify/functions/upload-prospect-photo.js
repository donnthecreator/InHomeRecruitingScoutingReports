/* =====================================================================
   upload-prospect-photo.js
   Deploy to: netlify/functions/upload-prospect-photo.js  (reports repo)

   POST JSON:
     { prospectId, accessCode, kind: "headshot" | "wingspan" | "measure",
       dataBase64?, contentType?, wingspan? }

   kind headshot/wingspan: stores the image in the same Netlify Blobs
     store frame.js reads ('inhome-frames') under a VERSIONED key
     (p<id>_<kind>_<timestamp>), writes that key onto the prospect row,
     then best-effort deletes the previous blob. Versioning matters:
     frame.js sends a 1-year immutable cache header, so overwriting a
     fixed key would leave stale photos in browsers forever.
   kind measure: saves the wingspan measurement text only, no image.

   Auth: scout access code resolved server side, same pattern as the
   other write endpoints. Size cap 4MB binary; the page resizes on the
   phone before upload so real payloads are ~200KB.

   ENV: DATABASE_URL
===================================================================== */
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const { frameStore } = require('./lib/blobs');
const sql = neon(process.env.DATABASE_URL);

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const fail = (code, msg) => ({ statusCode: code, headers: JSON_HEADERS, body: JSON.stringify({ error: msg }) });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 4 * 1024 * 1024;

/* Same token check as admin-data.js. Lets the admin panel upload photos
   for any prospect without holding a scout access code. */
function verifyAdmin(event) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const header = event.headers.authorization || event.headers.Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const [expiresStr, sig] = token.split('.');
  if (!expiresStr || !sig) return false;
  if (!Number(expiresStr) || Date.now() > Number(expiresStr)) return false;
  const expected = crypto.createHmac('sha256', secret).update(expiresStr).digest('hex');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function resolveScout(accessCode) {
  if (!accessCode || !String(accessCode).trim()) return null;
  const rows = await sql`
    SELECT scout_id, name FROM scouts
    WHERE upper(access_code) = ${String(accessCode).trim().toUpperCase()}
    LIMIT 1`;
  return rows.length ? rows[0] : null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return fail(400, 'Bad request'); }

  const kind = payload.kind;
  if (!['headshot', 'wingspan', 'measure', 'schoollogo'].includes(kind)) {
    return fail(400, 'kind must be headshot, wingspan, measure, or schoollogo');
  }

  let scout = await resolveScout(payload.accessCode);
  if (!scout && verifyAdmin(event)) scout = { scout_id: 'admin', name: 'Admin' };
  if (!scout) return fail(401, 'Invalid access code');

  /* ------- school logo (admin) ------- */
  if (kind === 'schoollogo') {
    if (scout.scout_id !== 'admin') return fail(403, 'Admin only');
    const logos = require('./lib/logos');
    const school = String(payload.school || '').trim();
    const sk = logos.schoolKey(school);
    if (!sk) return fail(400, 'school required');
    const contentType = payload.contentType || 'image/png';
    if (!ALLOWED_TYPES.includes(contentType)) return fail(400, 'Only JPEG, PNG, or WebP images');
    if (!payload.dataBase64) return fail(400, 'dataBase64 required');
    let buf; try { buf = Buffer.from(payload.dataBase64, 'base64'); } catch { return fail(400, 'Bad image data'); }
    if (!buf.length || buf.length > MAX_BYTES) return fail(413, 'Image too large');
    try {
      await logos.ensureTable(sql);
      const store = frameStore();
      const key = `logo_${sk}_${Date.now()}`;
      await store.set(key, buf, { metadata: { contentType } });
      const [old] = await sql`SELECT blob_key FROM school_logos WHERE school_key = ${sk}`;
      await sql`INSERT INTO school_logos (school_key, display_name, blob_key, updated_at) VALUES (${sk}, ${school}, ${key}, now())
                ON CONFLICT (school_key) DO UPDATE SET display_name = EXCLUDED.display_name, blob_key = EXCLUDED.blob_key, updated_at = now()`;
      if (old && old.blob_key) { try { await store.delete(old.blob_key); } catch (e) {} }
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ success: true, key, schoolKey: sk, url: '/.netlify/functions/frame?key=' + encodeURIComponent(key) }) };
    } catch (err) { console.error('school logo error:', err); return fail(500, err.message); }
  }

  const prospectId = parseInt(payload.prospectId, 10);
  if (!prospectId) return fail(400, 'prospectId required');

  try {
    const [prospect] = await sql`
      SELECT id, headshot_key, wingspan_key FROM prospects WHERE id = ${prospectId}`;
    if (!prospect) return fail(404, 'Prospect not found');

    /* ------- measurement only ------- */
    if (kind === 'measure') {
      const measure = payload.wingspan ? String(payload.wingspan).trim().slice(0, 20) : null;
      await sql`
        UPDATE prospects SET
          wingspan = ${measure},
          photo_updated_by = ${scout.scout_id},
          photo_updated_at = now()
        WHERE id = ${prospectId}`;
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ success: true, wingspan: measure }) };
    }

    /* ------- image upload ------- */
    const contentType = payload.contentType || 'image/jpeg';
    if (!ALLOWED_TYPES.includes(contentType)) return fail(400, 'Only JPEG, PNG, or WebP images');
    if (!payload.dataBase64) return fail(400, 'dataBase64 required');

    let buf;
    try { buf = Buffer.from(payload.dataBase64, 'base64'); }
    catch { return fail(400, 'Bad image data'); }
    if (!buf.length) return fail(400, 'Empty image');
    if (buf.length > MAX_BYTES) return fail(413, 'Image too large — try again, the page should be resizing before upload');

    const store = frameStore();
    const key = `p${prospectId}_${kind}_${Date.now()}`;
    await store.set(key, buf, { metadata: { contentType } });

    const oldKey = kind === 'headshot' ? prospect.headshot_key : prospect.wingspan_key;

    if (kind === 'headshot') {
      const measure = payload.wingspan ? String(payload.wingspan).trim().slice(0, 20) : undefined;
      await sql`
        UPDATE prospects SET
          headshot_key = ${key},
          photo_updated_by = ${scout.scout_id},
          photo_updated_at = now()
        WHERE id = ${prospectId}`;
    } else {
      await sql`
        UPDATE prospects SET
          wingspan_key = ${key},
          wingspan = COALESCE(${payload.wingspan ? String(payload.wingspan).trim().slice(0, 20) : null}, wingspan),
          photo_updated_by = ${scout.scout_id},
          photo_updated_at = now()
        WHERE id = ${prospectId}`;
    }

    /* Best-effort cleanup of the replaced blob. Failure is harmless:
       the row already points at the new key. */
    if (oldKey) { try { await store.delete(oldKey); } catch (e) { console.error('old blob cleanup failed:', e.message); } }

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ success: true, key, url: '/.netlify/functions/frame?key=' + encodeURIComponent(key) })
    };
  } catch (err) {
    console.error('upload-prospect-photo error:', err);
    return fail(500, err.message);
  }
};
