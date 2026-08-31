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
const { neon } = require('@neondatabase/serverless');
const { getStore } = require('@netlify/blobs');
const sql = neon(process.env.DATABASE_URL);

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const fail = (code, msg) => ({ statusCode: code, headers: JSON_HEADERS, body: JSON.stringify({ error: msg }) });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 4 * 1024 * 1024;

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

  const prospectId = parseInt(payload.prospectId, 10);
  if (!prospectId) return fail(400, 'prospectId required');

  const kind = payload.kind;
  if (!['headshot', 'wingspan', 'measure'].includes(kind)) {
    return fail(400, 'kind must be headshot, wingspan, or measure');
  }

  const scout = await resolveScout(payload.accessCode);
  if (!scout) return fail(401, 'Invalid access code');

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

    const store = getStore('inhome-frames');
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
