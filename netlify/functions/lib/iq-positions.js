/* =====================================================================
   iq-positions.js
   Football IQ, split into a shared core every prospect answers and a
   module for his position group.

   Writing rules for anything added here:
     - Four options, one defensible answer. If two answers can both be
       argued, rewrite the question.
     - Ask what he SEES and what he DOES, not vocabulary trivia. A kid
       who was coached different words should still get it right.
     - `why` is written for the scout reading the result, and is shown
       in preview. It never reaches the athlete.
===================================================================== */

/* Everyone answers these. Coverage ID lives here on purpose: a QB and a
   corner both have to know what they are looking at. */
const CORE = [
  { section: 'Personnel and formations', items: [
    { id: 'p11', type: 'single', q: 'What does "11 personnel" mean?',
      options: ['1 RB, 1 TE, 3 WR', '1 RB, 1 WR, 3 TE', '1 QB, 1 RB, 3 OL eligible', '1 TE, 1 FB, 3 WR'], answer: 0,
      why: 'First digit is backs, second is tight ends. The rest are receivers.' },
    { id: 'p21', type: 'single', q: 'A team lines up in 21 personnel. How many receivers are on the field?',
      options: ['One', 'Two', 'Three', 'Four'], answer: 1,
      why: 'Two backs, one tight end, two receivers.' },
    { id: 'trips', type: 'single', q: 'What is a trips formation?',
      options: ['Three eligible receivers to one side', 'Three tight ends on the field',
                'Three backs in the backfield', 'Nobody in the backfield'], answer: 0,
      why: 'Three eligibles aligned to the same side, however they are stacked or bunched.' },
    { id: 'strength', type: 'single', q: 'Formation strength is usually declared to',
      options: ['The tight end or the extra receiver', 'The wide side of the field, always',
                'The quarterback\u2019s throwing hand', 'Wherever the back is aligned'], answer: 0,
      why: 'Strength follows the numbers or the tight end. Field and boundary is a separate call.' }
  ]},
  { section: 'Coverage recognition', items: [
    { id: 'c_two_high', type: 'single', q: 'Two safeties deep, corners at seven yards with outside leverage. Most likely',
      options: ['Cover 1', 'Cover 3', 'Cover 2 or Quarters', 'Cover 0'], answer: 2,
      why: 'Two deep rules out single high. Corner depth and leverage separate Cover 2 from Quarters.' },
    { id: 'c_zero', type: 'single', q: 'What tells you it is Cover 0?',
      options: ['No deep safety, everybody matched in man', 'One safety in the middle of the field',
                'Both corners bailing at the snap', 'A linebacker dropping to the hook'], answer: 0,
      why: 'No post safety, man across. It almost always means pressure is coming.' },
    { id: 'c_rotate', type: 'single', q: 'Two high before the snap, one safety sprints to the middle at the snap. That is',
      options: ['A rotation down to single high', 'Cover 2 staying put', 'Quarters', 'Automatically a blitz'], answer: 0,
      why: 'Post-snap rotation is the most common disguise. You confirm coverage after the snap, not before.' },
    { id: 'c_beat3', type: 'single', q: 'Which concept most directly stresses Cover 3?',
      options: ['Four verticals', 'A hitch to the field', 'A quarterback sneak', 'Max protect with one go route'], answer: 0,
      why: 'Four on three deep defenders puts two in each seam and forces a choice.' }
  ]},
  { section: 'Situational', items: [
    { id: 's_thirdlong', type: 'single', q: 'Third and 8 from your own 20, under two minutes in the half, they have no timeouts. Most defenses will',
      options: ['Play zone and tackle short of the sticks', 'Bring an all-out blitz',
                'Sub in goal line personnel', 'Play press man across the board'], answer: 0,
      why: 'Down, distance, clock and field position all say keep it in front and make them burn the clock.' },
    { id: 's_clock', type: 'single', q: 'You are up 4 with 1:50 left, they have one timeout, and it is 3rd and 2. The safest call is',
      options: ['A run that keeps the clock moving', 'A play-action shot',
                'A quick out to the sideline', 'Take a knee'], answer: 0,
      why: 'A run forces the timeout or drains clock. An incompletion stops it and hands the ball back sooner.' },
    { id: 's_redzone', type: 'text', q: 'The field shrinks inside the 20. In your own words, what changes for you between the 20 and the goal line?' }
  ]}
];

const BY_POSITION = {
  QB: [
    { section: 'Quarterback', items: [
      { id: 'qb_mike', type: 'single', q: 'You point out the Mike before the snap. What is that mainly doing?',
        options: ['Setting the protection so everyone counts the rush the same way',
                  'Telling the receivers to change their routes',
                  'Telling the back he is going out on a route',
                  'Calling the defense out for the officials'], answer: 0,
        why: 'Identifying the Mike sets the count. Five blockers have to agree on who they are responsible for.' },
      { id: 'qb_hot', type: 'single', q: 'You count more rushers than you can block. What has to happen?',
        options: ['Throw hot to the receiver replacing the unblocked defender',
                  'Slide the line toward the extra rusher and hold the ball',
                  'Take the sack, it is on the line', 'Call timeout every time'], answer: 0,
        why: 'You cannot block everyone. The answer is throwing to the space the extra rusher left.' },
      { id: 'qb_leverage', type: 'single', q: 'A safety is aligned inside and deep over your slot. That takes away',
        options: ['The inside seam route', 'The stop route at the sticks',
                  'The backside slant', 'Nothing, leverage does not matter'], answer: 0,
        why: 'You throw away from leverage. Inside leverage takes away the seam and gives you the out breaking route.' },
      { id: 'qb_progression', type: 'single', q: 'Your first read is covered. The right habit is',
        options: ['Work to the next read in the concept on rhythm',
                  'Scramble immediately and make a play',
                  'Force it in, he is your best player',
                  'Throw it away every time'], answer: 0,
        why: 'Concepts are built in order for a reason. Rhythm progression beats improvising as a first answer.' },
      { id: 'qb_rpo', type: 'single', q: 'On an RPO, who are you actually reading?',
        options: ['The defender the play leaves unblocked', 'The free safety every time',
                  'The nose tackle', 'Whoever the coach points at pre-snap'], answer: 0,
        why: 'The read defender is the one you deliberately do not block. His movement decides give or throw.' },
      { id: 'qb_protect_text', type: 'text', q: 'Walk me through your pre-snap process from breaking the huddle to the snap. Everything you actually look at, in order.' },
      { id: 'qb_bad_text', type: 'text', q: 'Describe an interception you threw this season. What did you see, what was actually there, and what would you do now?' }
    ]}
  ],
  RB: [
    { section: 'Running back', items: [
      { id: 'rb_zone', type: 'single', q: 'On outside zone, your first job is',
        options: ['Press the aiming point and read the block in front of you',
                  'Get to the sideline as fast as possible',
                  'Cut back immediately every time', 'Run to daylight from the snap'], answer: 0,
        why: 'Outside zone is press, read, and then bang, bend, or bounce off what the block gives you.' },
      { id: 'rb_gap', type: 'single', q: 'On a power or gap scheme play, you should be',
        options: ['Following the puller through the hole he creates',
                  'Reading the whole line the same as zone',
                  'Bouncing outside on your own', 'Aiming for the backside A gap'], answer: 0,
        why: 'Gap scheme is a designed hole. You go where the puller takes you rather than reading it out.' },
      { id: 'rb_pass_pro', type: 'single', q: 'You are in protection and nobody blitzes. You should',
        options: ['Scan for a late rusher or leak out as an outlet',
                  'Run downfield immediately', 'Stand still next to the quarterback',
                  'Block the nearest defensive lineman anyway'], answer: 0,
        why: 'A back who does not scan gets his quarterback hit by the second wave.' },
      { id: 'rb_blitz', type: 'single', q: 'A linebacker is coming free at you in protection. Where do you fit him?',
        options: ['Attack downhill and take his inside half', 'Wait at the quarterback\u2019s heels',
                  'Cut him at the ankles from the side', 'Let him go, the quarterback will feel it'], answer: 0,
        why: 'You meet him in the hole and take a half so the quarterback can climb away from the contact.' },
      { id: 'rb_text', type: 'text', q: 'Which of your runs this season looked good on the stat sheet but was actually a bad read by you? Explain it.' }
    ]}
  ],
  WR: [
    { section: 'Receiver', items: [
      { id: 'wr_press', type: 'single', q: 'Press man, corner with outside leverage. Your release should',
        options: ['Attack his leverage and win to the side he is giving you',
                  'Always release outside no matter the leverage',
                  'Stand still and let him commit first', 'Run straight into his chest every rep'], answer: 0,
        why: 'You take what the leverage gives. Fighting into leverage on every rep gets you rerouted.' },
      { id: 'wr_split', type: 'single', q: 'Your split (how wide you line up) mostly affects',
        options: ['The space you have to work and the leverage the corner can take',
                  'Nothing, splits are just for looks', 'Only the run game',
                  'Whether the ball is thrown to you'], answer: 0,
        why: 'Splits create or take away room. Reducing a split can widen a corner and open the inside.' },
      { id: 'wr_cover2', type: 'single', q: 'You are the outside receiver against Cover 2. The soft spot in your area is',
        options: ['The hole behind the corner and in front of the safety',
                  'The deep middle of the field', 'Right at the corner\u2019s feet',
                  'Behind the middle linebacker'], answer: 0,
        why: 'The corner sinks and the safety plays over the top. The honey hole sits between them near the sideline.' },
      { id: 'wr_scramble', type: 'single', q: 'Your quarterback breaks the pocket and scrambles right. You should',
        options: ['Work back toward him and stay in his line of vision',
                  'Keep running your original route exactly',
                  'Stop and block the nearest defender', 'Run to the opposite sideline'], answer: 0,
        why: 'Scramble rules: mirror the quarterback, come open late, stay in the throwing lane.' },
      { id: 'wr_block', type: 'single', q: 'Run play away from you. Your job is',
        options: ['Stalk block your man and stay engaged through the whistle',
                  'Jog toward the ball', 'Stand and watch for a cut back',
                  'Run a fake route to nowhere'], answer: 0,
        why: 'Effort on the backside block is the single most visible character trait on receiver film.' },
      { id: 'wr_text', type: 'text', q: 'Tell me how you set up a defensive back over the course of a game, not just one route.' }
    ]}
  ],
  TE: [
    { section: 'Tight end', items: [
      { id: 'te_align', type: 'single', q: 'Moving from attached on the line to the slot changes your job most by',
        options: ['Changing your leverage, your release and who covers you',
                  'Nothing, the route is the route', 'Only your pass protection assignment',
                  'Making you ineligible'], answer: 0,
        why: 'Alignment changes the defender, the leverage and the release. Tight ends who understand this are hard to cover.' },
      { id: 'te_block', type: 'single', q: 'On a down block, your first responsibility is',
        options: ['The inside gap defender, before you look for anyone else',
                  'The linebacker every time', 'Whoever is loudest',
                  'The backside end'], answer: 0,
        why: 'Gap first, then climb. Missing the inside gap defender blows up the play behind you.' },
      { id: 'te_lb', type: 'single', q: 'A linebacker is covering you with inside leverage in man. That says',
        options: ['He has help inside or in the middle, work the outside breaking route',
                  'He is guessing and you should run a slant',
                  'The defense is in zone', 'You should block instead'], answer: 0,
        why: 'Leverage tells you where the help is. Inside leverage usually means a middle-of-field defender behind him.' },
      { id: 'te_text', type: 'text', q: 'Are you a better blocker or a better receiver right now, honestly, and what are you doing about the other one?' }
    ]}
  ],
  OL: [
    { section: 'Offensive line', items: [
      { id: 'ol_shade', type: 'single', q: 'A defensive tackle is head up on your outside shoulder in the B gap area. What matters most about that alignment?',
        options: ['It tells you his gap responsibility and how you have to set',
                  'Nothing, you block whoever is in front of you',
                  'It means he is definitely rushing', 'It only matters in the run game'], answer: 0,
        why: 'Alignment declares gap. Your set, your first step and your combo all come off it.' },
      { id: 'ol_combo', type: 'single', q: 'On a combination block with the guard, when do you come off to the linebacker?',
        options: ['Once the down lineman is secured and the linebacker declares',
                  'Immediately at the snap', 'Never, you stay on the double',
                  'When the running back passes you'], answer: 0,
        why: 'Come off too early and the down lineman wins. Too late and the linebacker runs free.' },
      { id: 'ol_slide', type: 'single', q: 'The protection slides left. Your responsibility is',
        options: ['The gap to your left, and you pass off anything crossing your face',
                  'The man lined up over you no matter what',
                  'Whoever blitzes first', 'The backside edge'], answer: 0,
        why: 'Slide protection is gap protection. Chasing a man out of your gap opens the one you left.' },
      { id: 'ol_twist', type: 'single', q: 'The end and tackle run a twist. You and the guard should',
        options: ['Pass them off, stay square and take the man who enters your area',
                  'Both chase the first rusher', 'Both drop back and wait',
                  'Cut whoever comes through'], answer: 0,
        why: 'Twists beat linemen who chase. Square shoulders, eyes inside, take what comes to you.' },
      { id: 'ol_text', type: 'text', q: 'Who makes the calls on your line, and what call do you personally make before the snap?' }
    ]}
  ],
  DL: [
    { section: 'Defensive line and edge', items: [
      { id: 'dl_gap', type: 'single', q: 'The single most important thing on any run down is',
        options: ['Being right in your gap before you try to make a play',
                  'Getting upfield as fast as possible every snap',
                  'Reading the quarterback\u2019s eyes', 'Beating your man with a move'], answer: 0,
        why: 'A defensive line is a fence. One guy leaving his gap to chase a play is where big runs come from.' },
      { id: 'dl_down', type: 'single', q: 'The lineman in front of you blocks down away from you. That usually means',
        options: ['Something is coming at you: a pull, a kick out, or a trap',
                  'The play is going away and you should chase flat',
                  'It is a pass', 'He made a mistake'], answer: 0,
        why: 'Down block equals pulling blocker. You squeeze, find the puller and keep your shoulders square.' },
      { id: 'dl_pass_run', type: 'single', q: 'Your fastest pass-run key is usually',
        options: ['The pad level and hands of the lineman in front of you',
                  'Whether the crowd gets loud', 'The receiver split',
                  'The safety rotation'], answer: 0,
        why: 'High hat, hands out is pass. Low pads driving at you is run. It is the first thing you see.' },
      { id: 'dl_rush', type: 'single', q: 'You have beaten your man inside twice with the same move. Next pass down you should',
        options: ['Set that move up and counter off it',
                  'Run the same move again exactly', 'Bull rush every time from now on',
                  'Drop into coverage'], answer: 0,
        why: 'A rush plan is a sequence. The third rep is where the counter cashes in what the first two set up.' },
      { id: 'dl_text', type: 'text', q: 'Describe your pass rush plan for a game. Not moves, the plan: what you try first, what you set up, what you go to on third down.' }
    ]}
  ],
  LB: [
    { section: 'Linebacker', items: [
      { id: 'lb_pull', type: 'single', q: 'You see a guard pull toward the other side. Your first thought is',
        options: ['Follow the puller, the ball is going where he goes',
                  'Drop into coverage', 'Blitz the A gap',
                  'Stay exactly where you are'], answer: 0,
        why: 'Pullers lead you to the football. Reading the guard is the oldest and best linebacker key there is.' },
      { id: 'lb_fit', type: 'single', q: 'On a run to your side, filling your gap means',
        options: ['Taking on the blocker with the correct shoulder and keeping your gap',
                  'Running around the block to get to the ball',
                  'Waiting for the ball carrier to come to you', 'Always shooting the gap upfield'], answer: 0,
        why: 'Fits are a team structure. Running around a block might make one tackle and give up four touchdowns.' },
      { id: 'lb_hook', type: 'single', q: 'You are dropping to the hook or curl zone. You should be',
        options: ['Getting depth and width while looking at the quarterback and feeling receivers',
                  'Running to a spot and standing there',
                  'Turning and running with the first receiver you see',
                  'Watching the running back only'], answer: 0,
        why: 'Zone is not a spot. You gain depth, feel the receivers around you, and break on the quarterback.' },
      { id: 'lb_play_action', type: 'single', q: 'Play action pulls you up and the tight end runs behind you. The mistake was',
        options: ['Reading the back instead of your pass key',
                  'Being too deep at the snap', 'Calling the wrong front',
                  'Nothing, that is unblockable'], answer: 0,
        why: 'Linemen tell you run or pass before the back does. High hats mean get to your drop.' },
      { id: 'lb_text', type: 'text', q: 'What is your check or adjustment when the offense goes to an empty backfield?' }
    ]}
  ],
  DB: [
    { section: 'Defensive back', items: [
      { id: 'db_leverage', type: 'single', q: 'You have inside leverage with a safety over the top. You are protecting',
        options: ['The inside, because you have help deep and outside is your alley',
                  'The outside, because that is where they always throw',
                  'Nothing, leverage is about looks', 'The flat only'], answer: 0,
        why: 'Leverage plus help equals responsibility. You play what you do not have help for.' },
      { id: 'db_split', type: 'single', q: 'A receiver reduces his split way inside. That most often signals',
        options: ['A route that needs room to the outside, or a crack block',
                  'He is tired', 'The play is a run away from him',
                  'Nothing at all'], answer: 0,
        why: 'Splits are a tell. Tight split opens the outside release and shows up in crack schemes.' },
      { id: 'db_cover2', type: 'single', q: 'You are the corner in Cover 2. Your job is',
        options: ['Jam and sink, take away the outside deep until the safety takes over',
                  'Run with your man all the way deep',
                  'Cover the deep middle', 'Blitz off the edge'], answer: 0,
        why: 'Cover 2 corner is a flat and re-route player who protects the sideline underneath the safety.' },
      { id: 'db_run', type: 'single', q: 'Run play comes to your side and you are the force defender. That means',
        options: ['You set the edge and turn the ball back inside',
                  'You run straight at the ball carrier', 'You cover the receiver anyway',
                  'You fill the interior gap'], answer: 0,
        why: 'Force turns it back to the pursuit. Corners who will not set the edge do not play early.' },
      { id: 'db_eyes', type: 'single', q: 'In off zone coverage, your eyes should be on',
        options: ['The quarterback while feeling the receivers in your area',
                  'Your receiver\u2019s feet the whole way',
                  'The football on the ground', 'The sideline'], answer: 0,
        why: 'Zone is quarterback eyes. Man is receiver eyes. Mixing them up is how you give up the big one.' },
      { id: 'db_text', type: 'text', q: 'Tell me about a route you got beat on this season. What did the receiver do to you and how do you play it now?' }
    ]}
  ],
  K: [
    { section: 'Specialist', items: [
      { id: 'k_op', type: 'single', q: 'On a field goal, the operation time you are aiming for from snap to kick is roughly',
        options: ['About 1.3 seconds', 'About 2.5 seconds', 'About 3 seconds', 'It does not matter'], answer: 0,
        why: '1.3 or under is the standard. Slower than that and blocks come from the edges.' },
      { id: 'k_wind', type: 'text', q: 'How does wind change your approach and your target line? Be specific.' },
      { id: 'k_miss', type: 'text', q: 'You miss one early. Walk me through what happens in your head before the next one.' }
    ]}
  ]
};

/* Report position codes -> module key */
const GROUP = {
  QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE',
  OL: 'OL', OT: 'OL', OG: 'OL', C: 'OL',
  DL: 'DL', DE: 'DL', DT: 'DL', NG: 'DL', NT: 'DL', EDGE: 'DL', JACK: 'DL',
  LB: 'LB', ILB: 'LB', OLB: 'LB', MLB: 'LB',
  DB: 'DB', CB: 'DB', S: 'DB', SS: 'DB', FS: 'DB', NB: 'DB', SAF: 'DB',
  K: 'K', P: 'K', LS: 'K'
};
function groupFor(position) {
  if (!position) return null;
  return GROUP[String(position).toUpperCase()] || null;
}
/* Core plus his module. Unknown or missing position gets the core only,
   which still stands on its own. */
function iqSections(position) {
  const g = groupFor(position);
  return g && BY_POSITION[g] ? CORE.concat(BY_POSITION[g]) : CORE;
}

module.exports = { CORE, BY_POSITION, GROUP, groupFor, iqSections };
