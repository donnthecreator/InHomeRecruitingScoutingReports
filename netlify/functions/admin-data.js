/* =====================================================================
   admin-data.js
   Deploy to: netlify/functions/admin-data.js  (PORTAL repo)

   Every admin read and write goes through here. The token from
   verify-admin.js is re-checked on every single call, so a user who
   unhides the admin panel in devtools still gets 401 on all data.

   REQUIRED ENV VARS:
     ADMIN_SECRET   same value used by verify-admin.js
     DATABASE_URL   your existing Neon connection string

   TABLES: see admin-schema.sql

   NOTE ON THE REPORTS QUERY: this reads your existing reports table.
   Column names below are my best guess from the submit-report payload.
   If your columns differ, fix the SELECT in loadAll() only. Nothing
   else touches that table.
===================================================================== */

const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

/* ---------- SCOUT CODE / ID GENERATION ---------- */
function slugId(name) {
  const parts = name.trim().split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
  if (!parts.length) return 'scout';
  const first = parts[0][0].toLowerCase();
  const last = parts[parts.length - 1].replace(/[^a-zA-Z]/g, '').toLowerCase();
  return (first + last) || 'scout';
}
function slugCode(name) {
  const parts = name.trim().split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
  const last = (parts[parts.length - 1] || 'SCOUT').replace(/[^a-zA-Z]/g, '').toUpperCase();
  return last + '26';
}
async function uniqueScoutId(base) {
  let candidate = base, n = 2;
  while (true) {
    const existing = await sql`SELECT 1 FROM scouts WHERE scout_id = ${candidate} LIMIT 1`;
    if (!existing.length) return candidate;
    candidate = base + n;
    n++;
  }
}
async function uniqueAccessCode(base) {
  let candidate = base, n = 2;
  while (true) {
    const existing = await sql`SELECT 1 FROM scouts WHERE access_code = ${candidate} LIMIT 1`;
    if (!existing.length) return candidate;
    candidate = base.replace(/26$/, '') + n + '26';
    n++;
  }
}

/* ---------- AUTH ---------- */
function verifyToken(event) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const header = event.headers.authorization || event.headers.Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;

  const [expiresStr, sig] = token.split('.');
  if (!expiresStr || !sig) return false;

  const expires = Number(expiresStr);
  if (!expires || Date.now() > expires) return false;

  const expected = crypto.createHmac('sha256', secret).update(expiresStr).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* Share links are signed with ADMIN_SECRET so a coach can open one
   report without the link being guessable. share-report.js checks the
   same signature. Keep this function in sync with that file. */
function shareSig(reportId) {
  return crypto.createHmac('sha256', process.env.ADMIN_SECRET).update('share:' + reportId).digest('hex').slice(0, 24);
}
function siteBase(event) {
  const h = event.headers || {};
  const host = h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com';
  const proto = h['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

const ok   = (body) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const fail = (code, error) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error }) });

/* ---------- HANDLER ---------- */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
  if (!verifyToken(event)) return fail(401, 'Unauthorized');

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return fail(400, 'Bad request'); }

  const { action } = body;

  try {
    switch (action) {

      case 'listScouts': {
        const scouts = await sql`SELECT * FROM scouts ORDER BY active DESC, name`;
        return ok({ scouts });
      }

      case 'createScout': {
        const { name, role, region } = body;
        if (!name || !name.trim()) return fail(400, 'name required');

        const scoutId = await uniqueScoutId(slugId(name));
        const accessCode = await uniqueAccessCode(slugCode(name));

        const rows = await sql`
          INSERT INTO scouts (scout_id, access_code, name, role, region, active)
          VALUES (${scoutId}, ${accessCode}, ${name.trim()}, ${role || 'Regional Scout'},
                  ${region || 'Unassigned'}, TRUE)
          RETURNING *`;
        return ok({ scout: rows[0] });
      }

      case 'updateScout': {
        const { id, active, role, region } = body;
        if (!id) return fail(400, 'id required');
        if (active !== undefined) {
          await sql`UPDATE scouts SET active = ${active} WHERE id = ${id}`;
        }
        if (role) {
          await sql`UPDATE scouts SET role = ${role} WHERE id = ${id}`;
        }
        if (region) {
          await sql`UPDATE scouts SET region = ${region} WHERE id = ${id}`;
        }
        return ok({ success: true });
      }

      case 'loadAll': {
        const scouts = await sql`SELECT * FROM scouts ORDER BY active DESC, name`;
        const assignments = await sql`
          SELECT * FROM scout_assignments ORDER BY assigned_at DESC`;
        /* performance_date as a plain YYYY-MM-DD string: a calendar date,
           never a timestamp that shifts a day when the browser localizes it. */
        let performances = await sql`
          SELECT *, to_char(performance_date, 'YYYY-MM-DD') AS performance_date_str
          FROM player_performances ORDER BY performance_date DESC`;
        performances = performances.map(r => ({ ...r, performance_date: r.performance_date_str || null }));

        /* Reports, with the prospects join for photos. If the join fails
           for any reason, fall back to a plain reports query so the admin
           list is never blank, and pass the error up so the UI can show it
           instead of silently reading as "no reports". */
        let reports = [];
        let reportsError = null;
        try {
          reports = await sql`
            SELECT r.id, r.prospect_name AS prospect, r.position, r.position_label, r.school, r.class_year,
                   r.home_city, r.home_state, r.latitude, r.longitude,
                   r.inhome_score, r.recommendation_tier,
                   r.scout_id, r.scout_name, r.date_evaluated, r.created_at, r.has_headshot,
                   r.prospect_id, p.headshot_key, p.wingspan_key, p.wingspan
            FROM reports r
            LEFT JOIN prospects p ON p.id = r.prospect_id
            ORDER BY COALESCE(r.date_evaluated::timestamptz, r.created_at) DESC
            LIMIT 500`;
        } catch (e) {
          console.error('reports join query failed:', e.message);
          reportsError = 'join: ' + e.message;
          try {
            reports = await sql`
              SELECT id, prospect_name AS prospect, position, position_label, school, class_year,
                     inhome_score, recommendation_tier,
                     scout_id, scout_name, date_evaluated, created_at, has_headshot
              FROM reports
              ORDER BY created_at DESC
              LIMIT 500`;
            reportsError += ' (fell back to reports-only query)';
          } catch (e2) {
            console.error('reports fallback query failed:', e2.message);
            reportsError += ' | fallback: ' + e2.message;
          }
        }

        return ok({ scouts, assignments, performances, reports, reportsError });
      }

      case 'createAssignment': {
        const { name, scout_id, position, class_year, level, school, priority, source_link, note } = body;
        if (!name || !scout_id) return fail(400, 'name and scout_id required');

        /* Link (or create) the prospect row so commitments, offers, and
           photos attach to the same record the report will use. Same
           matching rules as submit-report.js. */
        const nameKey = String(name).toLowerCase().replace(/[^a-z]/g, '');
        let prospectId = null;
        if (nameKey) {
          const [exact] = await sql`
            SELECT id FROM prospects
            WHERE name_key = ${nameKey}
              AND COALESCE(school,'') = ${school || ''}
              AND COALESCE(class_year,'') = ${class_year || ''}
            LIMIT 1`;
          if (exact) prospectId = exact.id;
          else {
            const [blank] = await sql`
              SELECT id FROM prospects
              WHERE name_key = ${nameKey}
                AND COALESCE(school,'') = ${school || ''}
                AND COALESCE(class_year,'') = ''
              LIMIT 1`;
            if (blank) {
              prospectId = blank.id;
              if (class_year) await sql`UPDATE prospects SET class_year = ${class_year}, updated_at = now() WHERE id = ${blank.id}`;
            } else {
              const [created] = await sql`
                INSERT INTO prospects (name, name_key, school, class_year, position, level)
                VALUES (${name}, ${nameKey}, ${school || null}, ${class_year || null}, ${position || null}, ${level || 'HS'})
                ON CONFLICT (name_key, COALESCE(school,''), COALESCE(class_year,''))
                  DO UPDATE SET updated_at = now()
                RETURNING id`;
              prospectId = created ? created.id : null;
            }
          }
        }

        const rows = await sql`
          INSERT INTO scout_assignments
            (name, scout_id, position, class_year, level, school, priority, source_link, note, status, prospect_id)
          VALUES
            (${name}, ${scout_id}, ${position || null}, ${class_year || null}, ${level || 'HS'},
             ${school || null}, ${priority || 'normal'}, ${source_link || null}, ${note || null}, 'open', ${prospectId})
          RETURNING *`;
        return ok({ assignment: rows[0] });
      }

      case 'updateAssignment': {
        const { id, status, scout_id } = body;
        if (!id) return fail(400, 'id required');
        if (status) {
          await sql`UPDATE scout_assignments SET status = ${status} WHERE id = ${id}`;
        }
        if (scout_id) {
          await sql`UPDATE scout_assignments SET scout_id = ${scout_id} WHERE id = ${id}`;
        }
        return ok({ success: true });
      }

      case 'deleteAssignment': {
        const { id } = body;
        if (!id) return fail(400, 'id required');
        await sql`DELETE FROM scout_assignments WHERE id = ${id}`;
        return ok({ success: true });
      }

      case 'createPerformance': {
        const { name, level, position, class_year, school, stat_line, source_link, performance_date } = body;
        if (!name) return fail(400, 'name required');
        /* grade: 0-100 week grade that moves the Production Market. Column
           is added on first use so no manual migration is needed. */
        let grade = null;
        if (body.grade !== undefined && body.grade !== null && String(body.grade).trim() !== '') {
          const g = parseFloat(body.grade);
          if (!Number.isFinite(g) || g < 0 || g > 100) return fail(400, 'grade must be 0-100');
          grade = g;
        }
        await sql`ALTER TABLE player_performances ADD COLUMN IF NOT EXISTS grade NUMERIC`;
        /* Same player, same date, same stat line = the same game. A double
           tap on "Log selected" must not create a second row. */
        const nk = String(name).toLowerCase().replace(/[^a-z]/g, '');
        const [dup] = await sql`
          SELECT *, to_char(performance_date, 'YYYY-MM-DD') AS performance_date_str
          FROM player_performances
          WHERE lower(regexp_replace(name, '[^A-Za-z]', '', 'g')) = ${nk}
            AND performance_date = ${performance_date || null}::date
            AND COALESCE(stat_line, '') = ${stat_line || ''}
          LIMIT 1`;
        if (dup) return ok({ performance: { ...dup, performance_date: dup.performance_date_str }, duplicate: true });
        const rows = await sql`
          INSERT INTO player_performances
            (name, level, position, class_year, school, stat_line, source_link, performance_date, grade)
          VALUES
            (${name}, ${level || 'HS'}, ${position || null}, ${class_year || null}, ${school || null},
             ${stat_line || null}, ${source_link || null}, ${performance_date || null}, ${grade})
          RETURNING *, to_char(performance_date, 'YYYY-MM-DD') AS performance_date_str`;
        return ok({ performance: { ...rows[0], performance_date: rows[0].performance_date_str } });
      }

      case 'updatePerformance': {
        const id = parseInt(body.id, 10);
        if (!id) return fail(400, 'id required');
        await sql`ALTER TABLE player_performances ADD COLUMN IF NOT EXISTS grade NUMERIC`;
        let grade = null;
        if (body.grade !== undefined && body.grade !== null && String(body.grade).trim() !== '') {
          const g = parseFloat(body.grade);
          if (!Number.isFinite(g) || g < 0 || g > 100) return fail(400, 'grade must be 0-100');
          grade = g;
        }
        const rows = await sql`
          UPDATE player_performances SET
            grade = ${grade},
            stat_line = COALESCE(${body.stat_line || null}, stat_line),
            source_link = COALESCE(${body.source_link || null}, source_link),
            performance_date = COALESCE(${body.performance_date || null}, performance_date)
          WHERE id = ${id} RETURNING *`;
        return ok({ performance: rows[0] || null });
      }

      case 'deleteReport': {
        const id = parseInt(body.id, 10);
        if (!id) return fail(400, 'id required');
        const [row] = await sql`SELECT id, prospect_name FROM reports WHERE id = ${id}`;
        if (!row) return fail(404, 'Report not found');
        await sql`DELETE FROM reports WHERE id = ${id}`;
        return ok({ success: true, deleted: id, prospect: row.prospect_name });
      }

      case 'shareLink': {
        const id = parseInt(body.id, 10);
        if (!id) return fail(400, 'id required');
        const [row] = await sql`SELECT id FROM reports WHERE id = ${id}`;
        if (!row) return fail(404, 'Report not found');
        const url = `${siteBase(event)}/share.html?id=${id}&t=${shareSig(id)}`;
        return ok({ url });
      }

      /* ---------- PROGRAM BOARDS (the list a school hands us) ---------- */

      case 'importBoxScore': {
        const parse = require('./import-boxscore')._parseText;
        const text = String(body.text || '');
        if (text.length < 200) return fail(400, 'No box score text found');
        const parsed = parse(text);
        if (!parsed.players.length) return fail(422, 'Could not find any player tables. Is this a PrestoSports box score PDF?');
        return ok(parsed);
      }

      /* ---------------- INTAKE (get-evaluated.html submissions) ---------------- */
      case 'listIntake': {
        try {
          const rows = await sql`
            SELECT *, to_char(created_at, 'YYYY-MM-DD') AS created_day
            FROM intake_requests ORDER BY
              CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 WHEN 'accepted' THEN 2 ELSE 3 END,
              created_at DESC
            LIMIT 500`;
          return ok({ intake: rows });
        } catch (e) {
          /* table only exists after the first submission */
          if (/relation .* does not exist/i.test(e.message)) return ok({ intake: [] });
          throw e;
        }
      }

      case 'updateIntake': {
        const id = parseInt(body.id, 10);
        if (!id) return fail(400, 'id required');
        const status = ['new', 'reviewing', 'accepted', 'passed'].includes(body.status) ? body.status : null;
        const rows = await sql`
          UPDATE intake_requests SET
            status = COALESCE(${status}, status),
            admin_note = COALESCE(${body.note !== undefined ? String(body.note).slice(0, 2000) : null}, admin_note),
            updated_at = now()
          WHERE id = ${id} RETURNING *`;
        return ok({ intake: rows[0] || null });
      }

      /* Turn a submission into a real prospect (and optionally a scout
         assignment). Same find-or-create rules as everywhere else. */
      case 'acceptIntake': {
        const id = parseInt(body.id, 10);
        if (!id) return fail(400, 'id required');
        const [r] = await sql`SELECT * FROM intake_requests WHERE id = ${id}`;
        if (!r) return fail(404, 'Submission not found');
        const nameKey = String(r.player_name || '').toLowerCase().replace(/[^a-z]/g, '');
        if (!nameKey) return fail(400, 'Submission has no player name');

        let prospectId = r.prospect_id || null;
        if (!prospectId) {
          const [exact] = await sql`
            SELECT id FROM prospects WHERE name_key = ${nameKey}
              AND COALESCE(school,'') = ${r.school || ''} AND COALESCE(class_year,'') = ${r.class_year || ''} LIMIT 1`;
          if (exact) prospectId = exact.id;
          else {
            const [blank] = await sql`
              SELECT id FROM prospects WHERE name_key = ${nameKey}
                AND COALESCE(school,'') = ${r.school || ''} AND COALESCE(class_year,'') = '' LIMIT 1`;
            if (blank) {
              prospectId = blank.id;
              if (r.class_year) await sql`UPDATE prospects SET class_year = ${r.class_year}, updated_at = now() WHERE id = ${blank.id}`;
            } else {
              const [created] = await sql`
                INSERT INTO prospects (name, name_key, school, class_year, position, level, home_city, home_state, height, weight, film_link)
                VALUES (${r.player_name}, ${nameKey}, ${r.school || null}, ${r.class_year || null}, ${r.player_position || null},
                        'HS', ${r.home_city || null}, ${r.home_state || null}, ${r.height || null}, ${r.weight || null},
                        ${r.hudl_url || r.game_url || r.other_film_url || null})
                RETURNING id`;
              prospectId = created ? created.id : null;
            }
          }
        }

        let assignmentId = null;
        if (body.scoutId && prospectId) {
          const [a] = await sql`
            INSERT INTO scout_assignments
              (name, scout_id, position, class_year, level, school, priority, source_link, note, status, prospect_id, assigned_at)
            SELECT ${r.player_name}, ${String(body.scoutId)}, ${r.player_position || null}, ${r.class_year || null}, 'HS',
                   ${r.school || null}, ${body.priority || 'normal'}, ${r.hudl_url || r.game_url || null},
                   ${'Submitted via get-evaluated by ' + (r.submitter_name || r.submitter_email || 'unknown')}, 'open', ${prospectId}, now()
            WHERE NOT EXISTS (SELECT 1 FROM scout_assignments x WHERE x.scout_id = ${String(body.scoutId)} AND x.prospect_id = ${prospectId})
            RETURNING id`;
          assignmentId = a ? a.id : null;
        }

        await sql`UPDATE intake_requests SET status = 'accepted', prospect_id = ${prospectId}, updated_at = now() WHERE id = ${id}`;
        return ok({ prospectId, assignmentId });
      }

      /* Rename every performance row for one player, so a misspelling
         imported from a PDF merges into the profile already tracked. */
      /* Wipe every logged game filed under a bad school name (e.g. a
         player name the old parser mistook for a team), so the box score
         can be re-imported cleanly with the school confirmed. */
      case 'deletePerformancesBySchool': {
        const school = String(body.school || '').trim();
        if (!school) return fail(400, 'school required');
        const rows = await sql`DELETE FROM player_performances WHERE COALESCE(school,'') = ${school} RETURNING id, name`;
        return ok({ deleted: rows.length, names: [...new Set(rows.map(r => r.name))] });
      }

      case 'renamePerformancePlayer': {
        const from = String(body.fromName || '').trim();
        const to = String(body.toName || '').trim();
        if (!from || !to) return fail(400, 'fromName and toName required');
        const fromKey = from.toLowerCase().replace(/[^a-z]/g, '');
        const school = (body.school !== undefined && body.school !== null && body.school !== '') ? String(body.school) : null;
        const toSchool = body.toSchool ? String(body.toSchool).trim() : null;
        const rows = school
          ? await sql`
              UPDATE player_performances SET name = ${to}, school = COALESCE(${toSchool}, school)
              WHERE lower(regexp_replace(name, '[^A-Za-z]', '', 'g')) = ${fromKey}
                AND COALESCE(school,'') = ${school}
              RETURNING id`
          : await sql`
              UPDATE player_performances SET name = ${to}, school = COALESCE(${toSchool}, school)
              WHERE lower(regexp_replace(name, '[^A-Za-z]', '', 'g')) = ${fromKey}
              RETURNING id`;
        return ok({ updated: rows.length });
      }

      /* Edit a prospect's card fields. Only whitelisted columns. */
      case 'updateProspect': {
        const id = parseInt(body.id, 10);
        if (!id) return fail(400, 'id required');
        const f = body.fields || {};
        /* blank = leave as is (the form sends every field; COALESCE keeps the old value for blanks) */
        const val = (k, max) => { const v = f[k]; return (v === undefined || v === null || String(v).trim() === '') ? null : String(v).trim().slice(0, max); };
        const name = val('name', 120), school = val('school', 160), position = val('position', 20), position_label = val('position_label', 60),
              class_year = val('class_year', 12), level = val('level', 12), home_city = val('home_city', 80), home_state = val('home_state', 4),
              height = val('height', 12), weight = val('weight', 12), film_link = val('film_link', 500), wingspan = val('wingspan', 20);
        const nameKey = name ? name.toLowerCase().replace(/[^a-z]/g, '') : null;
        const rows = await sql`
          UPDATE prospects SET
            name = COALESCE(${name}, name), name_key = COALESCE(${nameKey}, name_key),
            school = COALESCE(${school}, school), position = COALESCE(${position}, position),
            position_label = COALESCE(${position_label}, position_label), class_year = COALESCE(${class_year}, class_year),
            level = COALESCE(${level}, level), home_city = COALESCE(${home_city}, home_city), home_state = COALESCE(${home_state}, home_state),
            height = COALESCE(${height}, height), weight = COALESCE(${weight}, weight), film_link = COALESCE(${film_link}, film_link),
            wingspan = COALESCE(${wingspan}, wingspan), updated_at = now()
          WHERE id = ${id} RETURNING *`;
        if (!rows.length) return fail(404, 'Prospect not found');
        /* keep the performance log in step when the name or school changed */
        const prev = body.prev || {};
        if (prev.name && ((name && name !== prev.name) || (school && school !== (prev.school || '')))) {
          const fromKey = String(prev.name).toLowerCase().replace(/[^a-z]/g, '');
          await sql`UPDATE player_performances SET name = COALESCE(${name}, name), school = COALESCE(${school}, school)
                    WHERE lower(regexp_replace(name, '[^A-Za-z]', '', 'g')) = ${fromKey} AND COALESCE(school,'') = ${prev.school || ''}`;
        }
        return ok({ prospect: rows[0] });
      }

      /* Make a prospect out of a performance-log player who isn't one yet. */
      case 'createProspectFromPerformance': {
        const name = String(body.name || '').trim();
        if (!name) return fail(400, 'name required');
        const nameKey = name.toLowerCase().replace(/[^a-z]/g, '');
        const school = body.school ? String(body.school).trim() : null;
        const [exact] = await sql`SELECT id FROM prospects WHERE name_key = ${nameKey} AND COALESCE(school,'') = ${school || ''} LIMIT 1`;
        if (exact) return ok({ prospectId: exact.id, existed: true });
        const [row] = await sql`
          INSERT INTO prospects (name, name_key, school, position, class_year, level)
          VALUES (${name}, ${nameKey}, ${school}, ${body.position || null}, ${body.class_year || null}, ${body.level || 'HS'})
          ON CONFLICT (name_key, COALESCE(school,''), COALESCE(class_year,'')) DO UPDATE SET updated_at = now()
          RETURNING id`;
        return ok({ prospectId: row.id, existed: false });
      }

      /* ---------------- MAP ---------------- */
      case 'listMapPins': {
        const { pins } = require('./lib/mappins');
        const data = await pins(sql, siteBase(event));
        return ok(data);
      }
      case 'saveSchoolLocation': {
        const { schoolKey } = require('./lib/logos');
        const { ensureTable } = require('./lib/mappins');
        const school = String(body.school || '').trim();
        const sk = schoolKey(school);
        const lat = parseFloat(body.lat), lng = parseFloat(body.lng);
        if (!sk || !Number.isFinite(lat) || !Number.isFinite(lng)) return fail(400, 'school, lat, lng required');
        await ensureTable(sql);
        await sql`INSERT INTO school_locations (school_key, display_name, latitude, longitude, state, updated_at)
                  VALUES (${sk}, ${school}, ${lat}, ${lng}, ${body.state || null}, now())
                  ON CONFLICT (school_key) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, display_name = EXCLUDED.display_name, state = COALESCE(EXCLUDED.state, school_locations.state), updated_at = now()`;
        return ok({ saved: sk });
      }

      case 'listProspects': {
        const rows = await sql`
          SELECT p.id, p.name, p.school, p.position, p.class_year, p.level, p.home_state,
                 p.home_city, p.height, p.weight, p.wingspan, p.film_link,
                 p.headshot_key, p.wingspan_key,
                 (SELECT count(*)::int FROM reports r WHERE r.prospect_id = p.id) AS reports,
                 (SELECT string_agg(DISTINCT upper(pp.program_code), ', ') FROM program_prospects pp WHERE pp.prospect_id = p.id) AS boards
          FROM prospects p
          ORDER BY p.name`;
        /* players who only exist in the performance log so far */
        let pending = [];
        try {
          pending = await sql`
            SELECT DISTINCT ON (lower(regexp_replace(name, '[^A-Za-z]', '', 'g')), COALESCE(school,''))
                   name, school, position, class_year, level
            FROM player_performances pp
            WHERE NOT EXISTS (
              SELECT 1 FROM prospects p
              WHERE p.name_key = lower(regexp_replace(pp.name, '[^A-Za-z]', '', 'g'))
                AND COALESCE(p.school,'') = COALESCE(pp.school,''))
            ORDER BY lower(regexp_replace(name, '[^A-Za-z]', '', 'g')), COALESCE(school,''), created_at DESC`;
        } catch (e) { pending = []; }
        return ok({ prospects: rows, pending });
      }

      case 'listProgramBoards': {
        const boards = await sql`
          SELECT pp.program_code,
                 count(*)::int AS prospects,
                 count(DISTINCT r.prospect_id)::int AS scouted,
                 min(pp.added_at) AS added_at
          FROM program_prospects pp
          LEFT JOIN reports r ON r.prospect_id = pp.prospect_id
          GROUP BY pp.program_code
          ORDER BY min(pp.added_at) DESC`;
        return ok({ boards });
      }

      case 'programBoardStats': {
        const program = String(body.program || '').trim().toUpperCase();
        if (!program) return fail(400, 'program required');
        const [c] = await sql`
          SELECT count(*)::int AS prospects,
                 count(*) FILTER (WHERE p.class_year IS NULL)::int AS blank_year,
                 (SELECT count(*)::int FROM scout_assignments a
                    JOIN program_prospects x ON x.prospect_id = a.prospect_id AND upper(x.program_code) = ${program}) AS assignments,
                 (SELECT count(DISTINCT r.prospect_id)::int FROM reports r
                    JOIN program_prospects x ON x.prospect_id = r.prospect_id AND upper(x.program_code) = ${program}) AS scouted
          FROM program_prospects pp JOIN prospects p ON p.id = pp.prospect_id
          WHERE upper(pp.program_code) = ${program}`;
        const scouts = await sql`SELECT scout_id, name FROM scouts WHERE access_code IS NOT NULL ORDER BY name`;
        return ok({ program, stats: c, scouts });
      }

      /* Collapse rows that exist twice on a program board: a copy with a
         class year and a copy without (typical after a spreadsheet import
         lands on top of players entered by hand). Keeps the row with the
         class year, copies labels over, never deletes a row with a report. */
      case 'mergeProgramDuplicates': {
        const program = String(body.program || '').trim().toUpperCase();
        if (!program) return fail(400, 'program required');
        await sql`
          UPDATE prospects keep SET
            position_label = COALESCE(keep.position_label, dup.position_label),
            home_state     = COALESCE(keep.home_state,     dup.home_state),
            level          = COALESCE(keep.level,          dup.level),
            headshot_key   = COALESCE(keep.headshot_key,   dup.headshot_key),
            wingspan_key   = COALESCE(keep.wingspan_key,   dup.wingspan_key),
            wingspan       = COALESCE(keep.wingspan,       dup.wingspan),
            height         = COALESCE(keep.height,         dup.height),
            weight         = COALESCE(keep.weight,         dup.weight),
            film_link      = COALESCE(keep.film_link,      dup.film_link),
            updated_at     = now()
          FROM prospects dup
          WHERE dup.name_key = keep.name_key
            AND COALESCE(dup.school,'') = COALESCE(keep.school,'')
            AND dup.class_year IS NULL AND keep.class_year IS NOT NULL
            AND dup.id IN (SELECT prospect_id FROM program_prospects WHERE upper(program_code) = ${program})`;
        const deleted = await sql`
          DELETE FROM prospects dup
          USING prospects keep
          WHERE dup.name_key = keep.name_key
            AND COALESCE(dup.school,'') = COALESCE(keep.school,'')
            AND dup.class_year IS NULL AND keep.class_year IS NOT NULL
            AND dup.id IN (SELECT prospect_id FROM program_prospects WHERE upper(program_code) = ${program})
            AND NOT EXISTS (SELECT 1 FROM reports r WHERE r.prospect_id = dup.id)
          RETURNING dup.id`;
        /* Make sure every surviving twin is still on the board. */
        await sql`
          INSERT INTO program_prospects (program_code, prospect_id, source)
          SELECT ${program}, keep.id, 'merge'
          FROM prospects keep
          WHERE keep.class_year IS NOT NULL
            AND EXISTS (SELECT 1 FROM program_prospects x JOIN prospects d ON d.id = x.prospect_id
                        WHERE upper(x.program_code) = ${program} AND d.name_key = keep.name_key
                          AND COALESCE(d.school,'') = COALESCE(keep.school,''))
          ON CONFLICT (program_code, prospect_id) DO NOTHING`;
        const [c] = await sql`SELECT count(*)::int AS n FROM program_prospects WHERE upper(program_code) = ${program}`;
        return ok({ merged: deleted.length, remaining: c.n });
      }

      /* Put a program's board on scouts' target lists. scoutId = one scout,
         omitted = every scout with an access code. Skips pairs that exist. */
      case 'assignProgramBoard': {
        const program = String(body.program || '').trim().toUpperCase();
        if (!program) return fail(400, 'program required');
        const scoutId = body.scoutId ? String(body.scoutId) : null;
        const note = body.note || (program + ' prospect board');
        const rows = scoutId
          ? await sql`
              INSERT INTO scout_assignments
                (name, scout_id, position, class_year, level, school, priority, note, status, prospect_id, assigned_at)
              SELECT p.name, ${scoutId}, p.position, p.class_year, COALESCE(p.level,'HS'), p.school,
                     'normal', ${note}, 'open', p.id, now()
              FROM program_prospects pp JOIN prospects p ON p.id = pp.prospect_id
              WHERE upper(pp.program_code) = ${program}
                AND NOT EXISTS (SELECT 1 FROM scout_assignments a WHERE a.scout_id = ${scoutId} AND a.prospect_id = p.id)
              RETURNING id`
          : await sql`
              INSERT INTO scout_assignments
                (name, scout_id, position, class_year, level, school, priority, note, status, prospect_id, assigned_at)
              SELECT p.name, s.scout_id, p.position, p.class_year, COALESCE(p.level,'HS'), p.school,
                     'normal', ${note}, 'open', p.id, now()
              FROM program_prospects pp
              JOIN prospects p ON p.id = pp.prospect_id
              CROSS JOIN scouts s
              WHERE upper(pp.program_code) = ${program}
                AND s.access_code IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM scout_assignments a WHERE a.scout_id = s.scout_id AND a.prospect_id = p.id)
              RETURNING id`;
        return ok({ created: rows.length });
      }

      /* Undo assignProgramBoard: removes OPEN assignments for a program's
         board from one scout or every scout. Anything a scout already
         worked (status not 'open') is left alone. */
      case 'unassignProgramBoard': {
        const program = String(body.program || '').trim().toUpperCase();
        if (!program) return fail(400, 'program required');
        const scoutId = body.scoutId ? String(body.scoutId) : null;
        const rows = scoutId
          ? await sql`
              DELETE FROM scout_assignments a
              USING program_prospects pp
              WHERE pp.prospect_id = a.prospect_id AND upper(pp.program_code) = ${program}
                AND a.scout_id = ${scoutId} AND a.status = 'open'
              RETURNING a.id`
          : await sql`
              DELETE FROM scout_assignments a
              USING program_prospects pp
              WHERE pp.prospect_id = a.prospect_id AND upper(pp.program_code) = ${program}
                AND a.status = 'open'
              RETURNING a.id`;
        return ok({ removed: rows.length });
      }

      case 'deletePerformance': {
        const { id } = body;
        if (!id) return fail(400, 'id required');
        await sql`DELETE FROM player_performances WHERE id = ${id}`;
        return ok({ success: true });
      }

      default:
        return fail(400, 'Unknown action: ' + action);
    }
  } catch (err) {
    console.error('admin-data error:', err);
    return fail(500, err.message);
  }
};
