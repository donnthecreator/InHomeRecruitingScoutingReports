/* =====================================================================
   submit-intake.js
   POST /.netlify/functions/submit-intake     (public, no auth)

   The "I got a kid you need to look at" pipeline. A player, high school
   coach, parent, or trainer submits a prospect for evaluation. Nothing
   here is trusted: it lands in intake_requests with status 'new' and a
   human triages it in admin before it becomes a prospect.

   DELIBERATELY NOT COLLECTED
     - No passwords or account credentials of any kind. Film comes in as
       public links. Asking a minor for a Hudl login would put third
       party credentials in this database and break Hudl's terms.
     - No date of birth, address, or government id. Graduation year and
       a contact email are enough to route a prospect.
     - Submitters under 18 are asked for a parent/guardian or coach
       email rather than being the only contact on file.

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const fail = (c, m) => ({ statusCode: c, headers: HEADERS, body: JSON.stringify({ error: m }) });
const str = (v, max) => { const s = String(v == null ? '' : v).trim(); return s ? s.slice(0, max) : null; };
const isEmail = (s) => !!s && /^[^\s@]{1,64}@[^\s@]{1,255}\.[a-z]{2,}$/i.test(s);
const isUrl = (s) => !!s && /^https?:\/\/[^\s]{4,500}$/i.test(s);

const SUBMITTERS = ['player', 'coach', 'parent', 'trainer', 'other'];
const LEVELS = ['P4', 'G5', 'FCS', 'D2', 'D3/NAIA', 'JUCO', 'Not sure'];

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS intake_requests (
      id             SERIAL PRIMARY KEY,
      status         TEXT NOT NULL DEFAULT 'new',   -- new | reviewing | accepted | passed
      submitter_type TEXT,
      submitter_name TEXT,
      submitter_email TEXT,
      submitter_phone TEXT,
      submitter_role TEXT,                          -- "Head Coach, Hoover HS"
      player_name    TEXT,
      player_position TEXT,
      class_year     TEXT,
      school         TEXT,
      home_city      TEXT,
      home_state     TEXT,
      height         TEXT,
      weight         TEXT,
      hudl_url       TEXT,
      game_url       TEXT,
      other_film_url TEXT,
      last_game_stats TEXT,
      track_marks    TEXT,
      gpa            TEXT,
      level_rec      TEXT,
      program_recs   TEXT,
      pitch          TEXT,
      guardian_email TEXT,
      consent        BOOLEAN DEFAULT false,
      prospect_id    INTEGER,
      admin_note     TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS intake_status_idx ON intake_requests (status, created_at DESC)`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...HEADERS, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return fail(400, 'Bad request'); }

  /* honeypot: real people leave this empty */
  if (str(b.website, 200)) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };

  const playerName = str(b.playerName, 120);
  if (!playerName || playerName.length < 3) return fail(400, 'Player name is required');
  const submitterType = SUBMITTERS.includes(b.submitterType) ? b.submitterType : 'other';
  const submitterEmail = str(b.submitterEmail, 160);
  if (!isEmail(submitterEmail)) return fail(400, 'A valid email is required so we can get back to you');

  const hudl = str(b.hudlUrl, 500), game = str(b.gameUrl, 500), other = str(b.otherFilmUrl, 500);
  for (const [label, u] of [['Hudl link', hudl], ['game link', game], ['film link', other]]) {
    if (u && !isUrl(u)) return fail(400, `That ${label} does not look like a web address. Paste the full link starting with https://`);
  }
  if (!hudl && !game && !other) return fail(400, 'At least one film link is required. A Hudl profile or a game link is enough.');

  const guardianEmail = str(b.guardianEmail, 160);
  if (guardianEmail && !isEmail(guardianEmail)) return fail(400, 'That guardian email does not look right');
  /* A player submitting for himself needs an adult on the thread. */
  if (submitterType === 'player' && !guardianEmail) {
    return fail(400, 'Add a parent, guardian, or coach email so an adult is on the thread with us');
  }

  const levelRec = LEVELS.includes(b.levelRec) ? b.levelRec : null;
  const programRecs = Array.isArray(b.programRecs) ? b.programRecs.filter(x => typeof x === 'string').slice(0, 12).map(x => x.slice(0, 60)).join(', ') : null;

  try {
    await ensureTable();
    /* Same player + same submitter email in the last 24h is a re-submit,
       not a new lead. Update it instead of stacking duplicates. */
    const nk = playerName.toLowerCase().replace(/[^a-z]/g, '');
    const [dup] = await sql`
      SELECT id FROM intake_requests
      WHERE lower(regexp_replace(player_name, '[^A-Za-z]', '', 'g')) = ${nk}
        AND lower(submitter_email) = ${submitterEmail.toLowerCase()}
        AND created_at > now() - interval '24 hours'
      LIMIT 1`;

    const vals = {
      submitter_type: submitterType,
      submitter_name: str(b.submitterName, 120),
      submitter_email: submitterEmail,
      submitter_phone: str(b.submitterPhone, 40),
      submitter_role: str(b.submitterRole, 160),
      player_name: playerName,
      player_position: str(b.playerPosition, 20),
      class_year: str(b.classYear, 12),
      school: str(b.school, 160),
      home_city: str(b.homeCity, 80),
      home_state: str(b.homeState, 4),
      height: str(b.height, 12),
      weight: str(b.weight, 12),
      hudl_url: hudl,
      game_url: game,
      other_film_url: other,
      last_game_stats: str(b.lastGameStats, 1200),
      track_marks: str(b.trackMarks, 300),
      gpa: str(b.gpa, 10),
      level_rec: levelRec,
      program_recs: programRecs,
      pitch: str(b.pitch, 2000),
      guardian_email: guardianEmail,
      consent: !!b.consent
    };

    if (dup) {
      await sql`
        UPDATE intake_requests SET
          submitter_name = ${vals.submitter_name}, submitter_phone = ${vals.submitter_phone},
          submitter_role = ${vals.submitter_role}, player_position = ${vals.player_position},
          class_year = ${vals.class_year}, school = ${vals.school},
          home_city = ${vals.home_city}, home_state = ${vals.home_state},
          height = ${vals.height}, weight = ${vals.weight},
          hudl_url = ${vals.hudl_url}, game_url = ${vals.game_url}, other_film_url = ${vals.other_film_url},
          last_game_stats = ${vals.last_game_stats}, track_marks = ${vals.track_marks}, gpa = ${vals.gpa},
          level_rec = ${vals.level_rec}, program_recs = ${vals.program_recs}, pitch = ${vals.pitch},
          guardian_email = ${vals.guardian_email}, consent = ${vals.consent}, updated_at = now()
        WHERE id = ${dup.id}`;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, id: dup.id, updated: true }) };
    }

    const [row] = await sql`
      INSERT INTO intake_requests (
        submitter_type, submitter_name, submitter_email, submitter_phone, submitter_role,
        player_name, player_position, class_year, school, home_city, home_state, height, weight,
        hudl_url, game_url, other_film_url, last_game_stats, track_marks, gpa,
        level_rec, program_recs, pitch, guardian_email, consent
      ) VALUES (
        ${vals.submitter_type}, ${vals.submitter_name}, ${vals.submitter_email}, ${vals.submitter_phone}, ${vals.submitter_role},
        ${vals.player_name}, ${vals.player_position}, ${vals.class_year}, ${vals.school}, ${vals.home_city}, ${vals.home_state}, ${vals.height}, ${vals.weight},
        ${vals.hudl_url}, ${vals.game_url}, ${vals.other_film_url}, ${vals.last_game_stats}, ${vals.track_marks}, ${vals.gpa},
        ${vals.level_rec}, ${vals.program_recs}, ${vals.pitch}, ${vals.guardian_email}, ${vals.consent}
      ) RETURNING id`;
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, id: row.id }) };
  } catch (err) {
    console.error('submit-intake error:', err);
    return fail(500, err.message);
  }
};
