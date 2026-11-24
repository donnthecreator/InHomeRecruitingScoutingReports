/* =====================================================================
   prospect-list-pdf.js
   GET /.netlify/functions/prospect-list-pdf?code=GATEWAY26

   The shareable prospect list a high school head coach sends to college
   staffs: the players he has marked on his portal, with measurables,
   class year, film and his own evaluation, on InHome letterhead over
   his school's name.

   Built server-side with pdf-lib for the same reason report-pdf.js is:
   phones cannot render a PDF themselves. Film links are real PDF link
   annotations, so a college coach taps straight through to the film.

   Athlete phone numbers and emails are deliberately NOT on this page.
   It is made to be forwarded, and a forwarded page carrying a minor's
   contact details is a problem the coach should not inherit. Colleges
   come back through InHome or through the coach.

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const { PDFDocument, StandardFonts, rgb, PDFName, PDFString, PDFArray } = require('pdf-lib');
const LOGO = require('./lib/logo');

const sql = neon(process.env.DATABASE_URL);
const BLACK = rgb(0.04, 0.04, 0.04), WHITE = rgb(1, 1, 1), RED = rgb(0.88, 0.14, 0.11);
const INK = rgb(0.1, 0.1, 0.1), MUTE = rgb(0.45, 0.45, 0.45), LINE = rgb(0.85, 0.85, 0.85);

const clean = (s) => String(s == null ? '' : s).replace(/[^\x20-\x7E]/g, (c) =>
  ({ '—': '-', '–': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '·': '-' }[c] || ''));

function wrap(font, size, text, maxW) {
  const words = clean(text).replace(/\s+/g, ' ').trim().split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) <= maxW) cur = test;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* A tappable region over drawn text, so film opens from the page. */
function linkify(pdf, page, url, x, y, w, h) {
  try {
    const annot = pdf.context.obj({
      Type: 'Annot', Subtype: 'Link', Rect: [x, y, x + w, y + h], Border: [0, 0, 0],
      A: pdf.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(url) }),
    });
    const ref = pdf.context.register(annot);
    let annots = page.node.lookup(PDFName.of('Annots'));
    if (!annots) { annots = pdf.context.obj([]); page.node.set(PDFName.of('Annots'), annots); }
    if (annots instanceof PDFArray) annots.push(ref);
  } catch (e) { /* a page without the link still shows the URL as text */ }
}

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const program = String(qs.code || qs.program || '').trim().toUpperCase();
  if (!program) return { statusCode: 400, body: 'code required' };

  try {
    await sql`ALTER TABLE program_prospects ADD COLUMN IF NOT EXISTS is_prospect BOOLEAN NOT NULL DEFAULT false`;
    const rows = await sql`
      SELECT pp.note, p.name, p.school, p.position, p.position_label, p.class_year,
             p.height, p.weight, p.home_city, p.home_state, p.film_link,
             r.inhome_score, r.recommendation_tier
      FROM program_prospects pp
      JOIN prospects p ON p.id = pp.prospect_id
      LEFT JOIN LATERAL (
        SELECT inhome_score, recommendation_tier FROM reports
        WHERE prospect_id = p.id ORDER BY created_at DESC LIMIT 1
      ) r ON true
      WHERE upper(pp.program_code) = ${program} AND pp.is_prospect
      ORDER BY p.class_year NULLS LAST, p.position, p.name`;

    if (!rows.length) return { statusCode: 404, body: 'No players on the prospect list yet' };

    const [prog] = await sql`SELECT name FROM programs WHERE upper(access_code) = ${program} LIMIT 1`;
    const schoolName = (prog && prog.name) || rows[0].school || program;

    const pdf = await PDFDocument.create();
    const H = await pdf.embedFont(StandardFonts.HelveticaBold);
    const F = await pdf.embedFont(StandardFonts.Helvetica);
    const PW = 612, PH = 792, M = 44, CW = PW - M * 2;

    let wmark = null, bandLogo = null;
    try { wmark = await pdf.embedPng(Buffer.from(LOGO.LOCKUP_PNG_BASE64, 'base64')); } catch (e) {}
    try { bandLogo = await pdf.embedPng(Buffer.from(LOGO.LOGO_PNG_BASE64, 'base64')); } catch (e) {}

    let page, y;
    const header = (first) => {
      page = pdf.addPage([PW, PH]);
      if (wmark) {
        const w = 380, h = w * (wmark.height / wmark.width);
        page.drawImage(wmark, { x: (PW - w) / 2, y: (PH - h) / 2, width: w, height: h, opacity: 0.06 });
      }
      const BAND = 64;
      page.drawRectangle({ x: 0, y: PH - BAND, width: PW, height: BAND, color: BLACK });
      page.drawRectangle({ x: 0, y: PH - BAND - 4, width: PW, height: 4, color: RED });
      if (bandLogo) {
        const lh = 44, lw = lh * (bandLogo.width / bandLogo.height);
        page.drawImage(bandLogo, { x: M - 4, y: PH - BAND + (BAND - lh) / 2, width: lw, height: lh });
      } else {
        page.drawText('INHOME RECRUITING INTELLIGENCE', { x: M, y: PH - 38, size: 11, font: H, color: WHITE });
      }
      const t1 = clean(schoolName).toUpperCase();
      page.drawText(t1, { x: PW - M - H.widthOfTextAtSize(t1, 12), y: PH - 30, size: 12, font: H, color: WHITE });
      const t2 = 'PROSPECT LIST';
      page.drawText(t2, { x: PW - M - F.widthOfTextAtSize(t2, 8.5), y: PH - 45, size: 8.5, font: F, color: rgb(0.72, 0.72, 0.72) });
      y = PH - BAND - 30;
      if (first) {
        const d = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        page.drawText(`${rows.length} player${rows.length === 1 ? '' : 's'}  -  ${d}`, { x: M, y, size: 9, font: F, color: MUTE });
        y -= 20;
      }
    };
    header(true);
    const need = (h) => { if (y - h < M + 28) { header(false); } };

    rows.forEach((r, i) => {
      const noteLines = r.note ? wrap(F, 8.5, r.note, CW - 14) : [];
      need(34 + noteLines.length * 11 + (r.film_link ? 13 : 0));

      page.drawRectangle({ x: M, y: y - 2, width: CW, height: 1, color: LINE });
      y -= 16;

      const name = clean(r.name);
      page.drawText(name, { x: M, y, size: 12.5, font: H, color: INK });
      const nameW = H.widthOfTextAtSize(name, 12.5);

      const pos = clean(r.position_label || r.position || '');
      if (pos) page.drawText(pos, { x: M + nameW + 10, y: y + 1, size: 9, font: H, color: RED });

      const bits = [];
      if (r.class_year) bits.push('Class of ' + clean(r.class_year));
      if (r.height || r.weight) bits.push([clean(r.height), r.weight ? clean(r.weight) + ' lbs' : ''].filter(Boolean).join(', '));
      if (r.inhome_score != null) bits.push('InHome Score ' + Number(r.inhome_score).toFixed(1) + (r.recommendation_tier ? ' (' + clean(r.recommendation_tier) + ')' : ''));
      const right = bits.join('   -   ');
      if (right) page.drawText(right, { x: PW - M - F.widthOfTextAtSize(right, 8.5), y: y + 1, size: 8.5, font: F, color: MUTE });
      y -= 13;

      noteLines.forEach(ln => { page.drawText(ln, { x: M, y, size: 8.5, font: F, color: rgb(0.25, 0.25, 0.25) }); y -= 11; });

      if (r.film_link) {
        const label = 'Film: ' + clean(r.film_link);
        const lines = wrap(F, 8, label, CW);
        const shown = lines[0] + (lines.length > 1 ? '...' : '');
        page.drawText(shown, { x: M, y, size: 8, font: F, color: rgb(0.15, 0.3, 0.75) });
        linkify(pdf, page, r.film_link, M, y - 2, F.widthOfTextAtSize(shown, 8), 11);
        y -= 13;
      }
      y -= 6;
    });

    const foot = 'Prepared by InHome Recruiting Intelligence for ' + clean(schoolName) + '.  Contact the head coach or InHome for film, transcripts and athlete contact.';
    const pages = pdf.getPages();
    pages.forEach((p, i) => {
      p.drawText(clean(foot), { x: M, y: 30, size: 7, font: F, color: MUTE });
      const pn = `${i + 1} / ${pages.length}`;
      p.drawText(pn, { x: PW - M - F.widthOfTextAtSize(pn, 7), y: 30, size: 7, font: F, color: MUTE });
    });

    const bytes = await pdf.save();
    const fname = clean(schoolName).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_Prospect_List.pdf';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fname}"`,
                 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
      body: Buffer.from(bytes).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('prospect-list-pdf error:', err);
    return { statusCode: 500, body: err.message };
  }
};
