/* =====================================================================
   import-boxscore.js
   POST /.netlify/functions/import-boxscore   (admin token)
   body: { text }   -- text layer of a PrestoSports "Official Football
                       Box Score" PDF (the admin page extracts it with
                       pdf.js), or the monospace box score page text.

   Returns every player with production, one candidate performance each:
     { name, team, level, position, statLine, grade, metrics, selected }
   grade is an efficiency-based SUGGESTION (0-100) built from the stat
   line, meant to be edited by a human before it is logged. The formula
   is deliberately simple and printed in `why` so it can be argued with.

   Nothing is written to the database here; the admin page logs the
   rows the user ticks through the normal createPerformance action.

   ENV: ADMIN_SECRET
===================================================================== */
const crypto = require('crypto');
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const fail = (c, m) => ({ statusCode: c, headers: JSON_HEADERS, body: JSON.stringify({ error: m }) });

function verifyAdmin(event) {
  const secret = process.env.ADMIN_SECRET; if (!secret) return false;
  const header = event.headers.authorization || event.headers.Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !Number(exp) || Date.now() > Number(exp)) return false;
  const expected = crypto.createHmac('sha256', secret).update(exp).digest('hex');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- table definitions: header signature -> columns ---------- */
const TABLES = [
  { kind: 'pass', head: ['Player', 'Att', 'Cmp', 'Int', 'Yds', 'TD', 'Lg'], cols: ['att', 'cmp', 'int', 'yds', 'td', 'lg'] },
  { kind: 'rush', head: ['Player', 'Att', 'Yds', 'Avg', 'TD', 'Lg'], cols: ['att', 'yds', 'avg', 'td', 'lg'] },
  { kind: 'rcv',  head: ['Player', 'No', 'Yds', 'Avg', 'TD', 'Lg'], cols: ['no', 'yds', 'avg', 'td', 'lg'] },
  { kind: 'kick', head: ['Player', 'FGA', 'FGM', 'Lg', 'PAT-A', 'PAT-M'], cols: ['fga', 'fgm', 'lg', 'pata', 'patm'] },
  { kind: 'def',  head: ['Player', 'Solo', 'Ast', 'Total', 'TFL', 'Sacks', 'PD'], cols: ['solo', 'ast', 'total', 'x1', 'x2', 'x3'] },
  { kind: 'sack', head: ['Player', 'Solo', 'Ast', 'Total', 'Yds'], cols: ['solo', 'ast', 'total', 'yds'] },
  { kind: 'int',  head: ['Player', 'No', 'Yds', 'TD', 'Lg'], cols: ['no', 'yds', 'td', 'lg'] },
  { kind: 'fum',  head: ['Player', 'No', 'Lost'], cols: ['no', 'lost'] }
];
const isNum = (t) => /^-?\d+(\.\d+)?$/.test(t);
const isJersey = (t) => /^\d{1,2}[A-Z]?$/.test(t);
const cleanTeam = (t) => String(t || '').replace(/^No\.\s*\d+\s*/i, '').replace(/\s+/g, ' ').trim();

/* Split the whole text into tokens but keep line breaks as a token so
   we can find headers and team names, which are always on their own line. */
/* pdf.js emits ligatures as separate runs: "Hu ff", "Je ff erson", "Ru ffi n".
   Stitch them back before any parsing so names come through intact. */
function mendLigatures(text) {
  return String(text)
    .replace(/([A-Za-z])\s+(ffi|ffl|ff|fi|fl)\s+([a-z])/g, '$1$2$3')   // Je ff erson -> Jefferson
    .replace(/([A-Za-z])\s+(ffi|ffl|ff|fi|fl)(?=[\s,;.]|$)/g, '$1$2');    // Hu ff -> Huff
}

/* Roster block: "DB 0 Samuel Watkins", "LB 17 Tyler Jenkins", "WR 7OMichael Moore".
   Gives real positions to players the stat tables can only call "DEF". */
const POS_CODES = 'QB|RB|FB|WR|TE|OL|OG|OT|C|DB|CB|S|SS|FS|NB|LB|ILB|OLB|DL|DE|DT|NG|NT|EDGE|K|P|LS|ATH';
function rosterPositions(text) {
  const map = {};
  /* Two rosters often share a line ("WR 1 Waymond Jenerette Jr WR 1 Jeremiah Thomas"),
     so match repeatedly and stop the name before the next position code. */
  const tok = '(?!(?:' + POS_CODES + ')\\b)[A-Z][A-Za-z\'’.\\-]+';
  const re = new RegExp('\\b(' + POS_CODES + ')\\s+(\\d{1,2})\\s*[A-Z]?\\s+(' + tok + '(?:\\s+' + tok + '){0,3})', 'g');
  String(text).split('\n').forEach(line => {
    if (!/\b(OFFENSE|DEFENSE)\b/.test(line) && !/^\s*(?:[A-Z]{1,4}\s+\d{1,2}[A-Z]?\s+[A-Z])/.test(line)) return;
    let m;
    while ((m = re.exec(line))) {
      const key = m[3].toLowerCase().replace(/[^a-z]/g, '');
      if (key.length >= 4 && !map[key]) map[key] = m[1].toUpperCase();
    }
  });
  return map;
}
const DEF_GROUP = (pos) => /^(DB|CB|S|SS|FS|NB)$/.test(pos) ? 'DB' : /^(LB|ILB|OLB)$/.test(pos) ? 'LB' : /^(DL|DE|DT|NG|NT|EDGE)$/.test(pos) ? 'DL' : null;

function parseText(text) {
  text = mendLigatures(text);
  const roster = rosterPositions(text);
  const out = looksNarrative(text) ? (() => { const { date, teams, playerMap } = parseNarrative(text); return { date, teams, players: summarize(playerMap) }; })() : parseColumns(text);
  out.players.forEach(p => {
    const rp = roster[String(p.name).toLowerCase().replace(/[^a-z]/g, '')];
    if (rp && (p.position === 'DEF' || p.position === 'ATH' || (p.position === 'WR' && /^(RB|TE|FB)$/.test(rp)) || (p.position === 'RB' && /^(WR|TE|QB)$/.test(rp)))) p.position = rp;
    /* re-grade defenders now that we know their group */
    if (p.metrics && p.metrics.def) { const g = suggestGrade(p.position, p.metrics); p.grade = g.grade; p.why = g.why; }
  });
  out.players.sort((a, b) => (b.selected - a.selected) || (b.grade - a.grade));
  return out;
}

function parseTextLegacy(text) {
  text = mendLigatures(text);
  if (looksNarrative(text)) {
    const { date, teams, playerMap } = parseNarrative(text);
    return { date, teams, players: summarize(playerMap) };
  }
  return parseColumns(text);
}

function parseColumns(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  /* game meta */
  let date = null, teams = [];
  for (const l of lines) {
    const m = l.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (m && !date) date = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  const vsLine = lines.find(l => /\bvs\.?\s/i.test(l) && !/print version/i.test(l) && !/http/i.test(l));
  if (vsLine) {
    const mm = vsLine.match(/^(.*?)\s+vs\.?\s+(.*?)$/i);
    if (mm) teams = [cleanTeam(mm[1]), cleanTeam(mm[2])];
  }

  /* walk lines: a header line starts a table; the line before it is the team */
  const players = new Map(); // key -> record
  const rec = (team, name) => {
    const k = team + '|' + name.toLowerCase();
    if (!players.has(k)) players.set(k, { name, team, pass: null, rush: null, rcv: null, kick: null, def: null, sack: null, int: null, fum: null });
    return players.get(k);
  };

  const isHeader = (l) => TABLES.find(t => { const lt = l.split(' '); return t.head.length === lt.length && t.head.every((h, j) => h === lt[j]); });
  const SECTION = /^(Individual|Passing|Rushing|Receiving|Kicking|Tackles|Sacks|Interceptions|Fumbles|Statistics|Official|Score by|Team Statistics)/;
  const BANNER = /Print Version|\bvs\.?\s|Athletics|https?:|Page \d+ of|PrestoSports|informational purposes|official verification/i;
  const SCHOOLY = /\b(College|CC|JC|University|Univ|High|School|HS|Academy|Prep|State|Tech|Institute)\b|^No\.\s*\d+/i;
  const looksLikeTeam = (l) => {
    const lt = l.split(' ');
    if (isHeader(l) || /^Totals\b/.test(l) || /^None\.?$/.test(l) || BANNER.test(l) || /^@@COL/.test(l)) return false;
    /* a two-word capitalized line with no school word is a wrapped player name, not a team */
    if (!SCHOOLY.test(l) && !(teams.length && teams.some(t => t && l.includes(t)))) return false;
    if (isNum(lt[lt.length - 1])) return false;              // rows end in numbers
    if (/^(Individual|Passing|Rushing|Receiving|Kicking|Tackles|Sacks|Interceptions|Fumbles|Statistics|Official)/.test(l)) return false;
    return /[A-Za-z]{3,}/.test(l);
  };

  /* "@@COL L" / "@@COL R" markers come from the PDF column splitter so a
     table whose team banner sits on the previous page still gets the
     right team: we remember the last team seen in that column. */
  const lastTeam = { L: '', R: '' };
  let col = 'L';
  let i = 0;
  while (i < lines.length) {
    const mk = lines[i].match(/^@@COL ([LR])$/);
    if (mk) { col = mk[1]; i++; continue; }
    const tdef = isHeader(lines[i]);
    if (!tdef) {
      if (looksLikeTeam(lines[i]) && !/^\d{1,2}[A-Z]?\s/.test(lines[i])) {
        const t = cleanTeam(lines[i]);
        /* a merged "Team A No. 13 Team B" line is a two-column banner; take the side we're on */
        const two = t.match(/^(.*?)\s+(No\.\s*\d+\s+)?([A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*)*\s+(?:CC|Community College|College|University|HS|High School))$/);
        lastTeam[col] = two && /\bCC\b|College/.test(two[1]) ? cleanTeam(col === 'L' ? two[1] : two[3]) : t;
      }
      i++; continue;
    }
    let team = '';
    for (let b = i - 1; b >= 0 && b >= i - 4; b--) {
      if (/^@@COL/.test(lines[b])) break;
      if (looksLikeTeam(lines[b])) { team = cleanTeam(lines[b].replace(/^\d{1,2}\s+/, '')); break; }
    }
    if (!team || / vs /i.test(team)) team = lastTeam[col] || '';
    else lastTeam[col] = team;
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (/^Totals\b/.test(l) || /^None\.?$/.test(l)) { i++; break; }
      if (isHeader(l)) break;
      if (/^@@COL/.test(l)) break;
      if (BANNER.test(l) || SECTION.test(l)) { i++; continue; }
      if (looksLikeTeam(l) && !/^\d{1,2}[A-Z]?\s/.test(l)) break;     // next team block without a header yet
      i++;
      const lt = l.split(' ');
      if (lt.every(isNum)) continue;                             // totals row that lost its label
      let p = 0;
      if (isJersey(lt[0]) && lt.length > 1 && !isNum(lt[1])) p = 1; // optional jersey
      const nameT = [];
      while (p < lt.length && !isNum(lt[p])) nameT.push(lt[p++]);
      const nums = [];
      while (p < lt.length && isNum(lt[p])) nums.push(parseFloat(lt[p++]));
      const tail = lt.slice(p).filter(t => !isNum(t) && !SECTION.test(t)); // wrapped last name after the numbers (drop glued section titles)
      let name = nameT.join(' ');
      if (tail.length) name = (name.endsWith('-') ? name + tail.join(' ') : name + ' ' + tail.join(' '));
      name = name.replace(/\s+/g, ' ').trim();
      if (!name || !nums.length || !/[A-Za-z]{2,}/.test(name)) continue;
      const r = rec(team, name);
      const stat = {};
      if (tdef.kind === 'def') {
        stat.solo = nums[0] || 0; stat.ast = nums[1] || 0; stat.total = nums[2] != null ? nums[2] : stat.solo + stat.ast;
        stat.extra = nums.slice(3);
      } else {
        tdef.cols.forEach((c, j) => { stat[c] = nums[j] != null ? nums[j] : null; });
      }
      r[tdef.kind] = stat;
    }
  }

  return { date, teams, players: summarize(players) };
}

/* Shared: turn per-player raw stat objects into stat lines + grades. */
function summarize(players) {
  const out = [];
  for (const r of players.values()) {
    const m = {};
    let pos = null;
    const parts = [];
    if (r.pass && r.pass.att) {
      pos = 'QB';
      const cmp = r.pass.cmp || 0, att = r.pass.att || 0, yds = r.pass.yds || 0, td = r.pass.td || 0, int = r.pass.int || 0;
      m.pass = { cmp, att, yds, td, int, pct: att ? +(cmp / att * 100).toFixed(1) : 0, ypa: att ? +(yds / att).toFixed(1) : 0 };
      parts.push(`${cmp}/${att}, ${yds} pass yds, ${td} TD, ${int} INT (${m.pass.ypa} ypa)`);
    }
    if (r.rush && r.rush.att) {
      const att = r.rush.att, yds = r.rush.yds || 0, td = r.rush.td || 0, ypc = att ? +(yds / att).toFixed(1) : 0;
      m.rush = { att, yds, td, ypc, lg: r.rush.lg || null };
      if (!pos) pos = 'RB';
      parts.push(`${att} car, ${yds} yds, ${ypc} ypc${td ? ', ' + td + ' TD' : ''}${r.rush.lg ? ', long ' + r.rush.lg : ''}`);
    }
    if (r.rcv && r.rcv.no) {
      const no = r.rcv.no, yds = r.rcv.yds || 0, td = r.rcv.td || 0, ypr = no ? +(yds / no).toFixed(1) : 0;
      m.rcv = { no, yds, td, ypr, lg: r.rcv.lg || null };
      if (!pos || (pos === 'RB' && (m.rush ? yds > m.rush.yds : true))) pos = pos === 'RB' ? 'RB' : 'WR';
      parts.push(`${no} rec, ${yds} yds, ${ypr} ypr${td ? ', ' + td + ' TD' : ''}${r.rcv.lg ? ', long ' + r.rcv.lg : ''}`);
    }
    if (r.def && (r.def.total || r.def.solo)) {
      const sacks = r.sack ? ((r.sack.solo || 0) + (r.sack.ast || 0) * 0.5) || (r.sack.total || 0) : 0;
      const ints = r.int ? (r.int.no || 0) : 0;
      const extra = r.def.extra || [];
      /* extras: after removing what the sack table explains, the rest is TFL and/or PD */
      let tfl = 0, pd = 0, unknown = 0;
      const rest = extra.slice();
      if (sacks && rest.length) { const idx = rest.findIndex(v => v === sacks); if (idx >= 0) rest.splice(idx, 1); }
      if (rest.length === 1) { unknown = rest[0]; }
      else if (rest.length >= 2) { tfl = rest[0]; pd = rest[1]; }
      m.def = { solo: r.def.solo, ast: r.def.ast, total: r.def.total, tfl, sacks, pd, int: ints, unknown };
      if (!pos) pos = 'DEF';
      const bits = [`${r.def.total} tkl (${r.def.solo} solo)`];
      if (tfl) bits.push(`${tfl} TFL`);
      if (sacks) bits.push(`${sacks} sack${sacks === 1 ? '' : 's'}`);
      if (ints) bits.push(`${ints} INT`);
      if (pd) bits.push(`${pd} PD`);
      if (unknown) bits.push(`${unknown} TFL/PD`);
      parts.push(bits.join(', '));
    } else if (r.int && r.int.no) {
      m.def = { total: 0, int: r.int.no }; if (!pos) pos = 'DEF'; parts.push(`${r.int.no} INT`);
    }
    if (r.kick && (r.kick.fga || r.kick.pata)) {
      m.kick = { fga: r.kick.fga || 0, fgm: r.kick.fgm || 0, lg: r.kick.lg || 0, pata: r.kick.pata || 0, patm: r.kick.patm || 0 };
      if (!pos) pos = 'K';
      parts.push(`FG ${m.kick.fgm}/${m.kick.fga}${m.kick.lg ? ' (long ' + m.kick.lg + ')' : ''}, PAT ${m.kick.patm}/${m.kick.pata}`);
    }
    if (r.fum && r.fum.lost) parts.push(`${r.fum.lost} fumble${r.fum.lost === 1 ? '' : 's'} lost`);
    if (!parts.length) continue;

    const { grade, why } = suggestGrade(pos, m);
    const level = /community college|\bCC\b|juco|junior college/i.test(r.team) ? 'JUCO' : 'HS';
    out.push({ name: r.name, team: r.team, level, position: pos || 'ATH', statLine: parts.join(' | '), grade, why, metrics: m, selected: false });
  }
  /* Preselect the ones worth a human's time: top 3 per team in each stat
     category, plus anyone with a TD, a sack, or a pick. Everyone else is
     still returned but starts unticked and hidden behind "show all". */
  const cats = [
    ['rush', p => p.metrics.rush && p.metrics.rush.yds, 'top-3 rushing'],
    ['rcv',  p => p.metrics.rcv && p.metrics.rcv.yds, 'top-3 receiving'],
    ['pass', p => p.metrics.pass && p.metrics.pass.yds, 'top-3 passing'],
    ['def',  p => p.metrics.def && p.metrics.def.total, 'top-3 tackles']
  ];
  const teams = [...new Set(out.map(p => p.team))];
  out.forEach(p => { p.selected = false; p.reasons = []; });
  teams.forEach(t => {
    const mine = out.filter(p => p.team === t);
    cats.forEach(([key, val, label]) => {
      mine.filter(p => (val(p) || 0) > 0).sort((a, b) => val(b) - val(a)).slice(0, 3)
        .forEach(p => { p.selected = true; p.reasons.push(label); });
    });
    mine.forEach(p => {
      const m = p.metrics;
      const td = (m.rush && m.rush.td) || (m.rcv && m.rcv.td) || (m.pass && m.pass.td);
      if (td) { p.selected = true; p.reasons.push('touchdown'); }
      if (m.def && (m.def.sacks || m.def.int)) { p.selected = true; p.reasons.push(m.def.sacks ? 'sack' : 'interception'); }
    });
  });
  out.sort((a, b) => (b.selected - a.selected) || (b.grade - a.grade));
  return out;
}

/* Efficiency-first suggestion. Volume matters, but per-touch efficiency
   moves the number more than raw totals, which is what "efficiency" means
   to a coach reading a JUCO box score. Bounded 35-99. */
function suggestGrade(pos, m) {
  let g = null; const why = [];
  const clamp = (v) => Math.max(35, Math.min(99, v));
  const take = (v) => { g = g == null ? v : Math.max(g, v); };
  if (m.pass) {
    const p = m.pass;
    take(40 + p.pct * 0.3 + p.ypa * 2.5 + p.td * 5 - p.int * 8);
    why.push('QB: 40 + comp% x0.3 + ypa x2.5 + TD x5 - INT x8');
  }
  if (m.rush) {
    const r = m.rush;
    const eff = Math.max(-16, Math.min(16, (r.ypc - 4.0) * 4));   // 4.0 ypc neutral, capped either way
    const vol = Math.min(25, r.yds / 6);                            // 150 yds caps volume credit
    let rg = 45 + eff + vol + r.td * 5;
    if (m.pass) rg -= 10;                                            // QB scrambles count, but less
    if (r.att < 5) rg = Math.min(rg, 62);                            // tiny samples cannot post big grades
    take(rg);
    why.push('RB: 45 + (ypc-4) x4 [cap 16] + min(25, yds/6) + TD x5');
  }
  if (m.rcv) {
    const c = m.rcv;
    const eff = Math.max(-10, Math.min(15, (c.ypr - 10) * 1.0));   // 10 ypr neutral
    const vol = Math.min(25, c.yds / 5);                            // 125 yds caps
    let cg = 45 + eff + vol + c.no * 0.8 + c.td * 5;
    if (c.no < 3) cg = Math.min(cg, 72);                             // one-catch games stay modest
    take(cg);
    why.push('WR: 45 + (ypr-10) x1 [cap 15] + min(25, yds/5) + rec x0.8 + TD x5');
  }
  if (m.def) {
    const d = m.def;
    const grp = DEF_GROUP(pos) || 'LB';
    /* Tackles carry a linebacker; splash plays carry a corner or a rusher.
       Tackle credit is capped so a 15-tackle night on a bad defense does not
       outgrade a 2-sack night. */
    const tk = Math.min(12, d.total || 0);
    const wTk = grp === 'LB' ? 3.8 : grp === 'DB' ? 3.2 : 3.0;
    const wTfl = grp === 'DL' ? 7 : 6, wSack = grp === 'DL' ? 11 : 10;
    const wInt = grp === 'DB' ? 13 : 11, wPd = grp === 'DB' ? 5 : 4;
    take(40 + tk * wTk + (d.tfl || 0) * wTfl + (d.sacks || 0) * wSack + (d.int || 0) * wInt + (d.pd || 0) * wPd + (d.unknown || 0) * 4.5);
    why.push(`${grp}: 40 + tkl(max 12) x${wTk} + TFL x${wTfl} + sack x${wSack} + INT x${wInt} + PD x${wPd}`);
  }
  if (m.kick && g == null) {
    const k = m.kick;
    take(55 + k.fgm * 7 - (k.fga - k.fgm) * 6 + (k.lg >= 40 ? 5 : 0) + (k.patm === k.pata ? 3 : -6));
    why.push('K: 55 + FGM x7 - misses x6 + long>=40 +5 + perfect PAT +3');
  }
  return { grade: +clamp(g == null ? 50 : g).toFixed(1), why: why.join(' ; ') };
}

/* =====================================================================
   NARRATIVE FORMAT
   The other common NCAA/Presto layout, used by MGCCC among others:

     RUSHING: Team A - Name 17-82; Name 4-22. Team B - Name 18-181; ...
     PASSING: Team A - Name 29-20-0-296. ...
     TACKLES (UA-A): Team A - Name 3-1; Name 0-2. ...

   Everything is prose, wrapped across lines, both teams on one line.
   Per-player touchdowns are not in these lists at all, so they are
   recovered from the scoring summary above them.
===================================================================== */
const CATS = ['RUSHING', 'PASSING', 'RECEIVING', 'INTERCEPTIONS', 'FUMBLES', 'SACKS', 'TACKLES'];

function looksNarrative(text) {
  return /\bRUSHING:\s/.test(text) && /\bRECEIVING:\s/.test(text);
}

/* "Name 17-82" / "Name 29-20-0-296" / "Name 1--14" (negative yards) */
function parseEntry(chunk) {
  const m = String(chunk).trim().match(/^(.+?)\s+(\d+)-(-?\d+)(?:-(-?\d+))?(?:-(-?\d+))?\.?$/);
  if (!m) return null;
  const nums = [m[2], m[3], m[4], m[5]].filter(v => v !== undefined).map(Number);
  return { name: m[1].replace(/\s+/g, ' ').trim(), nums };
}

function parseNarrative(text) {
  const flat = String(text).replace(/\r/g, '').replace(/^@@COL [LR]$/gm, '')
    .replace(/(\d)-\s*\n\s*(\d)/g, '$1-$2')     // "26-13-0-\n99" -> "26-13-0-99"
    .replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/(\d)-\s+(\d)/g, '$1-$2').trim();

  /* teams + date from the "A vs. B (M/D/YYYY ...)" header */
  let teams = [], date = null;
  const hdr = flat.match(/([A-Z][^()]{3,80}?)\s+vs\.\s+([A-Z][^()]{3,80}?)\s*\((\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (hdr) {
    teams = [hdr[1].trim(), hdr[2].trim()];
    date = `${hdr[5]}-${String(hdr[3]).padStart(2, '0')}-${String(hdr[4]).padStart(2, '0')}`;
  } else {
    const d = flat.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (d) date = `${d[3]}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}`;
  }

  /* Stat lines often use the short school name ("East Central -") while
     the header uses the long one. The score box carries the short names;
     map short -> long so every row lands on the header team. */
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const teamAliases = teams.map(t => {
    const words = t.split(' ');
    const cands = [];
    for (let n = words.length - 1; n >= 1; n--) cands.push(words.slice(0, n).join(' '));
    /* keep a prefix only if it actually shows up as "Prefix - " in the text,
       and only if the other team's name doesn't also start with it */
    const others = teams.filter(o => o !== t);
    const aliases = cands.filter(c => c.length >= 4
      && new RegExp('\\b' + esc(c) + '\\s*[-\u2013\u2014]\\s+[A-Z]').test(flat)
      && !others.some(o => o.startsWith(c + ' ') || o === c));
    return [t, ...aliases];
  });

  const players = new Map();
  const rec = (team, name) => {
    const k = team + '|' + name.toLowerCase();
    if (!players.has(k)) players.set(k, { name, team, pass: null, rush: null, rcv: null, kick: null, def: null, sack: null, int: null, fum: null, td: {} });
    return players.get(k);
  };

  /* ---- touchdowns from the scoring summary ---- */
  const scoreZone = flat.split(/FIRST DOWNS/)[0];
  const tdRe = /([A-Z][A-Za-z'’.\- ]{2,60}?)\s+(\d{1,2})\s*yd\s+(run|pass|interception return|fumble return|punt return|kickof+ return)(?:\s+from\s+([A-Z][A-Za-z'’.\- ]{2,60}?))?\s*\./gi;
  /* Keyed by name only. Which team a scoring play belongs to is
     ambiguous in this layout, and a name collision across two rosters in
     one game is far less likely than mis-attributing the team. */
  const tdByName = new Map();
  const addTd = (name, kind) => {
    const k = String(name).toLowerCase().replace(/[^a-z]/g, '');
    if (!k) return;
    const e = tdByName.get(k) || { rush: 0, rcv: 0, pass: 0 };
    e[kind]++; tdByName.set(k, e);
  };
  let tm;
  while ((tm = tdRe.exec(scoreZone))) {
    const scorer = tm[1].replace(/^.*?\s-\s/, '').trim();
    const kind = tm[3].toLowerCase();
    const passer = tm[4] ? tm[4].trim() : null;
    if (kind === 'run') addTd(scorer, 'rush');
    else if (kind === 'pass') { addTd(scorer, 'rcv'); if (passer) addTd(passer, 'pass'); }
  }

  /* ---- category lists ---- */
  const catRe = new RegExp('\\b(' + CATS.join('|') + ')\\b[^:]{0,12}:\\s', 'g');
  const marks = [];
  let cm;
  while ((cm = catRe.exec(flat))) marks.push({ cat: cm[1], idx: cm.index, start: cm.index + cm[0].length });
  marks.forEach((mk, i) => {
    const body = flat.slice(mk.start, i + 1 < marks.length ? marks[i + 1].idx : undefined)
      .replace(/\s*(Game Starters|Score by Quarters)[\s\S]*$/i, '');
    /* split the body by team name (long or short form), any dash */
    const segs = [];
    const found = [];
    teamAliases.forEach(([long, ...aliases]) => {
      [long, ...aliases].forEach(alias => {
        const re = new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[-\u2013\u2014]\\s*', 'g');
        let mm; while ((mm = re.exec(body))) found.push({ t: long, i: mm.index, len: mm[0].length });
      });
    });
    found.sort((a, b) => a.i - b.i);
    /* a long name contains its short form; keep the earliest match at a position */
    const dedup = found.filter((f, k) => !found.some((g, j) => j !== k && g.i <= f.i && f.i < g.i + g.len && g.len > f.len));
    if (!dedup.length) segs.push({ team: teams[0] || '', body });
    else dedup.forEach((f, j) => {
      const from = f.i + f.len;
      const to = j + 1 < dedup.length ? dedup[j + 1].i : body.length;
      segs.push({ team: f.t, body: body.slice(from, to) });
    });

    segs.forEach(seg => {
      if (/^\s*None\b/i.test(seg.body)) return;
      seg.body.split(';').forEach(chunk => {
        const e = parseEntry(chunk.replace(/\.$/, ''));
        if (!e || !/[A-Za-z]{2,}/.test(e.name)) return;
        const r = rec(seg.team, e.name);
        const n = e.nums;
        switch (mk.cat) {
          case 'RUSHING':   r.rush = { att: n[0], yds: n[1], td: 0, lg: null }; break;
          case 'PASSING':   r.pass = { att: n[0], cmp: n[1], int: n[2] || 0, yds: n[3] != null ? n[3] : 0, td: 0 }; break;
          case 'RECEIVING': r.rcv  = { no: n[0], yds: n[1], td: 0, lg: null }; break;
          case 'TACKLES':   r.def  = { solo: n[0], ast: n[1], total: (n[0] || 0) + (n[1] || 0), extra: [] }; break;
          case 'SACKS':     r.sack = { solo: n[0], ast: n[1], total: (n[0] || 0) + (n[1] || 0) * 0.5 }; break;
          case 'INTERCEPTIONS': r.int = { no: n[0], yds: n[1] != null ? n[1] : 0 }; break;
          case 'FUMBLES':   r.fum = { no: n[0], lost: n[1] || 0 }; break;
        }
      });
    });
  });

  /* fold the touchdowns in */
  for (const r of players.values()) {
    const td = tdByName.get(String(r.name).toLowerCase().replace(/[^a-z]/g, ''));
    if (!td) continue;
    if (r.rush && td.rush) r.rush.td = td.rush;
    if (r.rcv && td.rcv) r.rcv.td = td.rcv;
    if (r.pass && td.pass) r.pass.td = td.pass;
    /* a scorer who never shows up in a stat list still gets credited */
    if (!r.rush && td.rush) r.rush = { att: 0, yds: 0, td: td.rush, lg: null };
  }
  return { date, teams, playerMap: players };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
  if (!verifyAdmin(event)) return fail(401, 'Unauthorized');
  let body; try { body = JSON.parse(event.body || '{}'); } catch { return fail(400, 'Bad request'); }
  const text = String(body.text || '');
  if (text.length < 200) return fail(400, 'No box score text found');
  try {
    const parsed = parseText(text);
    if (!parsed.players.length) return fail(422, 'Could not find any player tables. Is this a PrestoSports box score?');
    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(parsed) };
  } catch (err) {
    console.error('import-boxscore error:', err);
    return fail(500, err.message);
  }
};

exports._parseText = parseText;
