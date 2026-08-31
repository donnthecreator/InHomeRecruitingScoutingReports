/* =====================================================================
   update-prospect.js
   Deploy to: netlify/functions/update-prospect.js  (SCOUT repo)

   Handles commitment status and offers on the canonical prospect record.

   Actions (payload.action):
     "commitment"   set commit status / school / date / source
     "addOffer"     add one offer
     "removeOffer"  remove one offer
     "get"          read the prospect plus full offer list

   Every write records who reported it and when. That attribution is the
   whole point: a commit status without a source is a rumor, and a rumor
   rendered as fact in a client portal is how you lose the account.

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const ok   = (body) => ({ statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(body) });
const fail = (code, msg) => ({ statusCode: code, headers: JSON_HEADERS, body: JSON.stringify({ error: msg }) });

const STATUSES = ['uncommitted', 'verbal', 'committed', 'signed', 'decommitted'];
const SOURCES  = ['social', 'hs_coach', 'athlete', 'parent', 'scout_inference', 'media'];

async function resolveScout(accessCode) {
  if (!accessCode || !String(accessCode).trim()) return null;
  const rows = await sql`
    SELECT scout_id, name FROM scouts
    WHERE upper(access_code) = ${String(accessCode).trim().toUpperCase()}
    LIMIT 1`;
  return rows.length ? rows[0] : null;
}

async function loadProspect(prospectId) {
  const [prospect] = await sql`
    SELECT p.*,
           prog.short_name    AS committed_to_name,
           prog.espn_logo_id  AS committed_to_logo,
           prog.primary_color AS committed_to_color
    FROM prospects p
    LEFT JOIN programs prog ON prog.school_key = p.committed_to
    WHERE p.id = ${prospectId}`;
  if (!prospect) return null;

  const offers = await sql`
    SELECT o.id, o.school_key, o.school_other, o.offer_date, o.status,
           o.reported_by, o.reported_at, o.note,
           prog.short_name    AS school_name,
           prog.espn_logo_id  AS logo_id,
           prog.primary_color AS color,
           prog.conference,
           prog.division
    FROM prospect_offers o
    LEFT JOIN programs prog ON prog.school_key = o.school_key
    WHERE o.prospect_id = ${prospectId}
    ORDER BY o.offer_date DESC NULLS LAST, o.reported_at DESC`;

  return { prospect, offers };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return fail(400, 'Bad request'); }

  const prospectId = parseInt(payload.prospectId, 10);
  if (!prospectId) return fail(400, 'prospectId required');

  const scout = await resolveScout(payload.accessCode);
  if (!scout) return fail(401, 'Invalid access code');

  try {
    switch (payload.action) {

      /* ---------------------------------------------------------- */
      case 'get': {
        const data = await loadProspect(prospectId);
        if (!data) return fail(404, 'Prospect not found');
        return ok({ success: true, ...data });
      }

      /* ---------------------------------------------------------- */
      case 'commitment': {
        const status = String(payload.commitStatus || '').trim().toLowerCase();
        if (!STATUSES.includes(status)) {
          return fail(400, `commitStatus must be one of: ${STATUSES.join(', ')}`);
        }

        const source = payload.commitSource ? String(payload.commitSource).trim().toLowerCase() : null;
        if (source && !SOURCES.includes(source)) {
          return fail(400, `commitSource must be one of: ${SOURCES.join(', ')}`);
        }

        /* Anything other than uncommitted needs a school and a source.
           A bare "committed" with no school and no attribution is not
           information a personnel director can act on. */
        const schoolKey   = payload.committedTo      ? String(payload.committedTo).trim().toUpperCase() : null;
        const schoolOther = payload.committedToOther ? String(payload.committedToOther).trim() : null;

        if (status !== 'uncommitted') {
          if (!schoolKey && !schoolOther) return fail(400, 'A school is required for this status');
          if (!source) return fail(400, 'A source is required for this status');
        }

        if (schoolKey) {
          const [prog] = await sql`SELECT school_key FROM programs WHERE school_key = ${schoolKey}`;
          if (!prog) return fail(400, `Unknown school_key: ${schoolKey}. Use committedToOther instead.`);
        }

        await sql`
          UPDATE prospects SET
            commit_status      = ${status},
            committed_to       = ${status === 'uncommitted' ? null : schoolKey},
            committed_to_other = ${status === 'uncommitted' ? null : schoolOther},
            commit_date        = ${payload.commitDate || null},
            commit_source      = ${status === 'uncommitted' ? null : source},
            commit_reported_by = ${scout.scout_id},
            commit_reported_at = now(),
            updated_at         = now(),
            updated_by         = ${scout.scout_id}
          WHERE id = ${prospectId}`;

        /* If he committed to a school that already offered, mark that offer
           as the one that landed. Keeps the offer sheet coherent. */
        if (status !== 'uncommitted' && schoolKey) {
          await sql`
            UPDATE prospect_offers SET status = 'committed'
            WHERE prospect_id = ${prospectId} AND school_key = ${schoolKey}`;
        }

        const data = await loadProspect(prospectId);
        return ok({ success: true, ...data });
      }

      /* ---------------------------------------------------------- */
      case 'addOffer': {
        const schoolKey   = payload.schoolKey   ? String(payload.schoolKey).trim().toUpperCase() : null;
        const schoolOther = payload.schoolOther ? String(payload.schoolOther).trim() : null;
        if (!schoolKey && !schoolOther) return fail(400, 'schoolKey or schoolOther required');

        if (schoolKey) {
          const [prog] = await sql`SELECT school_key FROM programs WHERE school_key = ${schoolKey}`;
          if (!prog) return fail(400, `Unknown school_key: ${schoolKey}`);
        }

        await sql`
          INSERT INTO prospect_offers
            (prospect_id, school_key, school_other, offer_date, reported_by, note)
          VALUES
            (${prospectId}, ${schoolKey}, ${schoolOther},
             ${payload.offerDate || null}, ${scout.scout_id}, ${payload.note || null})
          ON CONFLICT (prospect_id, COALESCE(school_key, school_other)) DO UPDATE
            SET offer_date = COALESCE(EXCLUDED.offer_date, prospect_offers.offer_date),
                note       = COALESCE(EXCLUDED.note, prospect_offers.note)`;

        const data = await loadProspect(prospectId);
        return ok({ success: true, ...data });
      }

      /* ---------------------------------------------------------- */
      case 'removeOffer': {
        const offerId = parseInt(payload.offerId, 10);
        if (!offerId) return fail(400, 'offerId required');

        await sql`
          DELETE FROM prospect_offers
          WHERE id = ${offerId} AND prospect_id = ${prospectId}`;

        const data = await loadProspect(prospectId);
        return ok({ success: true, ...data });
      }

      /* ---------------------------------------------------------- */
      default:
        return fail(400, 'Unknown action. Use get, commitment, addOffer, or removeOffer.');
    }
  } catch (err) {
    console.error('update-prospect error:', err);
    return fail(500, err.message);
  }
};
