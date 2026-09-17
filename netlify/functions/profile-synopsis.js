/* =====================================================================
   profile-synopsis.js
   One paragraph a personnel director can read in thirty seconds,
   written from the prospect's actual file and nothing else: the
   scouting report grades and narrative, the assessment results, the
   personality read, the offers. Requires the same access code the full
   profile does. Cached by a hash of the inputs, so it regenerates only
   when the file changes.

   Needs ANTHROPIC_API_KEY in the Netlify environment. Without it the
   function returns a clear error and the page says so.
   ===================================================================== */
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');
const { POSITIONS, GRADE_LABELS } = require('./lib/positions');
const { explain: explainType } = require('./lib/mbti-locker');

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const ok = (b) => ({ statusCode: 200, headers: HEADERS, body: JSON.stringify(b) });
const fail = (c, error) => ({ statusCode: c, headers: HEADERS, body: JSON.stringify({ error }) });

/* Only the facts. No adjectives the file did not earn. */
const SYSTEM = `You write scouting synopses for InHome Recruiting Intelligence. The reader is a Director of Player Personnel at a college football program. He has thirty seconds.

Rules you do not break:
- Use only the information in the file you are given. Never invent a statistic, a measurement, a school, an offer, a game, or a quote. If something is not in the file, it is not in your synopsis.
- State the weaknesses as plainly as the strengths. A synopsis that only praises is useless to this reader and he will know it.
- Cite the grade when you name a trait, for example "man coverage graded Elite" or "eye discipline flagged as a concern".
- If a personality type is present, give one sentence on how to coach him, not a personality profile.
- No hype words. No "elite talent", "special", "freak", "can't-miss". No exclamation marks.
- Do not use em dashes anywhere. Use commas, periods, or colons.
- 170 to 230 words. Plain paragraphs, no headings, no bullet points.
- Open with what he is: position, archetype, InHome Score and tier, in one sentence.
- Close with a single sentence that begins "Bottom line:" and gives the honest projection.`;

function dossier(p, reports, assessments, offers) {
  const L = [];
  L.push(`PROSPECT: ${p.name}, ${p.position || '?'}${p.class_year ? ', class of ' + p.class_year : ''}, ${p.school || 'school unknown'}${p.level ? ' (' + p.level + ')' : ''}.`);
  if (p.height || p.weight) L.push(`Listed: ${[p.height, p.weight].filter(Boolean).join(', ')}.`);
  if (offers.length) L.push(`Offers on file: ${offers.map(o => o.school).join(', ')}.`);

  reports.forEach((r, i) => {
    const cfg = POSITIONS[r.position] || null;
    const name = (list, id) => { const t = (list || []).find(x => x.id === id); return t ? t.name : id; };
    const gw = (n) => n ? GRADE_LABELS[Number(n) - 1] || n : 'not graded';
    L.push(`\nSCOUTING REPORT ${i + 1} by ${r.scout_name || 'InHome scout'}${r.scout_played ? ' (played ' + r.scout_played + ')' : ''}, ${r.date_evaluated || ''}. Archetype: ${r.archetype || 'n/a'}. InHome Score ${r.inhome_score != null ? Number(r.inhome_score).toFixed(1) : 'n/a'}, tier: ${r.recommendation_tier || 'n/a'}. Scout football IQ ${r.football_iq != null ? r.football_iq + '/10' : 'n/a'}.`);
    const raw = r.raw || {};
    const tg = raw.traitGrades || r.film_grades || {}, ag = raw.athleticGrades || r.athletic_grades || {}, ar = raw.athleticRaw || r.athletic_raw || {};
    const pg = raw.productionGrades || r.production_grades || {}, pr = raw.productionRaw || r.production_raw || {}, gates = raw.gates || r.gates || {};
    if (Object.keys(tg).length) L.push('Film grades: ' + Object.keys(tg).map(k => `${name(cfg && cfg.film, k)} ${gw(tg[k])}`).join('; ') + '.');
    if (Object.keys(ag).length) L.push('Athletic grades: ' + Object.keys(ag).map(k => `${name(cfg && cfg.athletic, k)} ${gw(ag[k])}${ar[k] ? ' (' + ar[k] + ')' : ''}`).join('; ') + '.');
    if (Object.keys(pg).length) L.push('Production grades: ' + Object.keys(pg).map(k => `${name(cfg && cfg.production, k)} ${gw(pg[k])}${pr[k] ? ' (' + pr[k] + ')' : ''}`).join('; ') + '.');
    const gl = Array.isArray(gates) ? gates : Object.entries(gates).map(([k, v]) => { const label = (cfg && cfg.gates || []).find(g => g.replace(/[^a-zA-Z0-9]/g, '') === k) || k; return `${label}: ${v}`; });
    if (gl.length) L.push('Character gates: ' + gl.join('; ') + '.');
    const pr2 = raw.prompts || {};
    Object.keys(pr2).forEach(k => { if (pr2[k]) L.push(`Scout on "${k}": ${pr2[k]}`); });
    if (r.narrative) L.push(`Scout narrative: ${r.narrative}`);
  });

  assessments.forEach(a => {
    const sd = a.score_detail || {};
    L.push(`\nATHLETE ASSESSMENT (${a.kind}), completed ${a.completed || ''}. Football IQ assessment: ${a.score_pct != null ? a.score_pct + '%' : 'n/a'}${sd.correct != null ? ` (${sd.correct} of ${sd.total})` : ''}.`);
    if (sd.diagnosis) {
      if (sd.diagnosis.categories) L.push('By category: ' + sd.diagnosis.categories.map(c => `${c.name} ${c.correct}/${c.total}`).join('; ') + '.');
      if (sd.diagnosis.summary) L.push('Assessment summary: ' + sd.diagnosis.summary);
    }
    if (sd.mbti && sd.mbti.type) {
      const t = explainType(sd.mbti.type);
      L.push(`Personality inventory: ${sd.mbti.type}${t ? ` (${t.name}). ${t.line} Coaching note: ${t.coach[0]}.` : '.'}`);
    }
    const ans = a.answers || {};
    const written = Object.keys(ans).filter(k => typeof ans[k] === 'string' && ans[k].trim().length > 20 && !k.startsWith('dot_') && !k.startsWith('clip_') && k !== '_consent');
    if (written.length) L.push('In his own words: ' + written.slice(0, 5).map(k => `[${k.replace(/_/g, ' ')}] ${ans[k].trim()}`).join(' | '));
  });
  return L.join('\n');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return fail(405, 'POST only');
  const sql = neon(process.env.DATABASE_URL);
  let body = {}; try { body = JSON.parse(event.body || '{}'); } catch (e) { return fail(400, 'Bad JSON'); }
  const id = parseInt(body.id, 10), code = String(body.code || '').trim().toUpperCase();
  if (!id) return fail(400, 'id required');

  /* same gate as the full profile */
  let allowed = false;
  if (code) {
    try { const [pg] = await sql`SELECT 1 FROM programs WHERE upper(access_code) = ${code} AND COALESCE(active, true) LIMIT 1`; if (pg) allowed = true; } catch (e) {}
    if (!allowed) { try { const [sc] = await sql`SELECT 1 FROM scouts WHERE upper(access_code) = ${code} AND COALESCE(active, true) LIMIT 1`; if (sc) allowed = true; } catch (e) {} }
  }
  if (!allowed) return fail(403, 'A valid access code is required');

  const [p] = await sql`SELECT id, name, school, position, class_year, level, height, weight FROM prospects WHERE id = ${id}`;
  if (!p) return fail(404, 'Not found');
  const reports = await sql`SELECT r.*, (SELECT sc.played FROM scouts sc WHERE sc.scout_id = r.scout_id LIMIT 1) AS scout_played FROM reports r WHERE r.prospect_id = ${id} ORDER BY r.created_at DESC`;
  const assessments = await sql`SELECT kind, score_pct, score_detail, answers, to_char(completed_at,'YYYY-MM-DD') AS completed FROM assessments WHERE prospect_id = ${id} AND status = 'complete' ORDER BY completed_at DESC`;
  let offers = [];
  try { offers = await sql`SELECT COALESCE(pg.short_name, o.school_other, o.school_key) AS school FROM prospect_offers o LEFT JOIN programs pg ON pg.school_key = o.school_key WHERE o.prospect_id = ${id}`; } catch (e) {}
  if (!reports.length && !assessments.length) return ok({ text: null, reason: 'Nothing on file to summarize yet.' });

  const text = dossier(p, reports, assessments, offers);
  const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 32);

  await sql`CREATE TABLE IF NOT EXISTS prospect_synopses (
    id SERIAL PRIMARY KEY, prospect_id INTEGER NOT NULL, input_hash TEXT NOT NULL, text TEXT NOT NULL,
    model TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (prospect_id, input_hash))`;
  const [cached] = await sql`SELECT text, created_at FROM prospect_synopses WHERE prospect_id = ${id} AND input_hash = ${hash} LIMIT 1`;
  if (cached && !body.regenerate) return ok({ text: cached.text, cached: true, generatedAt: cached.created_at });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fail(503, 'Synopsis not configured: ANTHROPIC_API_KEY is not set in Netlify.');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  let out = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 600, system: SYSTEM,
        messages: [{ role: 'user', content: 'Write the synopsis from this file and nothing else.\n\n' + text }] })
    });
    const data = await res.json();
    if (!res.ok) return fail(502, 'Synopsis failed: ' + (data && data.error && data.error.message || res.status));
    out = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
  } catch (e) { return fail(502, 'Synopsis failed: ' + e.message); }
  if (!out) return fail(502, 'Synopsis came back empty');

  try { await sql`INSERT INTO prospect_synopses (prospect_id, input_hash, text, model) VALUES (${id}, ${hash}, ${out}, ${model}) ON CONFLICT (prospect_id, input_hash) DO UPDATE SET text = EXCLUDED.text, model = EXCLUDED.model, created_at = now()`; } catch (e) {}
  return ok({ text: out, cached: false, generatedAt: new Date().toISOString() });
};
