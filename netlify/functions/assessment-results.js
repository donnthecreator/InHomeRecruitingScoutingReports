/* =====================================================================
   assessment-results.js
   The full results of one completed assessment, for a parent or a
   college, through a signed link the admin sends. No login.

     GET  ?a=<assessmentId>&s=<sig>            -> every question, every
          answer option, what he picked, the right answer and why, the
          film clip or field diagram, his written answers, the type.
     POST { a, s, name, email, phone, note }   -> a training request from
          the results page. Lands in the admin Inbox as a training lead.

   The link is signed with ADMIN_SECRET (resultsSig in admin-data.js,
   keep the two in sync), so nobody reaches results by counting ids.
   The audience (parent or college) only changes the wording on the
   page; the content is the athlete's own and is the same either way.

   ENV: DATABASE_URL, ADMIN_SECRET
===================================================================== */
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const { bank, groupFor, scenariosFor, CLIP_OPTIONS_DEFAULT } = require('./lib/assessment-banks');
const { explain: explainType } = require('./lib/mbti-locker');

const sql = neon(process.env.DATABASE_URL);
const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const fail = (c, m) => ({ statusCode: c, headers: HEADERS, body: JSON.stringify({ error: m }) });
const ok = (b) => ({ statusCode: 200, headers: HEADERS, body: JSON.stringify(b) });
const str = (v, max) => { const s = String(v == null ? '' : v).trim(); return s ? s.slice(0, max) : null; };

function resultsSig(id) {
  return crypto.createHmac('sha256', process.env.ADMIN_SECRET || '').update('results:' + id).digest('hex').slice(0, 24);
}
function sigOk(id, s) {
  if (!process.env.ADMIN_SECRET || !id || !s) return false;
  const a = Buffer.from(String(s)), b = Buffer.from(resultsSig(id));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* Defender codes in words, same table as player.js. */
const DEF_WORDS = { NB: 'Nickel', SS: 'Strong safety', FS: 'Free safety', M: 'Mike', W: 'Will', S: 'Sam',
  CB: 'Corner', LC: 'Left corner', RC: 'Right corner', LCB: 'Left corner', RCB: 'Right corner', WE: 'Weak end', SE: 'Strong end',
  NT: 'Nose', DT: 'Tackle', DT3: 'Three-tech', DE: 'End', J: 'Jack', R: 'Rover', D: 'Dime' };
const defWord = (v) => { const k = String(v || '').replace(/^tapped\s+/i, '').toUpperCase(); return DEF_WORDS[k] || k || null; };
const idx = (v) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isInteger(n) ? n : null; };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { ...HEADERS, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, body: '' };
  try {
    const qs = event.queryStringParameters || {};
    const body = event.httpMethod === 'POST' ? JSON.parse(event.body || '{}') : {};
    const id = parseInt(qs.a || body.a, 10);
    if (!sigOk(id, qs.s || body.s)) return fail(403, 'This results link is not valid. Ask InHome for a fresh one.');

    const [a] = await sql`SELECT a.*, to_char(a.completed_at,'Mon DD, YYYY') AS completed_day FROM assessments a WHERE a.id = ${id}`;
    if (!a) return fail(404, 'These results were removed.');
    if (a.status !== 'complete') return fail(409, 'He has not finished this assessment yet.');

    /* ---- training request from the results page ---- */
    if (event.httpMethod === 'POST') {
      if (str(body.website, 200)) return ok({ ok: true }); // honeypot
      const name = str(body.name, 120), email = str(body.email, 200), phone = str(body.phone, 40);
      if (!name) return fail(400, 'Your name, please.');
      if (!email && !phone) return fail(400, 'A phone number or email so we can reach you.');
      if (email && !/^[^\s@]{1,64}@[^\s@]{1,255}\.[a-z]{2,}$/i.test(email)) return fail(400, 'That email does not look right.');
      const role = ['parent', 'athlete', 'coach', 'other'].includes(body.role) ? body.role : 'parent';
      const sd = a.score_detail || {};
      const pitch = `TRAINING REQUEST from his assessment results (${sd.pct != null ? sd.pct + '% Football IQ' : 'interview'}, completed ${a.completed_day || ''}).`
        + (str(body.note, 1500) ? ' ' + str(body.note, 1500) : '');
      let p = null;
      if (a.prospect_id) { try { [p] = await sql`SELECT position, class_year, school, home_city, home_state FROM prospects WHERE id = ${a.prospect_id}`; } catch (e) {} }
      await sql`INSERT INTO intake_requests (submitter_type, submitter_name, submitter_email, submitter_phone, submitter_role,
                  player_name, player_position, class_year, school, home_city, home_state, pitch, consent, prospect_id)
                VALUES ('training', ${name}, ${email}, ${phone}, ${role.charAt(0).toUpperCase() + role.slice(1)},
                  ${a.athlete_name}, ${(p && p.position) || a.position || null}, ${(p && p.class_year) || null}, ${(p && p.school) || a.school || null},
                  ${(p && p.home_city) || null}, ${(p && p.home_state) || null}, ${pitch}, true, ${a.prospect_id || null})`;
      return ok({ ok: true });
    }

    const sd = a.score_detail || {};
    const ans = a.answers || {};
    const group = groupFor(a.position);

    /* field diagrams and clips, so each question shows what he was shown */
    const scen = {};
    try { scenariosFor(group, { all: true }).forEach(s => { scen['dot_' + s.id] = s; }); } catch (e) {}
    try { scenariosFor(null, { all: true }).forEach(s => { if (!scen['dot_' + s.id]) scen['dot_' + s.id] = s; }); } catch (e) {}
    const clipRows = {};
    try { (await sql`SELECT id, youtube_id, start_seconds, options FROM iq_clips`).forEach(c => { clipRows['clip_' + c.id] = c; }); } catch (e) {}
    const bankOpts = {};
    try { bank(a.kind, a.position, { all: true }).forEach(sec => (sec.items || []).forEach(it => { if (it.options) bankOpts[it.id] = it.options; })); } catch (e) {}

    const scored = (Array.isArray(sd.detail) ? sd.detail : []).map(d => {
      const sc = scen[d.id];
      const clip = clipRows[d.id];
      const isTap = !!d.dots && sc && sc.mode === 'tap';
      let options = d.options || (sc && sc.mode === 'choice' ? sc.options : null) || bankOpts[d.id]
        || (clip ? ((clip.options && clip.options.length) ? clip.options : CLIP_OPTIONS_DEFAULT) : null);
      const out = { id: d.id, q: d.q, correct: !!d.correct, why: d.why || null,
        type: d.clip ? 'film' : d.dots ? (isTap ? 'tap' : 'read') : 'written' };
      if (isTap) {
        out.tapped = d.given ? String(d.given).replace(/^tapped\s+/i, '') : null;
        out.tappedWord = defWord(out.tapped);
        out.answerTap = d.answer != null ? String(d.answer) : null;
        out.answerWord = defWord(out.answerTap);
      } else {
        out.options = options || null;
        out.given = idx(d.given);
        out.answer = idx(d.answer);
        if (!options) { out.givenText = d.given != null ? String(d.given) : null; out.answerText = d.answer != null ? String(d.answer) : null; }
      }
      if (sc) out.field = { offense: sc.offense || [], defense: sc.defense || [], motion: sc.motion || null, duration: sc.duration || 800, snap: !!sc.snap };
      if (clip) out.clip = { youtubeId: clip.youtube_id, start: clip.start_seconds || 0 };
      return out;
    });

    /* Everything else he answered, in the order he saw it. Single-choice
       items carry every option with his pick marked. */
    const scoredIds = new Set(scored.map(d => d.id));
    const sections = [];
    try {
      bank(a.kind, a.position, { all: true }).forEach(sec => {
        const items = (sec.items || []).filter(it => !scoredIds.has(it.id) && it.answer === undefined).map(it => {
          const v = ans[it.id];
          const has = v !== undefined && v !== null && String(v).trim() !== '';
          if (it.retired && !has) return null;
          if (it.type === 'single') return { id: it.id, type: 'single', q: it.q, options: it.options || [], given: idx(v) };
          if (it.type === 'scale') return { id: it.id, type: 'scale', q: it.q, max: it.max || 5, low: it.low || '', high: it.high || '', given: idx(v) };
          return { id: it.id, type: 'text', q: it.q, text: has ? String(v) : null };
        }).filter(Boolean);
        if (items.length) sections.push({ section: sec.section || sec.title || '', items });
      });
    } catch (e) {}

    let prospect = null;
    if (a.prospect_id) {
      try {
        const h = event.headers || {};
        const base = `${h['x-forwarded-proto'] || 'https'}://${h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com'}`;
        const [p] = await sql`SELECT name, school, position, class_year, home_city, home_state, height, weight, headshot_key FROM prospects WHERE id = ${a.prospect_id}`;
        if (p) prospect = { name: p.name, school: p.school, position: p.position, classYear: p.class_year,
          hometown: [p.home_city, p.home_state].filter(Boolean).join(', ') || null, height: p.height, weight: p.weight,
          headshotUrl: p.headshot_key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(p.headshot_key)}` : null };
      } catch (e) {}
    }

    const mbti = sd.mbti && sd.mbti.complete ? sd.mbti.type : null;
    return ok({
      audience: qs.v === 'college' ? 'college' : 'parent',
      kind: a.kind, athlete: a.athlete_name, school: a.school, position: a.position, completed: a.completed_day,
      prospect,
      pct: sd.pct != null ? sd.pct : null, correct: sd.correct != null ? sd.correct : null, total: sd.total != null ? sd.total : null,
      diagnosis: sd.diagnosis || null,
      personality: mbti ? explainType(mbti) : null,
      scored, sections
    });
  } catch (err) {
    console.error('assessment-results error:', err);
    return fail(500, err.message);
  }
};
