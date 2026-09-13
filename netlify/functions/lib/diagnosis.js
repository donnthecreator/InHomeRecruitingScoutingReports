/* =====================================================================
   diagnosis.js
   Turns a completed assessment into a readable Football IQ Diagnosis
   and a short profile. Rule-based on purpose: every sentence traces to
   a count of right and wrong answers a coach can check. Nothing is
   inferred that the athlete did not answer.
===================================================================== */

const CATS = [
  { key: 'fronts',    name: 'Fronts and alignment',      test: (d) => /front|3tech|1tech|5tech|9tech|nose|gap|open_side|bear_cover|odd_covered|odd_nose|^p11|^p21|^trips$|^strength|trips_three/.test(d.id.replace(/^dot_/, '')) },
  { key: 'coverage',  name: 'Coverage recognition',      test: (d) => /shell|sky|spin|stay|cover|two_help|two_split|quarters|third|flat_who|over_slot|c_|rot_field|bail|motion_man|motion_zone|two_vert|two_flat|trips_roll|trips_who|zero_man|cgap_seam/.test(d.id.replace(/^dot_/, '')) },
  { key: 'pressure',  name: 'Pressure and protection',   test: (d) => /mike|pressure|hot|mug|blitz|zero_bluff|will|slide|combo|twist|pro_bear|scan|climb|a_blitz|sam_fire|qb_protect|boundary_corner|empty/.test(d.id.replace(/^dot_/, '')) },
  { key: 'keys',      name: 'Keys and reaction',         test: (d) => /pull|high_hat|low_hat|_pa$|screen|end_crash|down_pull|backside_end|draw|power|split_zone|checkdown|fit|force|release|stalk|press_which|twist_first|over_first|rush|down|pass_run|_key|seam|leverage|lb_lev|flex|carry|nb_out|press_bail/.test(d.id.replace(/^dot_/, '')) },
  { key: 'situation', name: 'Situational football',      test: (d) => /^s_|thirdlong|clock|field_bound|k_op/.test(d.id.replace(/^dot_/, '')) },
  { key: 'film',      name: 'Film recognition',          test: (d) => !!d.clip }
];

function categorize(detail) {
  const out = CATS.map(c => ({ key: c.key, name: c.name, correct: 0, total: 0, items: [] }));
  const other = { key: 'other', name: 'Other', correct: 0, total: 0, items: [] };
  detail.forEach(d => {
    let cat = d.clip ? out.find(c => c.key === 'film') : out.find(c => c.key !== 'film' && c.test && false);
    if (!cat) cat = out.find(c => c.key !== 'film' && CATS.find(x => x.key === c.key).test(d)) || other;
    cat.total++; if (d.correct) cat.correct++; cat.items.push(d.id);
  });
  const cats = out.concat(other.total ? [other] : []).filter(c => c.total > 0)
    .map(c => ({ key: c.key, name: c.name, correct: c.correct, total: c.total, pct: Math.round(c.correct / c.total * 100) }));
  return cats;
}

function band(pct) {
  if (pct >= 90) return 'elite';
  if (pct >= 75) return 'strong';
  if (pct >= 55) return 'developing';
  return 'behind';
}

function diagnosis(kind, sc, answers, position, mbti) {
  const detail = sc.detail || [];
  if (!detail.length) return null;
  const cats = categorize(detail);
  const overall = sc.total ? Math.round(sc.correct / sc.total * 100) : null;

  /* did he confirm after the snap? motion scenarios only */
  const motion = detail.filter(d => d.dots && /^dot_(m_|mq_|mr_|mw_|mo_|md_|ml_|mb_)/.test(d.id));
  const motionPct = motion.length ? Math.round(motion.filter(d => d.correct).length / motion.length * 100) : null;
  const stat = detail.filter(d => d.dots && !motion.includes(d));
  const staticPct = stat.length ? Math.round(stat.filter(d => d.correct).length / stat.length * 100) : null;

  const strong = cats.filter(c => c.total >= 3 && c.pct >= 80).sort((a, b) => b.pct - a.pct);
  const weak = cats.filter(c => c.total >= 3 && c.pct < 60).sort((a, b) => a.pct - b.pct);

  const lines = [];
  const posTxt = position ? ` for a ${position}` : '';
  lines.push(`Overall ${overall}% (${sc.correct} of ${sc.total} scored questions), ${band(overall)}${posTxt}.`);
  if (strong.length) lines.push(`Strongest where it counts: ${strong.map(c => `${c.name.toLowerCase()} (${c.correct}/${c.total})`).join(', ')}.`);
  if (weak.length) lines.push(`Needs coaching: ${weak.map(c => `${c.name.toLowerCase()} (${c.correct}/${c.total})`).join(', ')}.`);
  if (motionPct != null && staticPct != null) {
    if (motionPct >= staticPct + 10) lines.push(`Better after the snap than before it (${motionPct}% on moving looks vs ${staticPct}% static): he confirms with his eyes rather than guessing off alignment.`);
    else if (staticPct >= motionPct + 15) lines.push(`Reads the pre-snap picture (${staticPct}%) better than he reacts to movement (${motionPct}%): he sees alignment but gets caught by rotation and disguise. That is the coaching point.`);
    else lines.push(`Pre-snap and post-snap reads are consistent (${staticPct}% static, ${motionPct}% moving).`);
  }
  const film = cats.find(c => c.key === 'film');
  if (film) lines.push(film.pct >= 75 ? `Film recognition holds up on real clips (${film.correct}/${film.total}).` : `Real film is harder for him than the whiteboard (${film.correct}/${film.total} on clips): knows the rules, still learning to see them at game speed.`);

  /* profile lines from the interview, only what he said */
  const profile = [];
  if (mbti && mbti.complete) profile.push(`Type ${mbti.type} on the wired questions (conversation starter, not a score).`);
  const MOT = ['playing time', 'coaching and development', 'winning at the highest level', 'NIL and earnings', 'being near family', 'the degree and what comes after'];
  const m1 = answers.motiv_rank, m2 = answers.motiv_second;
  if (m1 !== undefined && MOT[m1]) profile.push(`Says what matters most is ${MOT[m1]}${m2 !== undefined && MOT[m2] && m2 != m1 ? `, then ${MOT[m2]}` : ''}.`);
  const FILM = ['rarely watches film alone', 'watches film alone once in a while', 'watches film alone weekly', 'watches film alone several times a week in season'];
  if (answers.film_habits !== undefined && FILM[answers.film_habits]) profile.push(`Reports he ${FILM[answers.film_habits]}.`);
  const AG = ['no agent or rep', 'a family member handling recruitment', 'a certified agent or NIL rep', 'a marketing or collective advisor'];
  if (answers.agent_has !== undefined && AG[answers.agent_has]) profile.push(`Representation: ${AG[answers.agent_has]}${answers.agent_who ? ` (${String(answers.agent_who).slice(0, 80)})` : ''}.`);
  const TRADE = ['leans take the money and wait', 'leans take the field, money follows', 'says it depends on the school and coach', 'does not know yet'];
  if (answers.nil_tradeoff !== undefined && TRADE[answers.nil_tradeoff]) profile.push(`On money versus playing time, ${TRADE[answers.nil_tradeoff]}.`);

  return { overall, band: band(overall), categories: cats, motionPct, staticPct, summary: lines.join(' '), profile: profile.join(' '),
           note: 'Scored questions only. Written answers are read by a scout and are not part of these numbers.' };
}

module.exports = { diagnosis, categorize };
