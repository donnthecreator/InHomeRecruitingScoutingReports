/* =====================================================================
   report-pdf.js
   GET /.netlify/functions/report-pdf?id=<reportId>&t=<shareSig>
   GET /.netlify/functions/report-pdf?id=<reportId>&code=<scoutAccessCode>
   GET ... with Authorization: Bearer <admin token>

   Builds the scouting report PDF on the server from the saved report,
   so phones never have to render it themselves (the old html2pdf path
   died on iOS). Same signature scheme as share-report.js, so any share
   link can also fetch its PDF. pdf-lib is pure JS with embedded
   standard fonts: no font files on disk, nothing for the bundler to
   miss.

   ENV: ADMIN_SECRET, DATABASE_URL
===================================================================== */
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const listReports = require('./list-reports');
const { frameStore } = require('./lib/blobs');

const sql = neon(process.env.DATABASE_URL);

/* ---------- auth: share signature, scout code, or admin token ---------- */
function shareSig(id) {
  return crypto.createHmac('sha256', process.env.ADMIN_SECRET).update('share:' + id).digest('hex').slice(0, 24);
}
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function verifyAdmin(event) {
  const secret = process.env.ADMIN_SECRET; if (!secret) return false;
  const header = event.headers.authorization || event.headers.Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !Number(exp) || Date.now() > Number(exp)) return false;
  return safeEq(sig, crypto.createHmac('sha256', secret).update(exp).digest('hex'));
}
async function verifyScoutCode(code) {
  if (!code) return false;
  const rows = await sql`SELECT scout_id FROM scouts WHERE upper(access_code) = ${String(code).trim().toUpperCase()} LIMIT 1`;
  return rows.length > 0;
}

/* ---------- position config for trait names ---------- */
const POSCFG = require('./lib/positions');
function loadPositions() { return POSCFG; }

/* ---------- tiny layout helpers ---------- */
const BLACK = rgb(0.04, 0.04, 0.04), WHITE = rgb(1, 1, 1), RED = rgb(1, 0, 0);
const INK = rgb(0.1, 0.1, 0.1), MUTE = rgb(0.42, 0.42, 0.42), LINE = rgb(0.85, 0.85, 0.85), FILL = rgb(0.95, 0.95, 0.95);

function wrap(font, size, text, maxW) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) <= maxW) cur = test;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
const clean = (s) => String(s == null ? '' : s).replace(/[^\x20-\x7E]/g, (c) => ({ '\u2014': '-', '\u2013': '-', '\u2019': "'", '\u201c': '"', '\u201d': '"', '\u00b7': '-' }[c] || ''));

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const id = parseInt(qs.id, 10);
  if (!id) return { statusCode: 400, body: 'id required' };

  const okSig = qs.t && process.env.ADMIN_SECRET && safeEq(qs.t, shareSig(id));
  const okAdmin = verifyAdmin(event);
  const okScout = !okSig && !okAdmin && await verifyScoutCode(qs.code);
  if (!okSig && !okAdmin && !okScout) return { statusCode: 403, body: 'Not authorized' };

  try {
    const res = await listReports.handler({ ...event, queryStringParameters: { id: String(id) } });
    const rows = JSON.parse(res.body || '[]');
    const r = Array.isArray(rows) ? rows[0] : null;
    if (!r) return { statusCode: 404, body: 'Report not found' };
    const raw = r.raw || {};
    const cfg = loadPositions().POSITIONS[(r.position || '').toUpperCase()] || null;
    const GRADE_LABELS = loadPositions().GRADE_LABELS;

    const pdf = await PDFDocument.create();
    const H = await pdf.embedFont(StandardFonts.HelveticaBold);
    const F = await pdf.embedFont(StandardFonts.Helvetica);
    const PW = 612, PH = 792, M = 44;
    let page = pdf.addPage([PW, PH]);
    let y = PH;

    const newPage = () => { page = pdf.addPage([PW, PH]); y = PH - M; };
    const need = (h) => { if (y - h < M + 30) newPage(); };
    const text = (s, x, size, font, color, opts = {}) => page.drawText(clean(s), { x, y, size, font, color, ...opts });

    /* ---- header band ---- */
    page.drawRectangle({ x: 0, y: PH - 56, width: PW, height: 56, color: BLACK });
    page.drawText('inh', { x: M, y: PH - 38, size: 22, font: H, color: WHITE });
    page.drawText('o', { x: M + H.widthOfTextAtSize('inh', 22), y: PH - 38, size: 22, font: H, color: RED });
    page.drawText('me', { x: M + H.widthOfTextAtSize('inho', 22), y: PH - 38, size: 22, font: H, color: WHITE });
    page.drawText('RECRUITING INTELLIGENCE  |  EIS SCOUTING REPORT', { x: M + 90, y: PH - 34, size: 8.5, font: H, color: rgb(0.7, 0.7, 0.7) });
    const rid = 'Report #' + r.id;
    page.drawText(rid, { x: PW - M - H.widthOfTextAtSize(rid, 8.5), y: PH - 34, size: 8.5, font: H, color: rgb(0.7, 0.7, 0.7) });
    y = PH - 56 - 26;

    /* ---- headshot (best effort) ---- */
    let photo = null;
    try {
      if (r.headshotKey || r.hasHeadshot) {
        const store = frameStore();
        const key = r.headshotKey || ('headshot_' + r.id);
        const got = await store.getWithMetadata(key, { type: 'arrayBuffer' });
        if (got && got.data) {
          const ct = (got.metadata && got.metadata.contentType) || 'image/jpeg';
          photo = ct.includes('png') ? await pdf.embedPng(got.data) : await pdf.embedJpg(got.data);
        }
      }
    } catch (e) { photo = null; }
    const photoW = 84, photoH = 84;
    if (photo) {
      const sc = Math.max(photoW / photo.width, photoH / photo.height);
      page.drawImage(photo, { x: PW - M - photoW, y: y - photoH + 10, width: photo.width * sc, height: photo.height * sc });
    }

    /* ---- name block ---- */
    const nameW = PW - M * 2 - (photo ? photoW + 16 : 0);
    let nameSize = 26;
    while (H.widthOfTextAtSize(clean(r.prospect || 'Unnamed Prospect'), nameSize) > nameW && nameSize > 14) nameSize -= 1;
    text(r.prospect || 'Unnamed Prospect', M, nameSize, H, INK);
    y -= 18;
    const l1 = [r.positionLabel || r.position, r.archetype].filter(Boolean).join('  |  ');
    if (l1) { text(l1, M, 10.5, H, INK); y -= 14; }
    const l2 = [r.school, r.classYear ? 'Class of ' + r.classYear : '', [r.homeCity, r.homeState].filter(Boolean).join(', ')].filter(Boolean).join('  |  ');
    if (l2) { text(l2, M, 9.5, F, MUTE); y -= 13; }
    const l3 = [r.height ? 'HT ' + r.height : '', r.weight ? 'WT ' + r.weight : '', r.wingspan ? 'WS ' + r.wingspan : ''].filter(Boolean).join('    ');
    if (l3) { text(l3, M, 9.5, F, MUTE); y -= 13; }
    y -= 12; if (photo && y > PH - 56 - 26 - photoH - 4) y = PH - 56 - 26 - photoH - 4;

    /* ---- score row ---- */
    const film = raw.traitGrades || {}, ath = raw.athleticGrades || {}, prod = raw.productionGrades || {}, gates = raw.gates || {};
    const avg = (o) => { const v = Object.values(o).map(Number).filter(n => n > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
    const filmS = avg(film) * 20, athS = avg(ath) * 20, prodS = avg(prod) * 20;
    const gv = Object.values(gates); const charS = gv.length ? gv.map(g => g === 'pass' ? 100 : g === 'concern' ? 60 : 0).reduce((a, b) => a + b, 0) / gv.length : 0;
    const iq = Number(r.footballIQ) || null;
    const ti = (iq && athS > 0 && filmS > 0) ? ((iq * filmS) / athS).toFixed(2) : '-';
    const score = r.inhomeScore != null ? Number(r.inhomeScore).toFixed(1) : '-';

    const boxW = (PW - M * 2 - 20) / 3, boxH = 58;
    const boxes = [['INHOME SCORE', score, RED], ['TRANSLATION INDEX', ti, INK], ['PROJECTION', r.recommendationTier || 'Ungraded', INK]];
    boxes.forEach(([lab, val, col], i) => {
      const x = M + i * (boxW + 10);
      page.drawRectangle({ x, y: y - boxH, width: boxW, height: boxH, color: FILL, borderColor: LINE, borderWidth: 0.5 });
      const vs = i === 2 ? 12 : 24;
      let vsz = vs; while (H.widthOfTextAtSize(clean(val), vsz) > boxW - 16 && vsz > 8) vsz -= 1;
      page.drawText(clean(val), { x: x + (boxW - H.widthOfTextAtSize(clean(val), vsz)) / 2, y: y - 30, size: vsz, font: H, color: col });
      page.drawText(lab, { x: x + (boxW - H.widthOfTextAtSize(lab, 7)) / 2, y: y - 46, size: 7, font: H, color: MUTE });
    });
    y -= boxH + 18;

    /* ---- section helper ---- */
    const section = (title, right) => {
      need(30);
      page.drawText(title.toUpperCase(), { x: M, y, size: 8, font: H, color: MUTE });
      if (right) page.drawText(clean(right), { x: PW - M - F.widthOfTextAtSize(clean(right), 8), y, size: 8, font: F, color: MUTE });
      y -= 6; page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.5, color: LINE }); y -= 14;
    };

    /* ---- composition ---- */
    section('Score composition', 'Film 50 / Athletic 25 / Character 15 / Production 10');
    const comp = [['Film', filmS], ['Athletic', athS], ['Character', charS], ['Production', prodS]];
    if (iq) comp.push(['Football IQ', iq * 10]);
    comp.forEach(([k, v]) => {
      need(16);
      page.drawText(k, { x: M, y, size: 9, font: F, color: INK });
      const bx = M + 90, bw = PW - M * 2 - 90 - 40;
      page.drawRectangle({ x: bx, y: y + 1, width: bw, height: 6, color: FILL });
      page.drawRectangle({ x: bx, y: y + 1, width: Math.max(0, Math.min(1, v / 100)) * bw, height: 6, color: RED });
      const vs = String(Math.round(k === 'Football IQ' ? iq : v));
      page.drawText(vs, { x: PW - M - H.widthOfTextAtSize(vs, 9), y, size: 9, font: H, color: INK });
      y -= 15;
    });
    y -= 8;

    /* ---- traits ---- */
    const traitBlock = (title, list, grades, raws) => {
      if (!list || !Object.keys(grades || {}).length) return;
      section(title);
      list.forEach(t => {
        const g = parseInt(grades[t.id], 10) || 0; if (!g) return;
        need(16);
        page.drawText(clean(t.name), { x: M, y, size: 9.5, font: F, color: INK });
        const rv = raws && raws[t.id];
        if (rv) page.drawText(clean(rv), { x: M + 200, y, size: 8.5, font: F, color: MUTE });
        for (let i = 1; i <= 5; i++) page.drawRectangle({ x: PW - M - 120 + (i - 1) * 14, y: y + 2, width: 11, height: 5, color: i <= g ? INK : FILL });
        const lab = GRADE_LABELS[g - 1] || '';
        page.drawText(lab, { x: PW - M - 44, y, size: 8, font: F, color: MUTE });
        y -= 15;
      });
      y -= 8;
    };
    if (cfg) {
      traitBlock('Film traits', cfg.film, film);
      traitBlock('Athletic traits', cfg.athletic, ath, raw.athleticRaw);
      traitBlock('Production', cfg.production, prod, raw.productionRaw);
    }

    /* ---- gates ---- */
    if (Object.keys(gates).length) {
      section('Character gates');
      const labels = cfg ? cfg.gates : Object.keys(gates);
      labels.forEach(label => {
        const gid = String(label).replace(/[^a-zA-Z0-9]/g, ''); const v = gates[gid] || gates[label]; if (!v) return;
        need(15);
        page.drawText(clean(label), { x: M, y, size: 9.5, font: F, color: INK });
        const vt = v.toUpperCase();
        page.drawText(vt, { x: PW - M - H.widthOfTextAtSize(vt, 8), y, size: 8, font: H, color: v === 'fail' ? RED : v === 'concern' ? rgb(0.75, 0.55, 0.1) : rgb(0.15, 0.6, 0.3) });
        y -= 15;
      });
      y -= 8;
    }

    /* ---- track ---- */
    const trk = raw.track || {};
    if (trk.events && Object.keys(trk.events).length) {
      section('Verified track', [trk.source, trk.season].filter(Boolean).join(' - '));
      const line = Object.entries(trk.events).map(([k, v]) => k.toUpperCase() + ' ' + v).join('    ');
      wrap(F, 9.5, line, PW - M * 2).forEach(l => { need(14); page.drawText(clean(l), { x: M, y, size: 9.5, font: F, color: INK }); y -= 13; });
      y -= 8;
    }

    /* ---- narrative ---- */
    if (r.narrative) {
      section('Scout narrative');
      wrap(F, 10, r.narrative, PW - M * 2).forEach(l => { need(15); page.drawText(clean(l), { x: M, y, size: 10, font: F, color: INK }); y -= 14; });
      y -= 8;
    }

    /* ---- program fits ---- */
    const recs = raw.recommendedPrograms || [];
    if (recs.length) {
      section('Program fits');
      recs.forEach(p => {
        const line = p.program + (p.fit ? ' - ' + p.fit : '');
        wrap(F, 9.5, line, PW - M * 2).forEach((l, i) => { need(14); page.drawText(clean(l), { x: M + (i ? 10 : 0), y, size: 9.5, font: i ? F : H, color: INK }); y -= 13; });
      });
      y -= 8;
    }

    /* ---- footer on every page ---- */
    const pages = pdf.getPages();
    const foot = `Filed by ${r.scoutName || 'InHome Scout'}${r.scoutRole ? ' - ' + r.scoutRole : ''}${r.dateEvaluated ? ' - ' + r.dateEvaluated : ''}   |   InHome Recruiting Intelligence - Eye in the Sky film framework - shared directly by InHome, please do not redistribute`;
    pages.forEach((pg, i) => {
      pg.drawLine({ start: { x: M, y: M - 6 }, end: { x: PW - M, y: M - 6 }, thickness: 0.5, color: LINE });
      const lines = wrap(F, 7, foot, PW - M * 2 - 40);
      lines.slice(0, 2).forEach((l, k) => pg.drawText(clean(l), { x: M, y: M - 16 - k * 9, size: 7, font: F, color: MUTE }));
      const pn = `${i + 1} / ${pages.length}`;
      pg.drawText(pn, { x: PW - M - F.widthOfTextAtSize(pn, 7), y: M - 16, size: 7, font: F, color: MUTE });
    });

    const bytes = await pdf.save();
    const fname = `InHome_${(r.position || 'X')}_${String(r.prospect || 'prospect').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${qs.dl ? 'attachment' : 'inline'}; filename="${fname}"`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      },
      body: Buffer.from(bytes).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('report-pdf error:', err);
    return { statusCode: 500, body: 'PDF failed: ' + err.message };
  }
};
