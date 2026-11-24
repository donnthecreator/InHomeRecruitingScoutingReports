/* =====================================================================
   lib/board-import.js
   Puts a list of players on a program's board: finds or creates each
   prospect, fills blanks on an existing record (never overwrites), stores
   athlete contact admin-side only, links the player to the program's
   board and, for a high school, marks his selected prospects.

   Used by the admin Board tab (spreadsheet upload and the saved-roster
   buttons) and by list-program-prospects, which loads a roster committed
   in lib/board-seeds.js the first time that program's board is opened.

   Row shape: [name, position, school, state, height, weight, phone, email,
               classYear, filmLink, note, isProspect]
===================================================================== */
async function importBoardRows(sql, program, rows) {
  /* The portal keys boards by code, so a code without a programs
     row still gets a board. The name is only for the message. */
  const [prog] = await sql`SELECT school_key, name FROM programs WHERE upper(access_code) = ${program} LIMIT 1`;
  const WR = { X: 'X', Z: 'Z', H: 'H', SLOT: 'H' };
  await sql`ALTER TABLE program_prospects ADD COLUMN IF NOT EXISTS is_prospect BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS athlete_phone TEXT`;
  await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS athlete_email TEXT`;
  let contacts = 0;
  let created = 0, linked = 0, already = 0, skipped = 0, filled = 0;
  for (const r of rows) {
    const [name, posRaw, school, state, height, weight, phoneRaw, emailRaw, classRaw, filmRaw, noteRaw, prospectRaw] = Array.isArray(r) ? r : [r.name, r.position, r.school, r.state, r.height, r.weight, r.phone, r.email, r.classYear, r.film, r.note, r.isProspect];
    /* A high school's selected prospects arrive already marked, so
       they land on the coach's Prospects tab as well as his Roster. */
    const markProspect = prospectRaw === true || /^(y|yes|true|1|prospect)$/i.test(String(prospectRaw || '').trim());
    const classYear = String(classRaw || '').trim().slice(0, 8) || null;
    const film = String(filmRaw || '').trim().slice(0, 500) || null;
    const note = String(noteRaw || '').trim().slice(0, 400) || null;
    const nm = String(name || '').trim();
    const nameKey = nm.toLowerCase().replace(/[^a-z]/g, '');
    if (!nameKey) { skipped++; continue; }
    const pr = String(posRaw || '').trim().toUpperCase();
    const position = WR[pr] ? 'WR' : (pr || null);
    const positionLabel = WR[pr] || null;
    const sch = String(school || '').trim() || null;
    let prospectId = null;
    const [exact] = await sql`SELECT id FROM prospects WHERE name_key = ${nameKey} AND COALESCE(school,'') = ${sch || ''} LIMIT 1`;
    if (exact) prospectId = exact.id;
    else {
      const same = await sql`SELECT id FROM prospects WHERE name_key = ${nameKey} LIMIT 2`;
      if (same.length === 1) prospectId = same[0].id;
    }
    if (!prospectId) {
      const [c] = await sql`
        INSERT INTO prospects (name, name_key, school, position, position_label, level, home_state, height, weight, class_year, film_link)
        VALUES (${nm}, ${nameKey}, ${sch}, ${position}, ${positionLabel}, 'HS', ${String(state || '').trim() || null},
                ${String(height || '').trim() || null}, ${String(weight || '').trim() || null}, ${classYear}, ${film})
        RETURNING id`;
      prospectId = c.id; created++;
    } else {
      /* Re-uploading a board with details filled in (e.g. the high
         school) fills only what the existing record is missing.
         Nothing already on a record is overwritten. */
      const st = String(state || '').trim() || null;
      const ht = String(height || '').trim() || null;
      const wt = String(weight || '').trim() || null;
      if (sch || position || st || ht || wt || classYear || film) {
        const upd = await sql`
          UPDATE prospects SET
            school         = COALESCE(NULLIF(school, ''), ${sch}),
            position       = COALESCE(position, ${position}),
            position_label = COALESCE(position_label, ${positionLabel}),
            home_state     = COALESCE(home_state, ${st}),
            height         = COALESCE(height, ${ht}),
            weight         = COALESCE(weight, ${wt}),
            class_year     = COALESCE(class_year, ${classYear}),
            film_link      = COALESCE(NULLIF(film_link, ''), ${film})
          WHERE id = ${prospectId}
            AND ((school IS NULL OR school = '') AND ${sch}::text IS NOT NULL
              OR position IS NULL AND ${position}::text IS NOT NULL
              OR home_state IS NULL AND ${st}::text IS NOT NULL
              OR height IS NULL AND ${ht}::text IS NOT NULL
              OR weight IS NULL AND ${wt}::text IS NOT NULL
              OR class_year IS NULL AND ${classYear}::text IS NOT NULL
              OR (film_link IS NULL OR film_link = '') AND ${film}::text IS NOT NULL)
          RETURNING id`;
        if (upd.length) filled++;
      }
    }
    /* Athlete contact (admin-only; never sent to scouts or the portal).
       Fills only when the record has none, so a typed-in number is kept. */
    const digits = String(phoneRaw || '').replace(/\D/g, '');
    const phone = digits.length === 10 ? `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
                : digits.length === 11 && digits[0] === '1' ? `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
                : (String(phoneRaw || '').trim() || null);
    const email = String(emailRaw || '').trim().slice(0, 200) || null;
    if (phone || email) {
      const c = await sql`UPDATE prospects SET athlete_phone = COALESCE(NULLIF(athlete_phone,''), ${phone}),
                            athlete_email = COALESCE(NULLIF(athlete_email,''), ${email})
                          WHERE id = ${prospectId}
                            AND ((athlete_phone IS NULL OR athlete_phone = '') AND ${phone}::text IS NOT NULL
                              OR (athlete_email IS NULL OR athlete_email = '') AND ${email}::text IS NOT NULL)
                          RETURNING id`;
      if (c.length) contacts++;
    }
    const ins = await sql`
      INSERT INTO program_prospects (program_code, prospect_id, source, note, is_prospect)
      SELECT ${program}, ${prospectId}, ${'admin board import'}, ${note}, ${markProspect}
      WHERE NOT EXISTS (SELECT 1 FROM program_prospects x WHERE upper(x.program_code) = ${program} AND x.prospect_id = ${prospectId})
      RETURNING id`;
    if (ins.length) linked++; else {
      already++;
      /* Re-uploading a sheet with the coach's evaluation filled in adds
         the note to a row that has none; a typed note is never replaced. */
      if (note) await sql`UPDATE program_prospects SET note = ${note}
                          WHERE upper(program_code) = ${program} AND prospect_id = ${prospectId} AND (note IS NULL OR note = '')`;
      /* Marking only ever promotes: a re-load never pulls a player the
         coach added himself back off his Prospects tab. */
      if (markProspect) await sql`UPDATE program_prospects SET is_prospect = true
                          WHERE upper(program_code) = ${program} AND prospect_id = ${prospectId}`;
    }
  }
  const [c] = await sql`SELECT count(*)::int AS n FROM program_prospects WHERE upper(program_code) = ${program}`;
  return ({ program, school: prog ? prog.name : null, created, linked, already, skipped, filled, contacts, onBoard: c.n });
}

module.exports = { importBoardRows };
