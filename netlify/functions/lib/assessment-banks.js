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
    { id: 'household', type: 'text', q: 'Who is in your corner day to day, and who do you call when it goes bad?' },
    { id: 'jobs', type: 'text', q: 'Do you work, help raise siblings, or carry anything outside of school and ball?' },
    { id: 'school_hard', type: 'text', q: 'What class has been hardest for you and what did you do about it?' }
  ]},
  { section: 'Coachability', items: [
    { id: 'hard_coach', type: 'text', q: 'Tell me about a coach who got on you hard. What did he say and what did you do next?' },
    { id: 'criticism', type: 'scale', q: 'How do you take criticism in front of your teammates?', low: 'It gets to me', high: 'I want it', max: 5 },
    { id: 'correction', type: 'text', q: 'What is the last thing a coach corrected in your technique, and where are you with it now?' },
    { id: 'film_habits', type: 'single', q: 'How often do you watch film on your own, not as a team?',
      options: ['Never', 'Once in a while', 'Weekly', 'Multiple times a week', 'Daily in season'] },
    { id: 'film_what', type: 'text', q: 'When you watch your own film, what are you actually looking for?' }
  ]},
  { section: 'Adversity', items: [
    { id: 'worst_game', type: 'text', q: 'Walk me through your worst game. What happened, and what did you do that week after?' },
    { id: 'injury', type: 'text', q: 'Have you been hurt? What was it, how long, and how did you handle being out?' },
    { id: 'benched', type: 'text', q: 'Have you ever lost a starting job or a role? What was that like and how did it end?' },
    { id: 'conflict', type: 'text', q: 'Tell me about a time you had a problem with a teammate or a coach and how it got resolved.' }
  ]},
  { section: 'Leadership', items: [
    { id: 'lead_style', type: 'single', q: 'How do you lead?',
      options: ['By example, I am not loud', 'Vocal, I get on people', 'Both depending on who it is', 'I am not a leader yet and I know it'] },
    { id: 'lead_example', type: 'text', q: 'Give me one specific time you led when it cost you something.' },
    { id: 'teammate_say', type: 'text', q: 'What would the teammate who likes you least say about you?' }
  ]},
  { section: 'Self-awareness', items: [
    { id: 'strength', type: 'text', q: 'What is the one thing on your film a coach should trust?' },
    { id: 'weakness', type: 'text', q: 'What do you wish coaches would not see on your film?' },
    { id: 'two_years', type: 'text', q: 'Where are you as a player in two years? Be realistic.' },
    { id: 'why_you', type: 'text', q: 'A coach has one scholarship and you and a kid with better numbers. Why you?' }
  ]},
  { section: 'Academics and eligibility', items: [
    { id: 'gpa', type: 'short', q: 'Current GPA' },
    { id: 'core_gpa', type: 'short', q: 'Core-course GPA if you know it' },
    { id: 'test', type: 'short', q: 'ACT or SAT if you have taken it' },
    { id: 'ncaa_id', type: 'single', q: 'Are you registered with the NCAA Eligibility Center?', options: ['Yes', 'No', 'Not sure'] },
    { id: 'major', type: 'text', q: 'What do you want to study, and what happens if football ends tomorrow?' }
  ]},
  { section: 'How you are wired', items: [
    { id: 'mb_ei', type: 'single', q: 'After a hard practice, what actually recharges you?',
      options: ['Being around the guys, talking it out', 'Getting to myself for a while'], mb: 'EI' },
    { id: 'mb_ei2', type: 'single', q: 'In a new locker room, you are usually',
      options: ['One of the first guys talking to everybody', 'Quiet at first, I watch and then pick my spots'], mb: 'EI' },
    { id: 'mb_sn', type: 'single', q: 'A coach installs a new scheme. What helps you more?',
      options: ['Show me the details, rep by rep, exactly what my job is', 'Show me the big picture first, then I fill in my part'], mb: 'SN' },
    { id: 'mb_sn2', type: 'single', q: 'When you study film you mostly notice',
      options: ['What actually happened on the play, step by step', 'What it means for the game plan and what is coming next'], mb: 'SN' },
    { id: 'mb_tf', type: 'single', q: 'A teammate is not pulling his weight. You',
      options: ['Tell him straight, the standard is the standard', 'Figure out what is going on with him first'], mb: 'TF' },
    { id: 'mb_tf2', type: 'single', q: 'What gets more out of you from a coach?',
      options: ['Hard, direct, no sugar on it', 'Someone who knows me and coaches me that way'], mb: 'TF' },
    { id: 'mb_jp', type: 'single', q: 'Game week, you are',
      options: ['On a routine, same schedule, everything planned', 'Loose, I go with how the week feels'], mb: 'JP' },
    { id: 'mb_jp2', type: 'single', q: 'The play breaks down. You are at your best when',
      options: ['I already know the answer because we repped it', 'It is off script and I can just play'], mb: 'JP' },
    { id: 'learn_style', type: 'single', q: 'You learn a new install fastest by',
      options: ['Seeing it drawn up', 'Hearing it explained', 'Walking through it on the field', 'Watching someone else rep it first'] },
    { id: 'pressure', type: 'text', q: 'Describe how you actually feel in the last two minutes of a one-score game. Not the answer you think we want.' }
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
    { id: 'nil_open', type: 'text', q: 'NIL is part of this now, so we ask everybody the same thing straight: how big a factor is money in your decision, and who is helping you think it through?' },
    { id: 'nil_tradeoff', type: 'single', q: 'Two schools want you. One offers real money and you sit two years. One offers less and you compete right away. Today, which way do you lean?',
      options: ['Take the money, I will get my shot', 'Take the field, the money follows', 'Depends on the school and the coach', 'I honestly do not know yet'] },
    { id: 'money_advice', type: 'text', q: 'What has your family told you about the money side of this?' },
    { id: 'after_ball', type: 'text', q: 'If football ended after college, what would you want to be doing at 30?' }
  ]},

  { section: 'Recruitment', items: [
    { id: 'offers', type: 'text', q: 'Who has offered, and who is actually still talking to you every week?' },
    { id: 'priorities', type: 'text', q: 'What matters most to you in a school? Rank your top three and say why.' },
    { id: 'distance', type: 'single', q: 'How far from home are you willing to go?',
      options: ['Anywhere', 'Same region', 'Within a few hours', 'Close to home only'] },
    { id: 'anything_else', type: 'text', q: 'Anything about your game, your situation, or your story a coach should know that we did not ask?' }
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
    dims[it.mb][Number(v) === 0 ? 0 : 1]++;
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

function bank(kind) {
  return kind === 'iq' ? IQ_WRITTEN : INTERVIEW;
}
/* Auto-scored questions only: single-select with a defined answer. */
function score(kind, answers, clips) {
  let correct = 0, total = 0;
  const detail = [];
  bank(kind).forEach(sec => sec.items.forEach(it => {
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

module.exports = { INTERVIEW, IQ_WRITTEN, CLIP_OPTIONS_DEFAULT, bank, score, mbtiType };
