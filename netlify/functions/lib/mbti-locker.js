/* =====================================================================
   mbti-locker.js
   What each personality type tends to look like in a college football
   locker room, and how to coach it. Used by player.js to explain the
   type on a prospect's profile.

   These are tendencies, not verdicts. A four-letter type is a lens on
   how a player is likely to take information, handle correction and
   carry himself around a team. It is not a grade and it never touches
   the InHome Score. The point is to give a coach a starting read on
   how to reach the kid, which is worth more than the letters.

   Shape per type:
     name      short handle a coach will remember
     line      one sentence
     room      how he tends to show up around a team
     strengths what you get, three items
     watch     where it goes sideways, two or three items
     coach     how to reach him, three items
   ===================================================================== */

const TYPES = {
  ISTJ: {
    name: 'The Standard',
    line: 'Does it the way it was taught, every rep, without being watched.',
    room: 'Quiet, dependable, early. He is the guy the older players trust with the little things because he does not miss them. Not a talker, not a problem, and he notices when others cut corners even if he says nothing.',
    strengths: ['Assignment-sound and consistent from practice to game', 'Holds a routine without supervision', 'Steady in a room that is getting loud or emotional'],
    watch: ['Slow to adjust when a scheme changes mid-week', 'Can read a coaching change as disrespect to the way he learned it', 'Will not speak up when something is wrong unless asked directly'],
    coach: ['Give him the why behind a change, once, clearly', 'Reward reliability out loud; he will not ask for it', 'Ask him what he sees; he will not volunteer it']
  },
  ISFJ: {
    name: 'The Glue',
    line: 'Takes care of people and expects nothing back for it.',
    room: 'The teammate everybody likes and nobody worries about. Remembers the freshman\u2019s name, checks on the injured guy, keeps the mood level. Wants to belong more than he wants to stand out.',
    strengths: ['Lifts the room without needing credit', 'Coachable to a fault, takes correction personally and fixes it', 'Loyal to a program once he commits to it'],
    watch: ['Absorbs criticism as a judgment of him, not the rep', 'Can shrink in a competitive position battle rather than fight for it', 'Avoids conflict he should be having'],
    coach: ['Correct in private, praise in public', 'Frame competition as helping the team, not beating a teammate', 'Tell him plainly when he has earned something; he will not assume it']
  },
  INFJ: {
    name: 'The Reader',
    line: 'Sees what is going on under the surface before anyone says it.',
    room: 'Reserved and thoughtful. Reads the room accurately, picks up on tension early, and often ends up being the one a struggling teammate talks to. Cares about the program meaning something, not just winning.',
    strengths: ['High emotional awareness; knows who is off before the coaches do', 'Plays with purpose when he believes in the plan', 'Private discipline, does his work when nobody is looking'],
    watch: ['Withdraws when he feels the program is not what it claimed to be', 'Can overthink a simple correction', 'Takes losses harder and longer than he shows'],
    coach: ['Connect the work to something bigger than the depth chart', 'Give him a real answer when he asks why', 'Check on him after a bad week; he will say he is fine']
  },
  INTJ: {
    name: 'The Architect',
    line: 'Builds his own plan, executes it, and does not need an audience.',
    room: 'Self-contained and deliberate. Studies more than he talks, respects competence over rank, and will quietly ignore instruction from anyone he thinks does not know more than he does. Not cold, but not warm on purpose either.',
    strengths: ['Prepares like a professional without being told to', 'Learns systems fast and sees how the pieces fit', 'Unbothered by noise, hype, or who is watching'],
    watch: ['Can come across as aloof or arrogant to teammates who read quiet as judgment', 'Will resist a coach he does not respect, silently at first', 'Struggles to fake enthusiasm for team rituals he finds pointless'],
    coach: ['Earn his respect with competence and he is yours; try to earn it with volume and you lose him', 'Give him the whole picture, not just his assignment', 'Put him with a vocal leader; he will not be one, and that is fine']
  },
  ISTP: {
    name: 'The Mechanic',
    line: 'Figures it out by doing it, usually faster than he can explain it.',
    room: 'Low-key, physical, hard to rattle. Bored by meetings, alive on the field. Does not need much from the room socially and does not give much either. Teammates like him because he does not bring drama.',
    strengths: ['Body awareness and instinct; fixes technique by feel', 'Calm under pressure, almost indifferent to it', 'Adapts on the fly when the plan breaks'],
    watch: ['Tunes out installs and long film sessions', 'Treats rules he sees no point in as optional', 'Rarely tells you when he is hurt or struggling'],
    coach: ['Show it, do not lecture it; reps beat whiteboards', 'Short corrections, immediate, then move on', 'Give him a reason for the rule or he will ignore it']
  },
  ISFP: {
    name: 'The Natural',
    line: 'Plays loose, feels the game, and does not want it to become a job.',
    room: 'Easygoing and well liked. Not competitive in the loud way but hates letting people down. Best when he is enjoying it; visibly worse when it turns into pressure and paperwork.',
    strengths: ['Fluid, instinctive movement; plays free', 'Easy to be around, no ego in the room', 'Loyal once he feels seen as a person'],
    watch: ['Motivation fades when the fun does', 'Avoids confrontation, including the productive kind', 'Can drift in a position battle rather than dig in'],
    coach: ['Keep the game the game; protect some joy in the grind', 'Correct without shaming; he already feels it', 'Give him a role he can own and he will guard it']
  },
  INFP: {
    name: 'The Believer',
    line: 'Plays for a reason, and needs the reason to be real.',
    room: 'Quiet, sincere, sometimes underestimated. Cares deeply about the people around him and about the program being honest with him. When he is in, he is all in. When he decides it is fake, he checks out and you may not notice for a while.',
    strengths: ['Deep loyalty to a coach he trusts', 'Empathy; teammates confide in him', 'Plays above himself when the cause is right'],
    watch: ['Takes criticism as a verdict on his worth', 'Can go internal and silent under stress', 'Struggles with hard-edged locker room culture'],
    coach: ['Be straight with him; he can smell a sales pitch', 'Separate the rep from the person when you correct', 'Give him one adult in the building he can talk to']
  },
  INTP: {
    name: 'The Analyst',
    line: 'Wants to understand the whole system before he trusts any part of it.',
    room: 'In his head a lot. Asks the question nobody else thought to ask, then gets quiet again. Not a social leader and not trying to be. Respects coaches who can answer why, loses interest in those who cannot.',
    strengths: ['Grasps scheme quickly and deeply', 'Sees problems in the plan before they show up on Saturday', 'Independent; does not need approval to work'],
    watch: ['Can look disengaged when he is actually processing', 'Slow to turn understanding into aggression', 'Frustrated by drills he considers pointless'],
    coach: ['Answer his questions properly; it is how he buys in', 'Push him from knowing to doing; the gap is his weak spot', 'Do not read quiet as lazy']
  },
  ESTP: {
    name: 'The Competitor',
    line: 'Reacts fast, plays in the moment, wants the ball thrown at him.',
    room: 'Loud, confident, first to the matchup. The room feeds off him and sometimes gets tired of him. Fearless in a way that is an asset on the field and occasionally a problem off it.',
    strengths: ['Plays fast and unafraid; best in chaos', 'Reads and reacts quickly, will bait a throw', 'Pressure is a non-issue; he wants the moment'],
    watch: ['Gets ahead of his own technique when he sees a chance', 'Impatient with repetition and long meetings', 'Off-field decisions can be as impulsive as on-field ones'],
    coach: ['Correct on film the same day; a week later it is gone', 'Make technique work competitive or he will rush it', 'Give him the island matchup; he rises to being trusted']
  },
  ESFP: {
    name: 'The Spark',
    line: 'Brings the energy, needs the room to give some back.',
    room: 'Center of the locker room, whether or not he is the best player in it. Keeps things light, keeps people loose, and knows when the mood is off. Works best when he feels the room is behind him.',
    strengths: ['Lifts a flat practice or a tight sideline', 'Genuinely connects with teammates across groups', 'Plays with visible joy, and it spreads'],
    watch: ['Preparation suffers when the social side takes over', 'Handles a demotion or a benching badly and publicly', 'Can confuse being liked with being ready'],
    coach: ['Channel the energy into a job: he wants a role in the room, give him one', 'Keep him accountable in private; embarrassing him costs you the room', 'Tie prep to the moments he loves']
  },
  ENFP: {
    name: 'The Catalyst',
    line: 'All-in, all at once, and pulls people along with him.',
    room: 'Enthusiastic, warm, talks to everybody. Starts things. Believes in the program loudly when he believes in it. Emotionally honest in a way that can be refreshing or exhausting depending on the day.',
    strengths: ['Buy-in is total when he is bought in', 'Connects people; bridges cliques', 'Creative, sees options others miss'],
    watch: ['Consistency; the energy comes in waves', 'Takes criticism hard and personally', 'Can overcommit and underdeliver on routine'],
    coach: ['Give him the vision; he will run with it', 'Build routine around him rather than expecting him to build it', 'Correct with warmth and specifics']
  },
  ENTP: {
    name: 'The Challenger',
    line: 'Argues to understand, and sometimes just to argue.',
    room: 'Quick, funny, contrarian. Questions the play call, questions the drill, questions the coach, and is right often enough that it is hard to shut down. Teammates enjoy him or want to fight him, sometimes both.',
    strengths: ['Sharp football mind; sees alternatives fast', 'Thrives on improvisation and broken plays', 'Unafraid to speak up when something is wrong'],
    watch: ['Debating instead of doing', 'Can undermine a coach without meaning to', 'Bored by mastery once he has the concept'],
    coach: ['Let him argue in the meeting, not on the field', 'Give him the reason; then require the execution', 'Make him coach a younger player; he learns by explaining']
  },
  ESTJ: {
    name: 'The Captain',
    line: 'Takes charge because somebody should, and it might as well be him.',
    room: 'Organized, direct, vocal. Holds others to the standard and holds himself to it too. The room may not always love him, but it listens. A natural for the leadership council whether or not he is the best player.',
    strengths: ['Accountability; sets and enforces the standard', 'Reliable in every phase, practice to Saturday', 'Comfortable being the voice'],
    watch: ['Rigid when the plan needs to change', 'Can steamroll quieter teammates', 'Struggles to admit he is wrong in front of the group'],
    coach: ['Give him real leadership responsibility early', 'Coach him privately on reading the room', 'Praise flexibility when he shows it; it is not his default']
  },
  ESFJ: {
    name: 'The Connector',
    line: 'Keeps the team together and knows everyone\u2019s business.',
    room: 'Social hub. Organizes, includes, remembers birthdays and injuries. Wants harmony and works for it. Sensitive to being left out or unappreciated, and notices exactly who is and is not pulling their weight.',
    strengths: ['Team-first by nature; cohesion follows him', 'Coachable, wants to please', 'Keeps a locker room from fracturing'],
    watch: ['Takes criticism as rejection', 'Can prioritize being liked over being honest', 'Struggles when the group is divided'],
    coach: ['Recognize his contribution to the room, not just his stat line', 'Correct with respect; it lands harder than you think', 'Use him to bring a new player in']
  },
  ENFJ: {
    name: 'The Leader',
    line: 'Makes the people around him better, and knows it.',
    room: 'Charismatic, engaged, invested in teammates as people. The guy other players follow without being told to. Cares about the program\u2019s character as much as its record.',
    strengths: ['Natural leadership; the room organizes around him', 'Reads people and motivates each one differently', 'Buys in and brings others with him'],
    watch: ['Takes on too much; tries to fix every teammate', 'Struggles when he feels the staff is not straight with him', 'Sensitive to criticism of his leadership specifically'],
    coach: ['Give him a formal role; he is doing it anyway', 'Be honest with him; he is doing the same with you', 'Protect his energy from carrying everyone']
  },
  ENTJ: {
    name: 'The General',
    line: 'Sees the goal, builds the plan, expects everyone to keep up.',
    room: 'Driven, decisive, impatient. Wants to win and does not hide it. Commands respect more than affection, and is fine with that. Will challenge a coach he thinks is soft and follow one he thinks is serious.',
    strengths: ['Elite competitive drive and standards', 'Strategic; understands how the pieces fit', 'Willing to make the hard call'],
    watch: ['Impatient with teammates who are not on his level', 'Can bruise egos without noticing', 'Frustrated by a program he sees as unserious'],
    coach: ['Set the standard high and hold it; he respects that', 'Coach him on bringing the group with him', 'Give him ownership of something; he will run it']
  }
};

function explain(type) {
  const t = String(type || '').toUpperCase().trim();
  const entry = TYPES[t];
  if (!entry) return null;
  return Object.assign({ type: t, letters: letters(t) }, entry);
}

/* the four axes spelled out, so a coach who has never seen the letters
   can read them */
function letters(t) {
  const L = {
    E: ['Extraverted', 'Energized by the group; thinks out loud'],
    I: ['Introverted', 'Energized alone; thinks before speaking'],
    S: ['Sensing', 'Trusts what he sees and can do; concrete, present-tense'],
    N: ['Intuitive', 'Trusts patterns and possibilities; big picture first'],
    T: ['Thinking', 'Takes correction as information; wants the reason'],
    F: ['Feeling', 'Takes correction personally; wants to know you mean well'],
    J: ['Judging', 'Wants the plan, the schedule, the standard'],
    P: ['Perceiving', 'Improvises; comfortable off-script, restless in routine']
  };
  return t.split('').map(c => L[c] ? { letter: c, word: L[c][0], gloss: L[c][1] } : null).filter(Boolean);
}

module.exports = { explain, TYPES };
