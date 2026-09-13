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
    if (!positionGroup) return rows;
    return rows.filter(c => !c.position_group || c.position_group === 'ALL' || c.position_group === positionGroup);
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

    if (event.httpMethod === 'GET') {
      if (a.status === 'sent') await sql`UPDATE assessments SET status = 'started', started_at = now() WHERE id = ${a.id}`;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({
        kind: a.kind, athlete: a.athlete_name, school: a.school, position: a.position,
        status: a.status === 'complete' ? 'complete' : 'open',
        sections: bank(a.kind, a.position),
        /* dot scenarios carry their answers because the page grades on the spot,
           whiteboard style; the server re-scores on submit regardless */
        dots: usesClips(a.kind) ? scenariosFor(groupFor(a.position)) : [],
        clips: clips.map(c => ({ id: c.id, youtubeId: c.youtube_id, start: c.start_seconds || 0, question: c.question,
                                 options: (c.options && c.options.length) ? c.options : CLIP_OPTIONS_DEFAULT })),
        answers: a.answers || {}
      }) };
    }

    if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
    if (a.status === 'complete') return fail(409, 'This assessment was already submitted');
    const body = JSON.parse(event.body || '{}');
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
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ done: true, scored: sc.total > 0, pct: sc.pct, correct: sc.correct, total: sc.total }) };
  } catch (err) {
    console.error('assessment error:', err);
    return fail(500, err.message);
  }
};
