/* =====================================================================
   assessment.js
   Athlete-facing assessment, no login. One link per athlete per kind.

     GET  ?t=<token>            -> the questions plus who it is for
     POST { t, answers, done }  -> save progress / submit

   Tokens are random and unguessable. A link only ever exposes the
   athlete's own name and school, never anyone else's data.

   ENV: DATABASE_URL
===================================================================== */
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const crypto2 = require('crypto');
const { bank, score, mbtiType, usesClips, groupFor, scenariosFor, CLIP_OPTIONS_DEFAULT } = require('./lib/assessment-banks');

/* Preview reveals the correct answers, so it is admin only. Same token
   check as admin-data.js. Without it a preview still renders, just
   without the answer key. */
function isAdmin(event) {
  const secret = process.env.ADMIN_SECRET; if (!secret) return false;
  const header = (event.headers || {}).authorization || (event.headers || {}).Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !Number(exp) || Date.now() > Number(exp)) return false;
  const expected = crypto2.createHmac('sha256', secret).update(exp).digest('hex');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && crypto2.timingSafeEqual(a, b);
}
const sql = neon(process.env.DATABASE_URL);

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const fail = (c, m) => ({ statusCode: c, headers: HEADERS, body: JSON.stringify({ error: m }) });

async function ensure() {
  await sql`CREATE TABLE IF NOT EXISTS assessments (
    id           SERIAL PRIMARY KEY,
    token        TEXT UNIQUE NOT NULL,
    prospect_id  INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
    athlete_name TEXT,
    school       TEXT,
    position     TEXT,
    kind         TEXT NOT NULL DEFAULT 'interview',
    status       TEXT NOT NULL DEFAULT 'sent',
    answers      JSONB NOT NULL DEFAULT '{}'::jsonb,
    score_pct    NUMERIC,
    score_detail JSONB,
    sent_by      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
  )`;
  await sql`CREATE TABLE IF NOT EXISTS iq_clips (
    id            SERIAL PRIMARY KEY,
    youtube_id    TEXT NOT NULL,
    question      TEXT NOT NULL,
    options       JSONB,
    answer_index  INTEGER,
    explanation   TEXT,
    position_group TEXT,
    start_seconds INTEGER DEFAULT 0,
    active        BOOLEAN NOT NULL DEFAULT true,
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

async function activeClips(positionGroup) {
  try {
    const rows = await sql`SELECT * FROM iq_clips WHERE active = true ORDER BY sort_order, id`;
    if (!positionGroup) return rows.filter(c => !c.position_group || String(c.position_group).split(',').includes('ALL'));
    return rows.filter(c => {
      const groups = String(c.position_group || 'ALL').split(',').map(x => x.trim());
      return groups.includes('ALL') || groups.includes(positionGroup);
    });
  } catch (e) { return []; }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { ...HEADERS, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, body: '' };
  try {
    await ensure();
    const qs = event.queryStringParameters || {};

    /* ---- preview: no token, nothing saved ---- */
    if (qs.preview) {
      const kind = ['interview', 'iq', 'full'].includes(qs.preview) ? qs.preview : 'full';
      const admin = isAdmin(event);
      const pos = qs.position || null;
      const clips = usesClips(kind) ? await activeClips(groupFor(pos)) : [];
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({
        preview: true, admin, kind,
        athlete: 'Preview', school: 'Nothing here is saved', status: 'open',
        position: pos, positionGroup: groupFor(pos),
        sections: bank(kind, pos).map(sec => ({ section: sec.section, items: sec.items.map(it => admin ? it : (({ answer, why, mb, ...rest }) => rest)(it)) })),
        dots: usesClips(kind) ? scenariosFor(groupFor(pos)) : [],
        clips: clips.map(c => ({ id: c.id, youtubeId: c.youtube_id, start: c.start_seconds || 0, question: c.question,
          options: (c.options && c.options.length) ? c.options : CLIP_OPTIONS_DEFAULT,
          answer: admin ? c.answer_index : undefined, why: admin ? c.explanation : undefined })),
        answers: {}
      }) };
    }

    const token = String(qs.t || (JSON.parse(event.body || '{}').t) || '').trim();
    if (!token || token.length < 12) return fail(400, 'Missing link key');
    const [a] = await sql`SELECT * FROM assessments WHERE token = ${token}`;
    if (!a) return fail(404, 'This link is not valid');

    const clips = usesClips(a.kind) ? await activeClips(groupFor(a.position)) : [];

    /* Everything the athlete receives goes through this. The answer key,
       the explanation for each read, and the personality-dimension tag on
       each question never leave the server for an athlete session. The
       page grades nothing; the server re-scores on submit. Preview (admin,
       returned above) keeps the full objects. */
    const forAthlete = (items) => (items || []).map(it => {
      const o = Object.assign({}, it);
      delete o.answer; delete o.why; delete o.mb;
      if (Array.isArray(o.items)) o.items = forAthlete(o.items);
      if (Array.isArray(o.questions)) o.questions = forAthlete(o.questions);
      return o;
    });

    /* Profile card for the welcome page: the athlete sees himself first,
       then the consent screen, then the questions. Everything here is his
       own public-facing record. onBoard says whether a program has asked
       for him, which changes the wording on the welcome page. */
    let profile = null;
    if (a.prospect_id) {
      try {
        const h = event.headers || {};
        const base = `${h['x-forwarded-proto'] || 'https'}://${h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com'}`;
        const [pr] = await sql`SELECT id, name, school, position, class_year, level, home_city, home_state, height, weight, headshot_key FROM prospects WHERE id = ${a.prospect_id}`;
        if (pr) {
          let logoUrl = null, onBoard = false, boardLevels = [];
          try {
            const [lg] = await sql`SELECT espn_logo_id FROM programs WHERE lower(regexp_replace(short_name,'[^A-Za-z0-9]','','g')) = lower(regexp_replace(${pr.school || ''},'[^A-Za-z0-9]','','g')) LIMIT 1`;
            if (lg && lg.espn_logo_id) logoUrl = `https://a.espncdn.com/i/teamlogos/ncaa/500/${lg.espn_logo_id}.png`;
          } catch (e) {}
          try {
            const rows = await sql`SELECT DISTINCT COALESCE(pg.division,'') AS division FROM program_prospects pp LEFT JOIN programs pg ON upper(pg.access_code) = upper(pp.program_code) WHERE pp.prospect_id = ${pr.id}`;
            onBoard = rows.length > 0;
            boardLevels = rows.map(r => r.division).filter(Boolean);
          } catch (e) {}
          profile = {
            name: pr.name, school: pr.school, position: pr.position, classYear: pr.class_year, level: pr.level,
            homeCity: pr.home_city, homeState: pr.home_state, height: pr.height, weight: pr.weight,
            headshotUrl: pr.headshot_key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(pr.headshot_key)}` : null,
            logoUrl, onBoard, boardLevels
          };
        }
      } catch (e) { profile = null; }
    }

    if (event.httpMethod === 'GET') {
      if (a.status === 'sent') await sql`UPDATE assessments SET status = 'started', started_at = now() WHERE id = ${a.id}`;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({
        kind: a.kind, athlete: a.athlete_name, school: a.school, position: a.position, positionGroup: groupFor(a.position),
        needsPosition: usesClips(a.kind) && !groupFor(a.position),
        status: a.status === 'complete' ? 'complete' : 'open',
        profile,
        sections: forAthlete(bank(a.kind, a.position)),
        dots: usesClips(a.kind) ? forAthlete(scenariosFor(groupFor(a.position))) : [],
        clips: clips.map(c => ({ id: c.id, youtubeId: c.youtube_id, start: c.start_seconds || 0, question: c.question,
                                 options: (c.options && c.options.length) ? c.options : CLIP_OPTIONS_DEFAULT })),
        answers: a.answers || {}
      }) };
    }

    if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
    if (a.status === 'complete') return fail(409, 'This assessment was already submitted');
    const body = JSON.parse(event.body || '{}');

    /* athlete sets or corrects his position before the football section loads */
    if (body.setPosition) {
      const pos = String(body.setPosition).toUpperCase().slice(0, 6);
      if (!groupFor(pos)) return fail(400, 'Pick a position from the list');
      await sql`UPDATE assessments SET position = ${pos} WHERE id = ${a.id}`;
      if (a.prospect_id) { try { await sql`UPDATE prospects SET position = COALESCE(position, ${pos}), updated_at = now() WHERE id = ${a.prospect_id}`; } catch (e) {} }
      const clips2 = usesClips(a.kind) ? await activeClips(groupFor(pos)) : [];
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({
        position: pos, positionGroup: groupFor(pos),
        sections: forAthlete(bank(a.kind, pos)),
        dots: usesClips(a.kind) ? forAthlete(scenariosFor(groupFor(pos))) : [],
        clips: clips2.map(c => ({ id: c.id, youtubeId: c.youtube_id, start: c.start_seconds || 0, question: c.question,
                                  options: (c.options && c.options.length) ? c.options : CLIP_OPTIONS_DEFAULT }))
      }) };
    }
    const answers = (body.answers && typeof body.answers === 'object') ? body.answers : {};
    /* cap any single answer so a paste bomb can't fill the row */
    const clean = {};
    Object.entries(answers).slice(0, 400).forEach(([k, v]) => { clean[String(k).slice(0, 60)] = typeof v === 'string' ? v.slice(0, 4000) : v; });

    if (!body.done) {
      await sql`UPDATE assessments SET answers = ${JSON.stringify(clean)}, status = 'started' WHERE id = ${a.id}`;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ saved: true }) };
    }
    const sc = score(a.kind, clean, clips, a.position);
    if (a.kind === 'interview' || a.kind === 'full') sc.mbti = mbtiType(clean);
    try { sc.diagnosis = require('./lib/diagnosis').diagnosis(a.kind, sc, clean, a.position, sc.mbti); } catch (e) { sc.diagnosis = null; }
    await sql`UPDATE assessments SET answers = ${JSON.stringify(clean)}, status = 'complete', completed_at = now(),
              score_pct = ${sc.total ? sc.pct : null}, score_detail = ${JSON.stringify(sc)} WHERE id = ${a.id}`;
    /* The athlete gets a receipt, not a score. Results are read in admin. */
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ done: true, scored: sc.total > 0 }) };
  } catch (err) {
    console.error('assessment error:', err);
    return fail(500, err.message);
  }
};
