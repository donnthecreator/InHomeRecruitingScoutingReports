/* =====================================================================
   player.js
   GET /.netlify/functions/player?id=<prospectId>
   GET /.netlify/functions/player?name=<name>&school=<school>

   Public, CORS-open: one prospect's profile for the coach portal.
   Bio, verified measurables, photo and logo, every report on him,
   his performance-log games, completed assessments (scores and the
   diagnosis, never the raw interview text), and which boards he is on.
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const { explain: explainType } = require('./lib/mbti-locker');
const { bank, scenariosFor, groupFor, CLIP_OPTIONS_DEFAULT } = require('./lib/assessment-banks');
const { POSITIONS, GRADE_LABELS } = require('./lib/positions');

/* Same math as the report builder and the coach portal. Kept here so the
   profile page renders numbers it did not compute itself. */
function scoreReport(raw, footballIQ, storedScore) {
  const avg = (o) => { const v = Object.values(o || {}).map(Number).filter(n => !isNaN(n)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const filmAvg = avg(raw.traitGrades), athAvg = avg(raw.athleticGrades), prodAvg = avg(raw.productionGrades);
  const g = raw.gates || {}; const gv = Array.isArray(g) ? g : Object.values(g);
  const charScore = gv.length ? gv.map(x => x === 'pass' ? 100 : x === 'concern' ? 60 : 0).reduce((a, b) => a + b, 0) / gv.length : null;
  const filmScore = filmAvg != null ? filmAvg * 20 : 0, athScore = athAvg != null ? athAvg * 20 : 0, prodScore = prodAvg != null ? prodAvg * 20 : 0, cScore = charScore != null ? charScore : 0;
  const noGrades = filmAvg == null && athAvg == null && prodAvg == null;
  if (noGrades && storedScore != null) return { composite: Number(storedScore), filmScore: 0, athScore: 0, cScore: 0, prodScore: 0, ti: null, estimated: true };
  const composite = filmScore * 0.50 + athScore * 0.25 + cScore * 0.15 + prodScore * 0.10;
  const ti = (filmAvg != null && athAvg != null && athScore > 0 && footballIQ != null) ? (Number(footballIQ) * filmScore) / athScore : null;
  return { composite, filmScore, athScore, cScore, prodScore, ti, estimated: false };
}

/* Defender codes from the field-diagram reads, in words a coach reads
   without decoding. Unknown codes fall through unchanged. */
const DEF_WORDS = { NB: 'Nickel', SS: 'Strong safety', FS: 'Free safety', M: 'Mike', W: 'Will', S: 'Sam',
  CB: 'Corner', LCB: 'Left corner', RCB: 'Right corner', WE: 'Weak end', SE: 'Strong end', NT: 'Nose',
  DT: 'Tackle', DT3: 'Three-tech', DE: 'End', J: 'Jack', R: 'Rover', D: 'Dime' };
const defWord = (v) => { const k = String(v || '').toUpperCase(); return DEF_WORDS[k] || v; };

/* A stored result row may predate the scorer saving option text next to
   the index. Rebuild a lookup of every question's options from the live
   bank, the field reads and the clip table, keyed the way the scorer keys
   them, so an old row still renders as words. */
async function optionLookup(kind, position) {
  const map = {};
  try { bank(kind, position, { all: true }).forEach(sec => (sec.items || []).forEach(it => { if (it.options) map[it.id] = it.options; })); } catch (e) {}
  try { scenariosFor(groupFor(position), { all: true }).forEach(sc => { if (sc.mode === 'choice' && sc.options) map['dot_' + sc.id] = sc.options; }); } catch (e) {}
  try {
    const rows = await sql`SELECT id, options FROM iq_clips`;
    rows.forEach(c => { map['clip_' + c.id] = (c.options && c.options.length) ? c.options : CLIP_OPTIONS_DEFAULT; });
  } catch (e) {}
  return map;
}
/* Turn a stored value into what the coach should read. */
function showValue(v, options, isTap) {
  if (v === null || v === undefined || v === '') return 'No answer';
  if (isTap) return defWord(String(v).replace(/^tapped\s+/i, ''));
  if (Array.isArray(options)) {
    const i = Number(v);
    if (Number.isInteger(i) && options[i] !== undefined) return options[i];
  }
  return String(v);
}
const { logoMap, schoolKey } = require('./lib/logos');
const sql = neon(process.env.DATABASE_URL);
const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  try {
    /* columns added by later features; harmless if they already exist */
    try {
      await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS verifications JSONB NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS hudl_link TEXT`;
      await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS milesplit_link TEXT`;
      await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS x_link TEXT`;
      await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS ig_link TEXT`;
    } catch (e) {}

    const h = event.headers || {};
    const base = `${h['x-forwarded-proto'] || 'https'}://${h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com'}`;
    const qs = event.queryStringParameters || {};
    let p = null;
    if (qs.id) [p] = await sql`SELECT * FROM prospects WHERE id = ${parseInt(qs.id, 10)}`;
    else if (qs.name) {
      const nk = String(qs.name).toLowerCase().replace(/[^a-z]/g, '');
      const rows = await sql`SELECT * FROM prospects WHERE name_key = ${nk} ORDER BY (COALESCE(school,'') = ${qs.school || ''}) DESC, id DESC LIMIT 1`;
      p = rows[0] || null;
    }
    if (!p) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Player not found' }) };

    const logos = await logoMap(sql, base);
    const reports = await sql`SELECT id, scout_name, scout_role, scout_id, inhome_score, recommendation_tier, archetype, position, date_evaluated, created_at, narrative,
                 raw, film_grades, athletic_grades, athletic_raw, production_grades, production_raw, gates, interview_data, track, football_iq, height, weight, film_link, eval_camp,
                 (SELECT sc.played FROM scouts sc WHERE sc.scout_id = reports.scout_id LIMIT 1) AS scout_played
                              FROM reports WHERE prospect_id = ${p.id} ORDER BY created_at DESC`;
    let games = [];
    try {
      games = await sql`SELECT to_char(performance_date,'YYYY-MM-DD') AS date, stat_line, grade, source_link, school, level
                        FROM player_performances WHERE lower(regexp_replace(name,'[^A-Za-z]','','g')) = ${p.name_key} ORDER BY performance_date DESC NULLS LAST LIMIT 30`;
    } catch (e) {}
    /* Two profiles from one link.
       Soft: identity, InHome Score and tier, offers, commitment, film. What
       a link can carry when anyone might open it.
       Full: the scouting reports, the assessment question by question, his
       written answers and the personality read. Unlocked only with a live
       program access code, the same one a staff uses for the portal, so
       it opens for a program we issued a code to and nobody else, and we
       know which program opened it. */
    let full = false, viewer = null;
    if (qs.code) {
      const code = String(qs.code).trim().toUpperCase();
      /* a program's code, or an InHome scout's own code: both open the full
         profile, and viewer says which so the page can name it */
      try {
        const [pg] = await sql`SELECT short_name, name, division FROM programs WHERE upper(access_code) = ${code} AND COALESCE(active, true) LIMIT 1`;
        if (pg) { full = true; viewer = { kind: 'program', program: pg.short_name || pg.name, division: pg.division || null }; }
      } catch (e) {}
      if (!full) {
        try {
          const [sc] = await sql`SELECT name, role FROM scouts WHERE upper(access_code) = ${code} AND COALESCE(active, true) LIMIT 1`;
          if (sc) { full = true; viewer = { kind: 'scout', scout: sc.name, role: sc.role || null }; }
        } catch (e) {}
      }
    }

    let assessments = [];
    try {
      const rows = await sql`SELECT kind, score_pct, score_detail, answers, to_char(completed_at,'YYYY-MM-DD') AS completed FROM assessments WHERE prospect_id = ${p.id} AND status = 'complete' ORDER BY completed_at DESC`;
      const lookup = full ? await optionLookup('full', p.position) : {};
      assessments = rows.map(a => {
        const sd = a.score_detail || {};
        const mbti = sd.mbti ? sd.mbti.type : null;
        const out = { kind: a.kind, pct: a.score_pct != null ? Number(a.score_pct) : null, completed: a.completed,
          diagnosis: sd.diagnosis || null, mbti,
          /* the type explained for a coach, on every profile that has one */
          personality: mbti ? explainType(mbti) : null };
        if (full) {
          out.detail = Array.isArray(sd.detail) ? sd.detail.map(d => {
            const opts = d.options || lookup[d.id] || null;
            const isTap = !!d.dots && !opts;
            return { id: d.id, q: d.q, correct: !!d.correct, why: d.why || null, clip: !!d.clip, dots: !!d.dots,
                     given: showValue(d.given, opts, isTap), answer: showValue(d.answer, opts, isTap) };
          }) : [];
          out.correct = sd.correct != null ? sd.correct : null;
          out.total = sd.total != null ? sd.total : null;
          /* written answers: anything the athlete typed, keyed by question id */
          const ans = a.answers || {};
          const qtext = {}, qsec = {}, qopts = {};
          try { bank(a.kind, p.position, { all: true }).forEach(sec => (sec.items || []).forEach(it => {
            qtext[it.id] = it.q; qsec[it.id] = sec.section || sec.title || null; if (it.options) qopts[it.id] = it.options;
          })); } catch (e) {}
          /* Seventeen interview items offer choices but have no right answer,
             so they never reach the scored list. They are stored as the option
             index; resolve each to its text or the coach reads a bare number. */
          const readable = (k) => {
            const v = ans[k];
            if (qopts[k]) { const i = Number(v); if (Number.isInteger(i) && qopts[k][i] !== undefined) return qopts[k][i]; }
            return typeof v === 'string' ? v : String(v);
          };
          out.written = Object.keys(ans)
            .filter(k => qtext[k] && !k.startsWith('dot_') && !k.startsWith('clip_') && k !== '_consent'
                      && ans[k] !== null && ans[k] !== undefined && String(ans[k]).trim() !== '')
            .map(k => ({ id: k, section: qsec[k], q: qtext[k], text: readable(k), choice: !!qopts[k] }));

          /* NIL and money, pulled out of the interview into its own read. */
          const NIL_IDS = ['motiv_rank','motiv_second','nil_open','nil_tradeoff','money_advice','agent_has','agent_who','agent_role'];
          const nil = NIL_IDS.filter(k => qtext[k] && ans[k] !== undefined && ans[k] !== null && String(ans[k]).trim() !== '')
                              .map(k => ({ id: k, q: qtext[k], text: readable(k), choice: !!qopts[k] }));
          if (nil.length) {
            const money1 = (ans.motiv_rank !== undefined && qopts.motiv_rank) ? qopts.motiv_rank[Number(ans.motiv_rank)] : null;
            const money2 = (ans.motiv_second !== undefined && qopts.motiv_second) ? qopts.motiv_second[Number(ans.motiv_second)] : null;
            const lean = (ans.nil_tradeoff !== undefined && qopts.nil_tradeoff) ? qopts.nil_tradeoff[Number(ans.nil_tradeoff)] : null;
            const rep = (ans.agent_has !== undefined && qopts.agent_has) ? qopts.agent_has[Number(ans.agent_has)] : null;
            out.nil = {
              items: nil,
              /* headline reads, so a staff gets it without reading the block */
              moneyIsTopPriority: /NIL and what I can earn/i.test(String(money1 || '')),
              moneyInTopTwo: /NIL and what I can earn/i.test(String(money1 || '') + ' ' + String(money2 || '')),
              firstPriority: money1, secondPriority: money2, tradeoff: lean, representation: rep,
              hasRepresentation: !!(rep && !/^No, nobody$/i.test(rep))
            };
          }
        }
        return out;
      });
    } catch (e) {}
    let offers = [], notes = [];
    try {
      offers = (await sql`SELECT o.id, o.school_key, o.school_other, to_char(o.offer_date,'YYYY-MM-DD') AS offer_date, o.status, o.note,
                                 prog.short_name AS school_name, prog.espn_logo_id, prog.primary_color, prog.conference
                          FROM prospect_offers o LEFT JOIN programs prog ON prog.school_key = o.school_key WHERE o.prospect_id = ${p.id} ORDER BY o.offer_date DESC NULLS LAST`)
        .map(o => ({ id: o.id, school: o.school_name || o.school_other || o.school_key, status: o.status, date: o.offer_date, note: o.note,
                     /* Logo and colour so the coach view can render a crest rather
                        than a comma-separated list of school names. An offer from a
                        school not in the programs table has neither; the front end
                        falls back to a coloured initial. */
                     logoUrl: o.espn_logo_id ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${o.espn_logo_id}.png` : null,
                     color: o.primary_color || null, conference: o.conference || null }));
    } catch (e) {}
    try {
      notes = (await sql`SELECT id, kind, body, author, to_char(note_date,'YYYY-MM-DD') AS note_date, to_char(created_at,'YYYY-MM-DD') AS created_day
                         FROM prospect_notes WHERE prospect_id = ${p.id} AND visible_to_coaches = true ORDER BY created_at DESC`)
        .map(n => ({ id: n.id, kind: n.kind, body: n.body, author: n.author, date: n.note_date || n.created_day }));
    } catch (e) {}
    /* Crest for the school he is committed to, same treatment as offers. */
    let commitProg = null;
    if (p.committed_to) {
      try {
        [commitProg] = await sql`SELECT short_name, espn_logo_id, primary_color FROM programs WHERE school_key = ${p.committed_to}`;
      } catch (e) {}
    }
    let boards = [];
    try { boards = (await sql`SELECT upper(program_code) AS code FROM program_prospects WHERE prospect_id = ${p.id}`).map(r => r.code); } catch (e) {}

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({
      id: p.id, name: p.name, school: p.school, position: p.position, positionLabel: p.position_label, classYear: p.class_year, level: p.level,
      homeCity: p.home_city, homeState: p.home_state, height: p.height, weight: p.weight, wingspan: p.wingspan, filmLink: p.film_link,
      hudlLink: p.hudl_link || null, milesplitLink: p.milesplit_link || null, xLink: p.x_link || null, igLink: p.ig_link || null,
      verifications: p.verifications || {},
      headshotUrl: p.headshot_key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(p.headshot_key)}` : null,
      wingspanUrl: p.wingspan_key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(p.wingspan_key)}` : null,
      logoUrl: logos[schoolKey(p.school)] || null,
      boards, offers, fullProfile: full,
      commitment: p.commit_status ? { status: p.commit_status,
        to: (commitProg && commitProg.short_name) || p.committed_to || p.committed_to_other || null,
        date: p.commit_date || null,
        logoUrl: (commitProg && commitProg.espn_logo_id) ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${commitProg.espn_logo_id}.png` : null,
        color: (commitProg && commitProg.primary_color) || null } : null,
      /* Soft profile gets one anonymous row carrying the best score and
         tier; the full profile gets every report with the scout's name,
         role and playing background. */
      reports: full
        ? reports.map(r => {
            const rw = r.raw || {};
            const raw = {
              traitGrades: rw.traitGrades || r.film_grades || {}, athleticGrades: rw.athleticGrades || r.athletic_grades || {},
              athleticRaw: rw.athleticRaw || r.athletic_raw || {}, productionGrades: rw.productionGrades || r.production_grades || {},
              productionRaw: rw.productionRaw || r.production_raw || {}, gates: rw.gates || r.gates || {},
              interview: rw.interview || r.interview_data || {}, track: rw.track || r.track || null, prompts: rw.prompts || {}
            };
            const sc = scoreReport(raw, r.football_iq, r.inhome_score);
            return { id: r.id, scoutName: r.scout_name, scoutRole: r.scout_role, scoutPlayed: r.scout_played || null,
              score: r.inhome_score != null ? Number(r.inhome_score) : (sc.composite != null ? Math.round(sc.composite * 10) / 10 : null),
              tier: r.recommendation_tier, archetype: r.archetype, position: r.position,
              date: r.date_evaluated || (r.created_at ? String(r.created_at).slice(0, 10) : null), narrative: r.narrative,
              footballIQ: r.football_iq != null ? Number(r.football_iq) : null, height: r.height, weight: r.weight, filmLink: r.film_link,
              evalCamp: r.eval_camp,
              breakdown: { film: sc.filmScore, athletic: sc.athScore, character: sc.cScore, production: sc.prodScore, ti: sc.ti, estimated: sc.estimated },
              raw, config: POSITIONS[r.position] || null, gradeLabels: GRADE_LABELS };
          })
        : (() => {
            const best = reports.reduce((a, r) => (Number(r.inhome_score) || 0) > (Number(a && a.inhome_score) || 0) ? r : a, null);
            return best ? [{ score: best.inhome_score != null ? Number(best.inhome_score) : null, tier: best.recommendation_tier }] : [];
          })(),
      games: full ? games.map(g => ({ date: g.date, statLine: g.stat_line, grade: g.grade != null ? Number(g.grade) : null, link: g.source_link })) : [],
      notes: full ? notes : [],
      assessments: full ? assessments : [],
      viewer
    }) };
  } catch (err) {
    console.error('player error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
