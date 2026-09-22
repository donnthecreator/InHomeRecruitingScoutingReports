/* =====================================================================
   assessment-banks.js
   Question banks for the athlete-facing assessments.

   kind 'interview' : character / background / self-awareness. The first
                      pass at what an in-person interview would cover.
   kind 'iq'        : football IQ. Written questions plus film clips the
                      athlete diagnoses (clips come from the iq_clips
                      table so they can be swapped without a deploy).

   Scoring: only questions with an `answer` are auto-scored. Open-ended
   answers are never scored by machine; they are read by a scout.
   Descended from the InHome QB assessment bank (v1, Jan 2026).
===================================================================== */

const INTERVIEW = [
  { section: 'Background', items: [
    { id: 'why_football', type: 'text', q: 'Why do you play football? Not the answer you think a coach wants. The real one.' },
    { id: 'household', retired: true, type: 'text', q: 'Who is in your corner day to day, and who do you call when it goes bad?' },
    { id: 'jobs', retired: true, type: 'text', q: 'Do you work, help raise siblings, or carry anything outside of school and ball?' },
    { id: 'school_hard', retired: true, type: 'text', q: 'What class has been hardest for you and what did you do about it?' }
  ]},
  { section: 'Coachability', items: [
    { id: 'hard_coach', type: 'text', q: 'Tell me about a coach who got on you hard. What did he say and what did you do next?' },
    { id: 'criticism', type: 'scale', q: 'How do you take criticism in front of your teammates?', low: 'It gets to me', high: 'I want it', max: 5 },
    { id: 'correction', retired: true, type: 'text', q: 'What is the last thing a coach corrected in your technique, and where are you with it now?' },
    { id: 'film_habits', type: 'single', q: 'How often do you watch film on your own, not as a team?',
      options: ['Rarely or never', 'Once in a while', 'Weekly', 'Several times a week in season'] },
    { id: 'film_what', retired: true, type: 'text', q: 'When you watch your own film, what are you actually looking for?' }
  ]},
  { section: 'Adversity', items: [
    { id: 'worst_game', type: 'text', q: 'Walk me through your worst game. What happened, and what did you do that week after?' },
    { id: 'injury', retired: true, type: 'text', q: 'Have you been hurt? What was it, how long, and how did you handle being out?' },
    { id: 'injury_games', type: 'single', q: 'Games missed to injury in the last two years?',
      options: ['None', 'One or two', 'Three to five', 'Six or more, or a full season'] },
    { id: 'benched', retired: true, type: 'text', q: 'Have you ever lost a starting job or a role? What was that like and how did it end?' },
    { id: 'conflict', retired: true, type: 'text', q: 'Tell me about a time you had a problem with a teammate or a coach and how it got resolved.' }
  ]},
  { section: 'Leadership', items: [
    { id: 'lead_style', type: 'single', q: 'How do you lead?',
      options: ['By example, I am not loud', 'Vocal, I get on people when it is needed',
                'Both, depends on the teammate', 'I am not a leader on this team yet and I know it'] },
    { id: 'lead_example', retired: true, type: 'text', q: 'Give me one specific time you led when it cost you something.' },
    { id: 'teammate_say', type: 'text', q: 'What would the teammate who likes you least say about you?' }
  ]},
  { section: 'Self-awareness', items: [
    { id: 'strength', retired: true, type: 'text', q: 'What is the one thing on your film a coach should trust?' },
    { id: 'weakness', type: 'text', q: 'What do you wish coaches would not see on your film?' },
    { id: 'two_years', retired: true, type: 'text', q: 'Where are you as a player in two years? Be realistic.' },
    { id: 'why_you', retired: true, type: 'text', q: 'A coach has one scholarship and you and a kid with better numbers. Why you?' }
  ]},
  { section: 'Academics and eligibility', items: [
    { id: 'gpa', type: 'short', q: 'Current GPA' },
    { id: 'core_gpa', retired: true, type: 'short', q: 'Core-course GPA if you know it' },
    { id: 'test', retired: true, type: 'short', q: 'ACT or SAT if you have taken it' },
    { id: 'ncaa_id', type: 'single', q: 'Are you registered with the NCAA Eligibility Center?',
      options: ['Yes, registered and my transcript is uploaded', 'Yes, registered', 'No, not yet', 'I do not know what that is'] },
    { id: 'major', retired: true, type: 'text', q: 'What do you want to study, and what happens if football ends tomorrow?' }
  ]},
  { section: 'How you are wired', items: [
    { id: 'mb_ei', type: 'single', q: 'After a hard practice, what actually recharges you?',
      options: ['Being around the guys, talking it all out', 'Grabbing food with a couple teammates',
                'Riding home by myself with music on', 'Getting in my room and shutting it down'], mb: 'EI' },
    { id: 'mb_ei2', type: 'single', q: 'First week in a new locker room, you are',
      options: ['Introducing myself to everybody day one', 'Loud once I get comfortable, which is quick',
                'Watching first, then I pick my spots', 'Heads down, I let my play talk'], mb: 'EI' },
    { id: 'mb_sn', type: 'single', q: 'A coach installs a new scheme. What helps you most?',
      options: ['Walk me through my job rep by rep', 'Give me the checklist and let me drill it',
                'Show me the concept, then I find my part', 'Tell me what we are trying to do to the defense'], mb: 'SN' },
    { id: 'mb_sn2', type: 'single', q: 'When you watch film you mostly notice',
      options: ['My technique on each individual rep', 'Exactly what happened, step by step',
                'Patterns and tendencies over the whole game', 'What it means for what is coming next'], mb: 'SN' },
    { id: 'mb_tf', type: 'single', q: 'A teammate is not pulling his weight. You',
      options: ['Call it out in front of everybody', 'Tell him straight one on one, the standard is the standard',
                'Ask him what is going on first', 'Go through someone he trusts'], mb: 'TF' },
    { id: 'mb_tf2', type: 'single', q: 'What gets the most out of you from a coach?',
      options: ['Hard and direct, no sugar on it', 'Honest and consistent, tell me where I stand',
                'Someone who knows me and coaches me that way', 'Someone who builds me up before he corrects me'], mb: 'TF' },
    { id: 'mb_jp', type: 'single', q: 'Game week, you are',
      options: ['On a strict routine, same everything', 'Planned out but I can adjust',
                'Loose, I go with how the week feels', 'Different every week, I do not think about it'], mb: 'JP' },
    { id: 'mb_jp2', type: 'single', q: 'The play breaks down. You are at your best when',
      options: ['We repped it and I already know the answer', 'I trust the rules of the play and stay disciplined',
                'I can feel it out and react', 'It is completely off script and I just play'], mb: 'JP' },
    { id: 'learn_style', type: 'single', q: 'You learn a new install fastest by',
      options: ['Seeing it drawn up', 'Hearing it explained', 'Walking through it on the field', 'Watching someone else rep it first'] },
    { id: 'pressure', retired: true, type: 'text', q: 'Describe how you actually feel in the last two minutes of a one-score game. Not the answer you think we want.' }
  ]},

  { section: 'What drives you', items: [
    { id: 'motiv_rank', type: 'single', q: 'Be honest: which of these matters most to you right now?',
      options: ['Playing time as early as possible', 'The best coaching and development I can get',
                'Winning at the highest level', 'NIL and what I can earn',
                'Being close enough that my people can watch me play', 'A degree and what comes after ball'] },
    { id: 'motiv_second', type: 'single', q: 'And second?',
      options: ['Playing time as early as possible', 'The best coaching and development I can get',
                'Winning at the highest level', 'NIL and what I can earn',
                'Being close enough that my people can watch me play', 'A degree and what comes after ball'] },
    { id: 'nil_open', retired: true, type: 'text', q: 'NIL is part of this now, so we ask everybody the same thing straight: how big a factor is money in your decision, and who is helping you think it through?' },
    { id: 'nil_tradeoff', type: 'single', q: 'Two schools want you. One offers real money and you sit two years. One offers less and you compete right away. Today, which way do you lean?',
      options: ['Take the money, I will get my shot eventually', 'Take the field, the money follows the tape',
                'Depends on the school and the position coach', 'I honestly do not know yet'] },
    { id: 'money_advice', retired: true, type: 'text', q: 'What has your family told you about the money side of this?' },
    { id: 'after_ball', retired: true, type: 'text', q: 'If football ended after college, what would you want to be doing at 30?' }
  ]},

  { section: 'Recruitment', items: [
    { id: 'offers', retired: true, type: 'text', q: 'Who has offered, and who is actually still talking to you every week?' },
    { id: 'priorities', retired: true, type: 'text', q: 'What matters most to you in a school? Rank your top three and say why.' },
    { id: 'distance', type: 'single', q: 'How far from home are you willing to go?',
      options: ['Anywhere in the country', 'Same region of the country', 'Within a few hours drive', 'Close enough to come home weekly'] },
    { id: 'agent_has', type: 'single', q: 'Do you have an agent, an NIL rep, or an advisor working on your behalf?',
      options: ['No, nobody', 'A family member handles it', 'Yes, a certified agent or NIL rep', 'Yes, a marketing or collective advisor'] },
    { id: 'agent_who', type: 'short', q: 'If yes, who is it and what agency or group are they with?' },
    { id: 'agent_role', retired: true, type: 'text', q: 'What do they handle for you, and who has the final say on where you go?' },
    { id: 'anything_else', retired: true, type: 'text', q: 'Anything about your game, your situation, or your story a coach should know that we did not ask?' }
  ]}
];

/* Written IQ questions. Film clips are appended from the database. */
const IQ_WRITTEN = [
  { section: 'Personnel and formations', items: [
    { id: 'p11', type: 'single', q: 'What does "11 personnel" mean?',
      options: ['1 RB, 1 TE, 3 WR', '1 RB, 1 WR, 3 TE', '1 QB, 1 RB, everyone else blocks', '1 TE, 1 FB, 3 WR'], answer: 0,
      why: '11 personnel is one back, one tight end, and by subtraction three receivers. The first digit is backs, the second is tight ends.' },
    { id: 'p21', type: 'single', q: 'A team comes out in 21 personnel. How many receivers are on the field?',
      options: ['1', '2', '3', '4'], answer: 1,
      why: 'Two backs and one tight end leaves two receivers.' },
    { id: 'trips', type: 'single', q: 'What is a "trips" formation?',
      options: ['Three receivers to one side', 'Three tight ends', 'Three backs in the backfield', 'An empty backfield'], answer: 0,
      why: 'Trips is three eligible receivers aligned to the same side.' },
    { id: 'strength', type: 'single', q: 'On offense, formation strength is usually declared to the side with',
      options: ['The tight end or the most receivers', 'The wide side of the field always', 'The quarterback\u2019s throwing hand', 'The running back\u2019s alignment'], answer: 0,
      why: 'Strength is normally set to the tight end or the numbers advantage. Field and boundary are a separate call.' }
  ]},
  { section: 'Coverage recognition', items: [
    { id: 'c_safeties', type: 'single', q: 'Two high safeties, corners at seven yards with outside leverage, is most likely',
      options: ['Cover 1', 'Cover 3', 'Cover 2 or Quarters', 'Cover 0'], answer: 2,
      why: 'Two deep safeties rules out single-high. Corner leverage and depth separate Cover 2 from Quarters.' },
    { id: 'c_zero', type: 'single', q: 'What tells you the defense is in Cover 0?',
      options: ['No deep safety and everyone is matched in man', 'One deep safety in the middle', 'Corners bailing at the snap', 'A linebacker dropping to the hook'], answer: 0,
      why: 'Cover 0 is man across with no deep help, which almost always means pressure.' },
    { id: 'c_beat3', type: 'single', q: 'Which route concept most directly attacks Cover 3?',
      options: ['Four verticals', 'A hitch to the field', 'A quarterback draw', 'Max protect and a go route'], answer: 0,
      why: 'Four verticals puts four on three deep defenders and stresses the seams.' },
    { id: 'c_rotate', type: 'single', q: 'Two high safeties before the snap, one drops to the middle at the snap. That is',
      options: ['A rotation to single high', 'Cover 2 staying put', 'A blitz automatically', 'Quarters'], answer: 0,
      why: 'Post-snap rotation from two-high to one-high is the most common disguise a QB must confirm after the snap.' }
  ]},
  { section: 'Situational', items: [
    { id: 's_thirdlong', type: 'single', q: 'Third and 8 from your own 20, two minutes left in the half, no timeouts. Most defenses will',
      options: ['Play soft zone and tackle short of the sticks', 'Bring an all-out blitz', 'Play goal line personnel', 'Sub in an extra lineman'], answer: 0,
      why: 'Down, distance, clock, and field position all point to keeping it in front and making you burn clock.' },
    { id: 's_clock', type: 'single', q: 'Up 4 with 1:50 left, opponent has one timeout, you face 3rd and 2. The safest call is',
      options: ['A run that keeps the clock moving', 'A play-action shot', 'A quick out to the sideline', 'Take a knee'], answer: 0,
      why: 'A run forces the timeout or drains the clock. An incompletion stops it and gives the ball back sooner.' },
    { id: 's_redzone', type: 'text', q: 'The field shrinks in the red zone. Say in your own words what changes for you between the 20 and the goal line.' }
  ]},
  { section: 'Your own game', items: [
    { id: 'iq_prep', type: 'text', q: 'Walk me through your week: when do you watch film, what are you looking for, and who do you watch it with?' },
    { id: 'iq_check', type: 'text', q: 'Describe a time you changed the play or your assignment at the line and why.' },
    { id: 'iq_mistake', type: 'text', q: 'Describe a mental mistake you made this season, what caused it, and what you changed.' }
  ]}
];

const CLIP_OPTIONS_DEFAULT = ['Cover 0', 'Cover 1', 'Cover 2', 'Cover 3', 'Cover 4 / Quarters', 'Cover 6', 'Man free', 'Zone blitz'];

/* Forced-choice pairs -> a four letter type. This is a conversation
   starter for a position coach, not a psychometric instrument: MBTI-style
   typing has weak test-retest reliability and is never scored, ranked,
   or used to filter a prospect. The per-dimension lean is more honest
   than the letters, so both are returned. */
function mbtiType(answers) {
  const dims = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] };
  INTERVIEW.forEach(sec => sec.items.forEach(it => {
    if (!it.mb) return;
    const v = answers[it.id];
    if (v === undefined || v === null || v === '') return;
    const n = Number(v);
    if (Number.isNaN(n)) return;
    const half = Math.max(1, Math.floor((it.options || []).length / 2));
    dims[it.mb][n < half ? 0 : 1]++;
  }));
  const letters = { EI: ['E', 'I'], SN: ['S', 'N'], TF: ['T', 'F'], JP: ['J', 'P'] };
  let type = '', detail = {};
  Object.keys(dims).forEach(k => {
    const [a, b] = dims[k];
    if (!a && !b) { type += '-'; detail[k] = null; return; }
    type += a >= b ? letters[k][0] : letters[k][1];
    detail[k] = { pick: a >= b ? letters[k][0] : letters[k][1], split: `${a}-${b}`, clear: Math.abs(a - b) > 0 };
  });
  return { type, detail, complete: !type.includes('-') };
}

/* 'full' is the one-link version: the interview and the football IQ test
   back to back. Sections keep their own order so a kid warms up on
   himself before he gets to the film. */
const { iqSections, groupFor } = require('./iq-positions');
/* Retired questions are no longer asked, but stay in the bank so an
   athlete who already answered them still reads as words on his profile.
   The athlete and the scorer get the live set; display code passes
   { all: true }. */
function live(sections) {
  return sections.map(s => ({ ...s, items: s.items.filter(i => !i.retired) })).filter(s => s.items.length);
}
function bank(kind, position, opts) {
  const iq = iqSections(position);
  const full = kind === 'iq' ? iq : kind === 'full' ? INTERVIEW.concat(iq) : INTERVIEW;
  return opts && opts.all ? full : live(full);
}
function usesClips(kind) { return kind === 'iq' || kind === 'full'; }
/* Auto-scored questions only: single-select with a defined answer. */
const { scenariosFor } = require('./dots-scenarios');
function score(kind, answers, clips, position) {
  let correct = 0, total = 0;
  const detail = [];
  if (usesClips(kind)) {
    scenariosFor(groupFor(position)).forEach(sc => {
      total++;
      const given = answers['dot_' + sc.id];
      const ok = sc.mode === 'tap' ? String(given) === String(sc.answer) : String(given) === String(sc.answer);
      if (ok) correct++;
      const shown = sc.mode === 'tap' ? (given ? 'tapped ' + given : 'no tap') : ((sc.options || [])[given] || given || '\u2014');
      detail.push({ id: 'dot_' + sc.id, q: sc.q, given, answer: sc.answer, correct: ok, why: sc.why || null,
                    options: sc.mode === 'choice' ? sc.options : null, dots: true, shown });
    });
  }
  bank(kind, position).forEach(sec => sec.items.forEach(it => {
    if (it.answer === undefined) return;
    total++;
    const given = answers[it.id];
    const ok = String(given) === String(it.answer);
    if (ok) correct++;
    detail.push({ id: it.id, q: it.q, given, answer: it.answer, correct: ok, why: it.why || null, options: it.options || null });
  }));
  (clips || []).forEach(c => {
    if (c.answer_index === null || c.answer_index === undefined) return;
    total++;
    const given = answers['clip_' + c.id];
    const ok = String(given) === String(c.answer_index);
    if (ok) correct++;
    const opts = c.options && c.options.length ? c.options : CLIP_OPTIONS_DEFAULT;
    detail.push({ id: 'clip_' + c.id, q: c.question, given, answer: c.answer_index, correct: ok, why: c.explanation || null, options: opts, clip: true });
  });
  return { correct, total, pct: total ? Math.round((correct / total) * 100) : null, detail };
}

module.exports = { INTERVIEW, IQ_WRITTEN, CLIP_OPTIONS_DEFAULT, bank, score, mbtiType, usesClips, groupFor, scenariosFor };
