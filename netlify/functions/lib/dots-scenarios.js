/* =====================================================================
   dots-scenarios.js
   The whiteboard, on a phone. Each scenario draws an offense and a
   defense as dots on a field. Down linemen render as triangles (in a
   stance), everyone else as circles. The athlete either TAPS a defender
   or picks from four options. He gets the verdict immediately, like a
   coach at a whiteboard, and the scout gets the answer log.

   Coordinates: 0-600 wide, 0-340 tall. Line of scrimmage y=195.
   Offense below the line, defense above. Offense dots are labeled;
   defenders never are, that is the test.

   Answer conventions used here (keep scenarios consistent with them):
     - In a four-down front the Mike is the middle linebacker; the count
       starts there. In a three-down front with two inside backers the
       scenarios do not ask for the Mike, they ask for the front.
     - 3-technique: outside shoulder of a guard. 1-tech / shade: inside
       shoulder of a guard or on the center. 5-tech: outside shoulder of
       the tackle. 9-tech: outside the tight end.
     - Over: 3-tech to the tight end side. Under: 3-tech away from it.
===================================================================== */

const OFF = {
  /* 11 personnel, TE attached right, gun, back offset left */
  gun11: [
    { id: 'LT', x: 215, y: 218, l: 'T' }, { id: 'LG', x: 258, y: 218, l: 'G' }, { id: 'C', x: 300, y: 218, l: 'C' },
    { id: 'RG', x: 342, y: 218, l: 'G' }, { id: 'RT', x: 385, y: 218, l: 'T' }, { id: 'TE', x: 430, y: 220, l: 'Y' },
    { id: 'QB', x: 300, y: 262, l: 'Q' }, { id: 'RB', x: 258, y: 262, l: 'R' },
    { id: 'X', x: 60, y: 222, l: 'X' }, { id: 'H', x: 490, y: 232, l: 'H' }, { id: 'Z', x: 560, y: 222, l: 'Z' }
  ],
  /* 10 personnel, 2x2, gun, back right */
  gun10: [
    { id: 'LT', x: 215, y: 218, l: 'T' }, { id: 'LG', x: 258, y: 218, l: 'G' }, { id: 'C', x: 300, y: 218, l: 'C' },
    { id: 'RG', x: 342, y: 218, l: 'G' }, { id: 'RT', x: 385, y: 218, l: 'T' },
    { id: 'QB', x: 300, y: 262, l: 'Q' }, { id: 'RB', x: 342, y: 262, l: 'R' },
    { id: 'X', x: 55, y: 222, l: 'X' }, { id: 'A', x: 130, y: 232, l: 'A' }, { id: 'H', x: 470, y: 232, l: 'H' }, { id: 'Z', x: 545, y: 222, l: 'Z' }
  ],
  /* 12 personnel, two TEs attached, gun */
  gun12: [
    { id: 'TE2', x: 170, y: 220, l: 'U' }, { id: 'LT', x: 215, y: 218, l: 'T' }, { id: 'LG', x: 258, y: 218, l: 'G' }, { id: 'C', x: 300, y: 218, l: 'C' },
    { id: 'RG', x: 342, y: 218, l: 'G' }, { id: 'RT', x: 385, y: 218, l: 'T' }, { id: 'TE', x: 430, y: 220, l: 'Y' },
    { id: 'QB', x: 300, y: 262, l: 'Q' }, { id: 'RB', x: 258, y: 262, l: 'R' },
    { id: 'X', x: 60, y: 222, l: 'X' }, { id: 'Z', x: 560, y: 222, l: 'Z' }
  ]
};

/* defenders: t = 'dl' (triangle) or 'lb' / 'db' (circle) */
const DEF = {
  over43: [
    { id: 'WE', t: 'dl', x: 190, y: 170 }, { id: 'NT', t: 'dl', x: 278, y: 170 }, { id: 'DT3', t: 'dl', x: 362, y: 170 }, { id: 'SE', t: 'dl', x: 455, y: 170 },
    { id: 'W', t: 'lb', x: 235, y: 128 }, { id: 'M', t: 'lb', x: 305, y: 128 }, { id: 'S', t: 'lb', x: 405, y: 128 },
    { id: 'LC', t: 'db', x: 62, y: 165 }, { id: 'RC', t: 'db', x: 558, y: 165 }, { id: 'FS', t: 'db', x: 300, y: 48 }, { id: 'SS', t: 'db', x: 468, y: 98 }
  ],
  under43: [
    { id: 'WE', t: 'dl', x: 190, y: 170 }, { id: 'DT3', t: 'dl', x: 238, y: 170 }, { id: 'NT', t: 'dl', x: 322, y: 170 }, { id: 'SE', t: 'dl', x: 405, y: 170 },
    { id: 'W', t: 'lb', x: 235, y: 128 }, { id: 'M', t: 'lb', x: 318, y: 128 }, { id: 'S', t: 'lb', x: 455, y: 172 },
    { id: 'LC', t: 'db', x: 62, y: 165 }, { id: 'RC', t: 'db', x: 558, y: 165 }, { id: 'FS', t: 'db', x: 300, y: 48 }, { id: 'SS', t: 'db', x: 480, y: 100 }
  ],
  odd34: [
    { id: 'DE1', t: 'dl', x: 238, y: 170 }, { id: 'NG', t: 'dl', x: 300, y: 170 }, { id: 'DE2', t: 'dl', x: 362, y: 170 },
    { id: 'WOLB', t: 'lb', x: 185, y: 160 }, { id: 'SOLB', t: 'lb', x: 455, y: 160 },
    { id: 'ILB1', t: 'lb', x: 262, y: 128 }, { id: 'ILB2', t: 'lb', x: 342, y: 128 },
    { id: 'LC', t: 'db', x: 62, y: 165 }, { id: 'RC', t: 'db', x: 558, y: 165 }, { id: 'FS', t: 'db', x: 262, y: 50 }, { id: 'SS', t: 'db', x: 380, y: 50 }
  ],
  bear: [
    { id: 'DE1', t: 'dl', x: 190, y: 170 }, { id: 'DT1', t: 'dl', x: 258, y: 170 }, { id: 'NG', t: 'dl', x: 300, y: 170 }, { id: 'DT2', t: 'dl', x: 342, y: 170 }, { id: 'DE2', t: 'dl', x: 455, y: 170 },
    { id: 'LB1', t: 'lb', x: 255, y: 128 }, { id: 'LB2', t: 'lb', x: 355, y: 128 },
    { id: 'LC', t: 'db', x: 62, y: 165 }, { id: 'RC', t: 'db', x: 558, y: 165 }, { id: 'FS', t: 'db', x: 300, y: 48 }, { id: 'SS', t: 'db', x: 480, y: 120 }
  ],
  nickelBlitz: [
    { id: 'WE', t: 'dl', x: 190, y: 170 }, { id: 'NT', t: 'dl', x: 278, y: 170 }, { id: 'DT3', t: 'dl', x: 362, y: 170 }, { id: 'SE', t: 'dl', x: 410, y: 170 },
    { id: 'W', t: 'lb', x: 245, y: 128 }, { id: 'M', t: 'lb', x: 335, y: 128 },
    { id: 'NB', t: 'db', x: 468, y: 172 },
    { id: 'LC', t: 'db', x: 55, y: 165 }, { id: 'RC', t: 'db', x: 545, y: 165 }, { id: 'FS', t: 'db', x: 300, y: 48 }, { id: 'SS', t: 'db', x: 150, y: 110 }
  ],
  nickel2high: [
    { id: 'WE', t: 'dl', x: 190, y: 170 }, { id: 'NT', t: 'dl', x: 278, y: 170 }, { id: 'DT3', t: 'dl', x: 362, y: 170 }, { id: 'SE', t: 'dl', x: 410, y: 170 },
    { id: 'W', t: 'lb', x: 245, y: 128 }, { id: 'M', t: 'lb', x: 335, y: 128 },
    { id: 'NB', t: 'db', x: 452, y: 150 },
    { id: 'LC', t: 'db', x: 55, y: 165 }, { id: 'RC', t: 'db', x: 545, y: 165 }, { id: 'FS', t: 'db', x: 190, y: 50 }, { id: 'SS', t: 'db', x: 410, y: 50 }
  ],
  single1: [
    { id: 'WE', t: 'dl', x: 190, y: 170 }, { id: 'NT', t: 'dl', x: 278, y: 170 }, { id: 'DT3', t: 'dl', x: 362, y: 170 }, { id: 'SE', t: 'dl', x: 410, y: 170 },
    { id: 'W', t: 'lb', x: 245, y: 128 }, { id: 'M', t: 'lb', x: 335, y: 128 },
    { id: 'NB', t: 'db', x: 470, y: 205 },
    { id: 'LC', t: 'db', x: 62, y: 205 }, { id: 'RC', t: 'db', x: 545, y: 205 }, { id: 'FS', t: 'db', x: 300, y: 45 }, { id: 'SS', t: 'db', x: 140, y: 205 }
  ]
};

/* Motion scenarios: `motion` is where named defenders end up after the
   snap. The page shows the pre-snap look, the athlete hits Snap, the
   dots move, then he answers. Replay is unlimited. */
const MOTION = [
  { id: 'm_sky', groups: ['ALL'], off: 'gun11', def: 'nickel2high', mode: 'choice', snap: true,
    motion: { SS: { x: 452, y: 122 }, FS: { x: 300, y: 48 }, NB: { x: 470, y: 178 } }, duration: 900,
    q: 'Two high before the snap. Watch the safeties. What is the coverage after the snap?',
    options: ['Cover 3, strong safety rotated down', 'Cover 2, nothing changed', 'Cover 0, everybody came', 'Quarters'], answer: 0,
    why: 'The strong safety drops into the box and the free safety spins to the middle. Two high became single high: a Cover 3 rotation, sometimes called Sky.' },
  { id: 'm_stay', groups: ['ALL'], off: 'gun10', def: 'nickel2high', mode: 'choice', snap: true,
    motion: { FS: { x: 186, y: 56 }, SS: { x: 414, y: 56 } }, duration: 800,
    q: 'Two high before the snap. Watch the safeties. What is the coverage after the snap?',
    options: ['Cover 2 or Quarters, they stayed two high', 'Cover 3, one rotated', 'Cover 1, one rotated', 'Cover 0'], answer: 0,
    why: 'Both safeties held their depth and width. Two high stayed two high. Corner depth is what separates 2 from Quarters from here.' },
  { id: 'm_spin', groups: ['ALL'], off: 'gun10', def: 'single1', mode: 'choice', snap: true,
    motion: { FS: { x: 190, y: 56 }, SS: { x: 410, y: 58 }, LC: { x: 62, y: 170 }, RC: { x: 545, y: 170 }, NB: { x: 452, y: 152 } }, duration: 900,
    q: 'Single high before the snap. Watch it. What happened?',
    options: ['They spun to two high, it was a disguise', 'It stayed single high', 'Everybody blitzed', 'The corners came off'], answer: 0,
    why: 'The strong safety bailed from the box to a deep half and the corners backed off. Single-high look, two-high coverage. This is how they bait a post throw.' },
  { id: 'm_zero_bluff', groups: ['QB', 'RB', 'OL'], off: 'gun11', def: 'nickelBlitz', mode: 'choice', snap: true,
    motion: { NB: { x: 470, y: 150 }, SS: { x: 300, y: 48 }, FS: { x: 300, y: 48 } }, duration: 800,
    q: 'The nickel is walked up showing blitz. Watch the snap. Did he come?',
    options: ['No, he bailed to coverage and a safety got deep', 'Yes, six came', 'Yes, and it is Cover 0', 'Cannot tell'], answer: 0,
    why: 'Walked up, then out. The nickel dropped and the safety got to the middle. The show was the bluff; your hot answer was not needed.' },
  { id: 'm_blitz_real', groups: ['QB', 'RB', 'OL'], off: 'gun11', def: 'nickelBlitz', mode: 'tap', snap: true,
    motion: { NB: { x: 445, y: 195 }, M: { x: 300, y: 170 }, FS: { x: 300, y: 48 }, SS: { x: 150, y: 110 } }, duration: 700,
    q: 'Same look. Watch the snap. Tap the defender who came that your five linemen cannot account for.', answer: 'NB',
    why: 'Four down plus the Mike is five, which the line handles. The nickel off the edge is the sixth. He is the one your hot rule answers.' },
  { id: 'm_lb_pull', groups: ['LB', 'DL'], off: 'gun11', def: 'over43', mode: 'choice', snap: true,
    motion: { LG: { x: 372, y: 224 } }, offMotion: true, duration: 700,
    q: 'Watch the left guard at the snap. Where is the ball going?',
    options: ['Right, behind the puller', 'Left, away from him', 'It is a pass', 'Up the middle'], answer: 0,
    why: 'The left guard pulled across the formation. The puller is the play. Fit off him.' }
];

/* One corner rolls with Z so leverage reads stay honest across splits. */
function splitDef(cx){
  return [
    { id: 'WE', t: 'dl', x: 190, y: 170 }, { id: 'NT', t: 'dl', x: 278, y: 170 }, { id: 'DT3', t: 'dl', x: 362, y: 170 }, { id: 'SE', t: 'dl', x: 455, y: 170 },
    { id: 'W', t: 'lb', x: 235, y: 128 }, { id: 'M', t: 'lb', x: 305, y: 128 }, { id: 'S', t: 'lb', x: 405, y: 128 },
    { id: 'LC', t: 'db', x: 62, y: 165 }, { id: 'RC', t: 'db', x: cx, y: 150 },
    { id: 'FS', t: 'db', x: 300, y: 48 }, { id: 'SS', t: 'db', x: 470, y: 95 }
  ];
}
DEF.splitNasty = splitDef(433);
DEF.splitHashPlus = splitDef(478);
DEF.splitNumbers = splitDef(528);
DEF.splitWide = splitDef(584);

const SCENARIOS = [
  /* ---------- everyone: fronts and shells ---------- */
  { id: 'd_front_over', groups: ['QB', 'RB', 'OL', 'DL', 'LB'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'Name this front.', options: ['4-3 Over', '4-3 Under', '3-4 Odd', 'Bear'], answer: 0,
    why: 'Four down. The 3-technique sits on the guard\u2019s outside shoulder to the tight end side, so the front is shaded OVER to strength.' },
  { id: 'd_front_under', groups: ['QB', 'RB', 'OL', 'DL', 'LB'], off: 'gun11', def: 'under43', mode: 'choice',
    q: 'Name this front.', options: ['4-3 Over', '4-3 Under', '3-4 Odd', 'Bear'], answer: 1,
    why: 'The 3-technique is away from the tight end and the Sam is walked up on the edge over him. That is Under.' },
  { id: 'd_front_odd', groups: ['QB', 'RB', 'OL', 'DL', 'LB'], off: 'gun12', def: 'odd34', mode: 'choice',
    q: 'Name this front.', options: ['4-3 Over', '4-3 Under', '3-4 Odd', 'Bear'], answer: 2,
    why: 'Three down with a nose on the center, outside backers on the edges, two inside backers. Odd front.' },
  { id: 'd_front_bear', groups: ['QB', 'RB', 'OL', 'DL', 'LB'], off: 'gun11', def: 'bear', mode: 'choice',
    q: 'Name this front.', options: ['4-3 Over', '4-3 Under', '3-4 Odd', 'Bear'], answer: 3,
    why: 'Nose plus a defender covering each guard: three interior linemen are covered. That is the Bear look, and it is a run stopper and a protection headache.' },
  { id: 'd_shell_two', groups: ['ALL'], off: 'gun10', def: 'nickel2high', mode: 'choice',
    q: 'Pre-snap, what is the shell?', options: ['Single high', 'Two high', 'Zero, nobody deep', 'Cannot tell'], answer: 1,
    why: 'Two safeties at depth, splitting the hashes. Two high. You confirm after the snap whether it stays that way.' },
  { id: 'd_shell_single', groups: ['ALL'], off: 'gun10', def: 'single1', mode: 'tap',
    q: 'Single high. Tap the post safety.', answer: 'FS',
    why: 'One deep defender in the middle of the field. Everyone else is at the line or in the flats.' },
  { id: 'd_tap_3tech', groups: ['QB', 'RB', 'OL', 'DL', 'LB'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'Tap the 3-technique.', answer: 'DT3',
    why: 'Outside shoulder of the guard. Here he is on the tight end side.' },

  /* ---------- QB ---------- */
  { id: 'd_qb_mike43', groups: ['QB', 'RB', 'OL'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'You are setting the protection. Tap the Mike.', answer: 'M',
    why: 'Four down, three backers. The count starts from the middle backer: he is the Mike, and the five offensive linemen work off him.' },
  { id: 'd_qb_mike_nickel', groups: ['QB', 'RB', 'OL'], off: 'gun10', def: 'nickel2high', mode: 'tap',
    q: 'Nickel, two backers. Tap the Mike.', answer: 'M',
    why: 'With two backers the Mike is the one aligned over the center or to the side the protection is declared. Here he sits over the center.' },
  { id: 'd_qb_pressure', groups: ['QB', 'RB', 'OL'], off: 'gun11', def: 'nickelBlitz', mode: 'tap',
    q: 'Someone is showing pressure. Tap him.', answer: 'NB',
    why: 'The nickel has walked down onto the line over the slot. That is a sixth potential rusher and your count has to include him.' },
  { id: 'd_qb_hot', groups: ['QB'], off: 'gun11', def: 'nickelBlitz', mode: 'choice',
    q: 'If the nickel comes and you cannot block him, who is hot?', options: ['H, the slot he left', 'X, the backside receiver', 'Y, the tight end', 'The running back'], answer: 0,
    why: 'The rusher leaves his coverage responsibility. The slot he was over is the space that just opened.' },
  { id: 'd_qb_leverage', groups: ['QB', 'WR', 'TE'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'The strong safety is inside and over the slot. Which route to H is he taking away?', options: ['The seam', 'The out', 'The bubble', 'The hitch'], answer: 0,
    why: 'Inside leverage with depth takes the inside vertical. You throw away from leverage: the out or the flat.' },
  { id: 'd_qb_rpo', groups: ['QB', 'RB'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'Zone read to the left. The offense leaves the backside end unblocked. Tap your read.', answer: 'SE',
    why: 'Zone read left means the right end is backside. He is the one nobody blocks, and what he does decides give or keep.' },

  /* ---------- RB ---------- */
  { id: 'd_rb_will', groups: ['RB'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'Six-man protection. You have the Will, the weakside backer. Tap him.', answer: 'W',
    why: 'Weak side is away from the tight end. The backer on that side is the Will.' },
  { id: 'd_rb_scan', groups: ['RB'], off: 'gun11', def: 'nickelBlitz', mode: 'choice',
    q: 'Your backer drops into coverage. What now?', options: ['Scan to the nickel side, then release', 'Release immediately on a route', 'Stand next to the quarterback', 'Block the 3-technique'], answer: 0,
    why: 'Your man dropping does not end your job. The nickel is walked up on the other side. Scan to the threat, then leak.' },

  /* ---------- OL ---------- */
  { id: 'd_ol_slide', groups: ['OL'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'Protection slides left. The right side is man. Who does the right tackle have?', options: ['The strongside end', 'The 3-technique', 'The Sam', 'The Mike'], answer: 0,
    why: 'Slide left means the left four take their left gaps. The right tackle is man on the end man on the line to his side.' },
  { id: 'd_ol_combo', groups: ['OL'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'Right guard and right tackle combo the 3-technique. Tap the backer they are climbing to.', answer: 'M',
    why: 'The combination works the 3-tech back to the Mike. That is the second-level defender who fits that gap.' },

  /* ---------- DL / LB / DB ---------- */
  { id: 'd_dl_gap', groups: ['DL'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'You are the 3-technique. Which gap is yours?', options: ['B gap', 'A gap', 'C gap', 'Whichever is open'], answer: 0,
    why: 'Outside shoulder of the guard is the B gap. Leave it and the ball goes through it.' },
  { id: 'd_lb_puller', groups: ['LB'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'The left guard pulls right at the snap. Where does the ball go?', options: ['Right, follow the puller', 'Left, away from the pull', 'It is a pass', 'Straight up the middle'], answer: 0,
    why: 'Pullers lead you to the ball. He is going where the play is.' },
  { id: 'd_db_two', groups: ['DB'], off: 'gun10', def: 'nickel2high', mode: 'tap',
    q: 'You are the field corner. Tap the defender who has your deep help.', answer: 'SS',
    why: 'Two high. Your help is the safety on your side, not the one across the field.' },
  { id: 'd_db_no2', groups: ['DB', 'LB'], off: 'gun10', def: 'nickel2high', mode: 'choice',
    q: 'Quarters. The slot (#2) runs straight down the field. Who takes him?', options: ['The safety to that side', 'The corner', 'The Mike', 'Nobody, it is zone'], answer: 0,
    why: 'Quarters rules: the safety takes #2 vertical past ten yards. The corner stays on #1.' }
];


/* =====================================================================
   POSITION MODULES (about ten looks each). Conventions at top of file.
===================================================================== */
OFF.trips = [
  { id: 'LT', x: 215, y: 218, l: 'T' }, { id: 'LG', x: 258, y: 218, l: 'G' }, { id: 'C', x: 300, y: 218, l: 'C' },
  { id: 'RG', x: 342, y: 218, l: 'G' }, { id: 'RT', x: 385, y: 218, l: 'T' },
  { id: 'QB', x: 300, y: 262, l: 'Q' }, { id: 'RB', x: 258, y: 262, l: 'R' },
  { id: 'X', x: 55, y: 222, l: 'X' }, { id: 'Y', x: 440, y: 232, l: 'Y' }, { id: 'H', x: 500, y: 222, l: 'H' }, { id: 'Z', x: 560, y: 232, l: 'Z' }
];
OFF.empty = [
  { id: 'LT', x: 215, y: 218, l: 'T' }, { id: 'LG', x: 258, y: 218, l: 'G' }, { id: 'C', x: 300, y: 218, l: 'C' },
  { id: 'RG', x: 342, y: 218, l: 'G' }, { id: 'RT', x: 385, y: 218, l: 'T' },
  { id: 'QB', x: 300, y: 262, l: 'Q' },
  { id: 'X', x: 55, y: 222, l: 'X' }, { id: 'A', x: 130, y: 232, l: 'A' }, { id: 'RB', x: 470, y: 232, l: 'R' }, { id: 'H', x: 505, y: 222, l: 'H' }, { id: 'Z', x: 560, y: 232, l: 'Z' }
];
/* Split presets. Hash marks render at x=200 and x=400; the numbers sit
   around x=500; sideline is x=600. Z is moved to the named split and
   everything else holds, so the only variable is where he lines up. */
function splitOff(zx){
  /* 10 personnel so Z is unmistakably the split being asked about: no
     tight end next to him to confuse the picture. */
  const base = OFF.gun11.filter(o => !['Z', 'H', 'TE'].includes(o.id));
  return base.concat([{ id: 'Z', x: zx, y: 222, l: 'Z' }]);
}
OFF.splitNasty   = splitOff(425);   // tucked in tight to the formation
OFF.splitHashPlus= splitOff(470);   // a couple outside the hash
OFF.splitNumbers = splitOff(520);   // numbers locked
OFF.splitWide    = splitOff(578);   // wide, on top of the sideline
DEF.pressOff = [ /* press on the left corner, off on the right, two high */
  { id: 'WE', t: 'dl', x: 190, y: 170 }, { id: 'NT', t: 'dl', x: 278, y: 170 }, { id: 'DT3', t: 'dl', x: 362, y: 170 }, { id: 'SE', t: 'dl', x: 410, y: 170 },
  { id: 'W', t: 'lb', x: 245, y: 128 }, { id: 'M', t: 'lb', x: 335, y: 128 }, { id: 'NB', t: 'db', x: 455, y: 150 },
  { id: 'LC', t: 'db', x: 62, y: 188 }, { id: 'RC', t: 'db', x: 545, y: 120 }, { id: 'FS', t: 'db', x: 190, y: 50 }, { id: 'SS', t: 'db', x: 410, y: 50 }
];
DEF.mug = [ /* both backers walked up in the A gaps, nickel over slot, single high */
  { id: 'WE', t: 'dl', x: 190, y: 170 }, { id: 'DT3', t: 'dl', x: 238, y: 170 }, { id: 'NT', t: 'dl', x: 362, y: 170 }, { id: 'SE', t: 'dl', x: 455, y: 170 },
  { id: 'W', t: 'lb', x: 282, y: 178 }, { id: 'M', t: 'lb', x: 320, y: 178 }, { id: 'NB', t: 'db', x: 480, y: 165 },
  { id: 'LC', t: 'db', x: 62, y: 180 }, { id: 'RC', t: 'db', x: 558, y: 180 }, { id: 'FS', t: 'db', x: 300, y: 45 }, { id: 'SS', t: 'db', x: 150, y: 120 }
];
DEF.tripsAdj = [ /* defense rolled to trips: nickel and safety over the three */
  { id: 'WE', t: 'dl', x: 190, y: 170 }, { id: 'NT', t: 'dl', x: 278, y: 170 }, { id: 'DT3', t: 'dl', x: 362, y: 170 }, { id: 'SE', t: 'dl', x: 410, y: 170 },
  { id: 'W', t: 'lb', x: 245, y: 128 }, { id: 'M', t: 'lb', x: 350, y: 128 }, { id: 'NB', t: 'db', x: 440, y: 152 },
  { id: 'LC', t: 'db', x: 62, y: 165 }, { id: 'RC', t: 'db', x: 565, y: 170 }, { id: 'FS', t: 'db', x: 250, y: 50 }, { id: 'SS', t: 'db', x: 500, y: 95 }
];
DEF.emptyMan = [ /* five defenders matched across, Mike on the back, single high */
  { id: 'WE', t: 'dl', x: 190, y: 170 }, { id: 'NT', t: 'dl', x: 278, y: 170 }, { id: 'DT3', t: 'dl', x: 362, y: 170 }, { id: 'SE', t: 'dl', x: 410, y: 170 },
  { id: 'M', t: 'lb', x: 335, y: 128 }, { id: 'W', t: 'lb', x: 150, y: 140 }, { id: 'NB', t: 'db', x: 505, y: 150 },
  { id: 'LC', t: 'db', x: 62, y: 165 }, { id: 'RC', t: 'db', x: 560, y: 165 }, { id: 'FS', t: 'db', x: 300, y: 45 }, { id: 'SS', t: 'db', x: 470, y: 130 }
];

const POS_STATIC = [
  /* ---------------- QB ---------------- */
  { id: 'q_mug_tap', groups: ['QB', 'OL', 'RB'], off: 'gun10', def: 'mug', mode: 'tap',
    q: 'Both backers are mugged up in the A gaps. Tap the one the center is most likely to point to as the Mike.', answer: 'M',
    why: 'When both are on the line the count still has to start somewhere. Convention: the backer to the 3-technique side, since that is the four-down side of the protection.' },
  { id: 'q_trips_three', groups: ['QB', 'WR', 'DB', 'LB'], off: 'trips', def: 'tripsAdj', mode: 'choice',
    q: 'Trips to the right. Who is #3?', options: ['Y, the innermost of the three', 'Z, the widest', 'H, in the middle', 'The running back'], answer: 0,
    why: 'Count from the sideline in. Z is #1, H is #2, Y is #3. Every coverage rule keys on that count.' },
  { id: 'q_trips_who', groups: ['QB'], off: 'trips', def: 'tripsAdj', mode: 'tap',
    q: 'Trips right. The defense rolled to it. Tap the defender who is one on one with X on the backside.', answer: 'LC',
    why: 'The safety rotated to the trips side. The backside corner has nobody behind him: that is the matchup the formation was built to create.' },
  { id: 'q_field_bound', groups: ['QB', 'WR', 'TE', 'DB', 'LB'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'The ball is on the left hash. Which side is the field?', options: ['The right, the wide side', 'The left, the short side', 'Wherever the tight end is', 'Always the offense\u2019s right'], answer: 0,
    why: 'Field is the wide side of the formation from the hash. It is a separate call from strength and most defenses set their coverage to it.' },
  { id: 'q_empty_man', groups: ['QB', 'RB'], off: 'empty', def: 'emptyMan', mode: 'tap',
    q: 'Empty, and the defense looks matched across. Tap the defender who has your running back split out.', answer: 'NB',
    why: 'The back is #2 to the right. The nickel walked out over him. A linebacker on a back in space is a matchup you take every time; a nickel is not.' },
  { id: 'q_odd_nose', groups: ['QB', 'OL'], off: 'gun12', def: 'odd34', mode: 'tap',
    q: 'Odd front. Tap the nose.', answer: 'NG',
    why: 'Head up on the center. In an odd front he and the two ends are the only down linemen; the count has to account for which outside backer comes.' },
  { id: 'q_boundary_corner', groups: ['QB', 'WR'], off: 'gun10', def: 'pressOff', mode: 'choice',
    q: 'Left corner is pressed, right corner is off at ten. Where is the quick game?', options: ['Right, into the cushion', 'Left, beat the press', 'Neither, it is Cover 0', 'Only the middle'], answer: 0,
    why: 'Off coverage gives you the hitch and the slant for free. Press has to be won, and it takes time you may not have.' },

  /* ---------------- RB ---------------- */
  { id: 'r_scan_next', groups: ['RB'], off: 'gun10', def: 'pressOff', mode: 'tap',
    q: 'Your backer drops. Tap the next threat you scan to.', answer: 'NB',
    why: 'Scan away from your first key to the next defender who could come. The nickel is the one aligned to blitz.' },
  { id: 'r_split_zone', groups: ['RB', 'TE'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'Split zone to the left. Tap the defender the tight end comes back across to kick out.', answer: 'SE',
    why: 'Split zone works away from the tight end and brings him back to seal the backside end. That is the cut-back lane if the end is undisciplined.' },
  { id: 'r_power_hole', groups: ['RB', 'OL'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'Power right: the guard pulls, the tackle and tight end block down. Where is the hole?', options: ['Inside the kick-out block, off the tight end\u2019s down block', 'Outside everybody, bounce it', 'Backside A gap', 'Wherever the safety is not'], answer: 0,
    why: 'Power is a designed hole: down blocks build a wall, the puller kicks out the end, you hit it tight off the wall.' },
  { id: 'r_draw_read', groups: ['RB'], off: 'gun10', def: 'nickel2high', mode: 'choice',
    q: 'Draw play. The line sets like it is pass. What are you reading?', options: ['The linebackers dropping, then the first open lane', 'The safeties', 'The end only', 'Nothing, run to daylight'], answer: 0,
    why: 'A draw is bait for the backers. When they open their hips to drop, the lane appears. You read them, not the line.' },
  { id: 'r_checkdown', groups: ['RB'], off: 'gun10', def: 'nickel2high', mode: 'choice',
    q: 'Two high, backers get depth in their drops. Where is your checkdown space?', options: ['Underneath, in front of the backers', 'Behind the safeties', 'The sideline deep', 'There is none'], answer: 0,
    why: 'When they drop deep they give you the ball in front of them. A four-yard catch with ten to run is the point.' },
  { id: 'r_pro_bear', groups: ['RB', 'OL'], off: 'gun11', def: 'bear', mode: 'choice',
    q: 'Bear front, five down and two backers. In six-man protection, who is the problem?', options: ['If both backers come, you can only block one of them', 'The nose', 'The corners', 'Nobody, it is five on five'], answer: 0,
    why: 'Five down takes your five linemen. Two backers is seven. Six blockers means one gets home if both come, which is why the quarterback needs a hot answer.' },

  /* ---------------- SPLITS (receivers, tight ends, and the DBs across from them) ---------------- */
  { id: 'sp_name_nasty', groups: ['WR', 'TE', 'DB'], off: 'splitNasty', def: 'splitNasty', mode: 'choice',
    q: 'Look at Z. What split is this?',
    options: ['Nasty split', 'Hash plus two', 'Numbers locked', 'Wide, on the sideline'], answer: 0,
    why: 'Tucked inside the hash, just outside the tight end. A nasty split shortens everything: crack angles, rub routes, and inside breaking concepts.' },
  { id: 'sp_name_numbers', groups: ['WR', 'TE', 'DB'], off: 'splitNumbers', def: 'splitNumbers', mode: 'choice',
    q: 'Look at Z. What split is this?',
    options: ['Numbers locked', 'Nasty split', 'Hash minus two', 'Stacked on the tight end'], answer: 0,
    why: 'Aligned on the numbers. This is the standard split that keeps every route in the concept available.' },
  { id: 'sp_why_nasty', groups: ['WR', 'TE'], off: 'splitNasty', def: 'splitNasty', mode: 'choice',
    q: 'You are told to take a nasty split. What does it buy you?',
    options: ['Room to the outside and a better crack angle inside',
              'A shorter route to the sideline', 'Nothing, it is cosmetic', 'More space to release inside'], answer: 0,
    why: 'Reducing the split opens the entire field outside you and puts you in position to crack a linebacker or safety. What it costs is inside release room.' },
  { id: 'sp_why_wide', groups: ['WR', 'TE', 'DB'], off: 'splitWide', def: 'splitWide', mode: 'choice',
    q: 'Z takes a wide split near the sideline. What does that do to the corner?',
    options: ['It isolates him with no inside help nearby', 'It gives him more help',
              'Nothing changes for him', 'It forces him into press'], answer: 0,
    why: 'The wider you go the further you pull the corner from his help. That is why the wide split is the one-on-one call.' },
  { id: 'sp_hash_tap', groups: ['WR', 'TE', 'DB'], off: 'splitHashPlus', def: 'splitHashPlus', mode: 'tap',
    q: 'Z is at hash plus two. Tap the defender who has to travel the farthest to get over the top of him.', answer: 'FS',
    why: 'The post safety. The tighter the split, the longer his run to the sideline and the more the outside is exposed behind him.' },
  { id: 'sp_leverage', groups: ['WR', 'DB'], off: 'splitNumbers', def: 'splitNumbers', mode: 'choice',
    q: 'Numbers locked, corner outside leverage, safety in the middle. Which route is the defense giving you?',
    options: ['The inside breaking route', 'The fade', 'The out', 'Nothing'], answer: 0,
    why: 'Outside leverage with a single-high safety means the inside is the soft side. You throw and run away from leverage.' },

  /* ---------------- WR ---------------- */
  { id: 'w_press_which', groups: ['WR', 'TE'], off: 'gun10', def: 'pressOff', mode: 'tap',
    q: 'Tap the corner playing press.', answer: 'LC',
    why: 'On the line, in your face. The other corner is at ten yards with a cushion.' },
  { id: 'w_release', groups: ['WR', 'TE'], off: 'gun10', def: 'pressOff', mode: 'choice',
    q: 'The press corner is shading you inside. Where is your release?', options: ['Outside, where he is giving it', 'Inside, through him', 'Straight ahead into his chest', 'Wait for him to move first'], answer: 0,
    why: 'Take what the leverage gives. Fighting into leverage is how you get rerouted and the timing dies.' },
  { id: 'w_two_help', groups: ['WR'], off: 'gun10', def: 'nickel2high', mode: 'tap',
    q: 'You are Z. Two high. Tap the safety who is your deep help for the defense.', answer: 'SS',
    why: 'The safety to your side. Your vertical route has to beat both the corner and him.' },
  { id: 'w_over_slot', groups: ['WR', 'TE'], off: 'gun10', def: 'nickel2high', mode: 'tap',
    q: 'You are H in the slot. Tap the defender aligned over you.', answer: 'NB',
    why: 'The nickel. His leverage and depth tell you which of your routes is open before the ball is snapped.' },
  { id: 'w_stalk_back', groups: ['WR', 'TE'], off: 'gun11', def: 'single1', mode: 'tap',
    q: 'Run away from you on the backside. Tap the defender you have to get to.', answer: 'FS',
    why: 'Backside, your corner is not the problem: the post safety is the one who runs the ball down from behind. You climb and cut him off. Blocking the corner on a run away from you is how a long run becomes a 12-yard gain.' },
  { id: 'w_stalk_playside', groups: ['WR'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'Run to your side. Tap the defender you stalk.', answer: 'RC',
    why: 'Playside, it is the man over you. Stay engaged through the whistle; this rep is what coaches scroll to on receiver film.' },
  { id: 'w_cover3_seam', groups: ['WR', 'TE'], off: 'gun11', def: 'single1', mode: 'tap',
    q: 'Cover 3. You are H running the seam. Tap the defender who has to widen to get under you.', answer: 'NB',
    why: 'The nickel has the curl-flat under a single-high safety. If he widens to the flat, the seam opens between him and the post safety.' },
  { id: 'w_hot_side', groups: ['WR'], off: 'gun11', def: 'nickelBlitz', mode: 'choice',
    q: 'The nickel is walked up over you showing blitz. If he comes, your route becomes', options: ['Hot: break it off quick into the space he left', 'The same route, run it as called', 'A block on the blitzer', 'A go route'], answer: 0,
    why: 'Same rule as the quarterback. The blitzer leaves space. You replace him fast and the ball is out.' },
  { id: 'w_quarters_carry', groups: ['WR', 'DB'], off: 'gun10', def: 'nickel2high', mode: 'tap',
    q: 'Quarters. You are Z running a go. Tap who carries you deep.', answer: 'RC',
    why: 'In Quarters the corner has #1 vertical. The safety is watching #2.' },

  /* ---------------- TE ---------------- */
  { id: 't_cgap', groups: ['TE'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'Run to your side. Tap the C gap defender you have first.', answer: 'SE',
    why: 'The end on your outside shoulder. He is the gap you cannot lose.' },
  { id: 't_climb', groups: ['TE', 'OL'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'You and the right tackle combo the end. Tap the backer you climb to.', answer: 'S',
    why: 'The Sam, walked out over you. He fits the C gap behind the end.' },
  { id: 't_lb_lev', groups: ['TE'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'The Sam is head up on you with inside leverage. What route wins?', options: ['Out breaking', 'Slant', 'Seam', 'Hitch'], answer: 0,
    why: 'Inside leverage means he has help inside. You break away from it.' },
  { id: 't_flex', groups: ['TE'], off: 'gun10', def: 'nickel2high', mode: 'choice',
    q: 'You flex out to the slot and a safety walks down over you. That tells you', options: ['They are treating you like a receiver, expect coverage', 'It is a run blitz', 'They are in Cover 0', 'Nothing'], answer: 0,
    why: 'Who they put on you when you move is the defense telling you how they see you.' },

  /* ---------------- OL ---------------- */
  { id: 'o_1tech', groups: ['OL'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'Tap the 1-technique (shade).', answer: 'NT',
    why: 'Inside shoulder of the guard, or on the center. The A gap player.' },
  { id: 'o_5tech', groups: ['OL', 'DL'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'Tap the 5-technique.', answer: 'WE',
    why: 'Outside shoulder of the tackle on the open side.' },
  { id: 'o_9tech', groups: ['OL', 'DL', 'TE'], off: 'gun11', def: 'over43', mode: 'tap',
    q: 'Tap the 9-technique.', answer: 'SE',
    why: 'Outside the tight end. He is a C gap player who is also the edge in pass rush.' },
  { id: 'o_open_side', groups: ['OL'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'Which side is the open side?', options: ['Left, away from the tight end', 'Right, the tight end side', 'The side with the 3-technique', 'The side the back is on'], answer: 0,
    why: 'Open is the side without a tight end. Closed is with. Most line calls start there.' },
  { id: 'o_bear_cover', groups: ['OL'], off: 'gun11', def: 'bear', mode: 'choice',
    q: 'Bear front. Who on the interior is uncovered?', options: ['Nobody, all three are covered', 'The center', 'The left guard', 'Both guards'], answer: 0,
    why: 'Nose on the center, a defender on each guard. Bear takes away your combination blocks on purpose.' },
  { id: 'o_odd_covered', groups: ['OL'], off: 'gun12', def: 'odd34', mode: 'choice',
    q: 'Odd front. Which interior lineman is covered?', options: ['The center', 'Both guards', 'The left guard only', 'Nobody'], answer: 0,
    why: 'Nose on the center, ends on the tackles. The guards are uncovered, which is where the double teams come from.' },
  { id: 'o_slide_rg', groups: ['OL'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'Slide right. What does the right guard have?', options: ['His right gap, the B gap', 'The 3-technique wherever he goes', 'The Mike', 'Nothing, he pulls'], answer: 0,
    why: 'Slide is gap protection. Right guard takes the B gap to his right and passes off anything leaving it.' },
  { id: 'o_mug_tap', groups: ['OL'], off: 'gun10', def: 'mug', mode: 'choice',
    q: 'Both backers mugged in the A gaps, five down total threats inside. What does the center have to do?', options: ['Make the call and set the count off one of them', 'Block the nose only', 'Snap it fast', 'Pull'], answer: 0,
    why: 'Two A-gap threats plus the down linemen is more than five can count without a call. The center declares it.' },

  /* ---------------- DL ---------------- */
  { id: 'd_gapA', groups: ['DL'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'You are the shade (1-tech). Which gap?', options: ['A gap', 'B gap', 'C gap', 'Two gaps'], answer: 0,
    why: 'Shade on the center or inside the guard is the A gap.' },
  { id: 'd_gapC', groups: ['DL'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'You are the 5-technique. Which gap?', options: ['C gap', 'B gap', 'D gap', 'A gap'], answer: 0,
    why: 'Outside the tackle is C. Outside a tight end would be D.' },
  { id: 'd_backside_end', groups: ['DL'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'Zone read to the left. You are the backside end and nobody blocks you. Your job is', options: ['Stay home, slow play the mesh, take the quarterback if he keeps', 'Chase the back down the line', 'Rush upfield as hard as you can', 'Drop into coverage'], answer: 0,
    why: 'You are being read. Crash and the quarterback keeps around you. Squeeze and stay square, and you take away both.' },
  { id: 'd_twist_first', groups: ['DL'], off: 'gun10', def: 'nickel2high', mode: 'choice',
    q: 'Tackle-end twist (the tackle goes first). Your job as the end is', options: ['Loop behind him after he penetrates', 'Go first through the B gap', 'Bull rush the tackle', 'Drop'], answer: 0,
    why: 'The penetrator draws the block, the looper takes the gap he vacated. Timing is the whole game.' },
  { id: 'd_over_first', groups: ['DL'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'You are the 3-technique on a run to your side. Your first job is', options: ['Win the B gap and stay in it', 'Chase the ball wherever it goes', 'Spin outside', 'Get upfield'], answer: 0,
    why: 'Gap first. Chasing is how the cutback lane opens behind you.' },

  /* ---------------- LB ---------------- */
  { id: 'l_trips3', groups: ['LB'], off: 'trips', def: 'tripsAdj', mode: 'choice',
    q: 'Trips right. In most zone rules, who is the Mike responsible for on a vertical release?', options: ['#3, the innermost receiver', '#1, the widest', 'The running back only', 'Nobody'], answer: 0,
    why: '#3 vertical is the middle-of-field threat. The Mike carries him or passes him to the safety depending on the call.' },
  { id: 'l_fit_shoulder', groups: ['LB'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'Run to your side, the guard climbs to you. You take him with', options: ['Your inside shoulder, keeping your outside arm free for your gap', 'Your outside shoulder', 'Both hands and run around', 'A cut block'], answer: 0,
    why: 'The free arm is on the side of your gap. Take the block on the shoulder that keeps it.' },
  { id: 'l_empty_back', groups: ['LB'], off: 'empty', def: 'emptyMan', mode: 'tap',
    q: 'Empty. Tap the eligible receiver you would expect to be matched on in man: the one the offense wants you on.', answer: 'NB',
    why: 'Trick question in spirit: the back flexed out and the defense put the nickel on him, not you. If you had him, that is the matchup the offense built the formation for.' },
  { id: 'l_gap_bear', groups: ['LB'], off: 'gun11', def: 'bear', mode: 'choice',
    q: 'Bear front. With five down, what do the two backers have?', options: ['The two remaining gaps, clean, because the line is occupied', 'Nothing, they are free to blitz', 'The A gaps', 'Coverage only'], answer: 0,
    why: 'Five down linemen occupy five blockers. The backers are unblocked on the gaps that are left, which is why Bear stops the run.' },

  /* ---------------- DB ---------------- */
  { id: 'b_press_which', groups: ['DB'], off: 'gun10', def: 'pressOff', mode: 'choice',
    q: 'Which corner is playing off?', options: ['The right corner, at ten yards', 'The left corner, on the line', 'Both', 'Neither'], answer: 0,
    why: 'Depth is the tell. Press is on the line, off has a cushion.' },
  { id: 'b_zero_man', groups: ['DB'], off: 'gun11', def: 'mug', mode: 'tap',
    q: 'Cover 0. Tap the defender who has Z.', answer: 'RC',
    why: 'Man across, no help. The corner over Z has him alone and knows it.' },
  { id: 'b_cover3_third', groups: ['DB'], off: 'gun11', def: 'single1', mode: 'tap',
    q: 'Cover 3. You are the right corner with the deep third. Tap the defender with the middle third.', answer: 'FS',
    why: 'Three deep: two corners on the outside thirds, the free safety in the middle. Your leverage on the outside route depends on trusting him.' },
  { id: 'b_force_dir', groups: ['DB'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'You are the force player and the run comes to you. You turn the ball', options: ['Back inside, to the pursuit', 'Outside, to the sideline', 'Wherever the back goes', 'Toward the safety'], answer: 0,
    why: 'Force means set the edge and turn it in. Everyone else is chasing to the inside of you.' },
  { id: 'b_flat_who', groups: ['DB', 'LB'], off: 'gun11', def: 'single1', mode: 'tap',
    q: 'Cover 3. Tap the defender with the curl-flat to the slot side.', answer: 'NB',
    why: 'Under three deep, the nickel has curl to flat on his side. If he is late to the flat, the swing route is free.' },
  { id: 'b_trips_roll', groups: ['DB'], off: 'trips', def: 'tripsAdj', mode: 'choice',
    q: 'Trips. The defense rolled the safety to the three. What is the backside corner in?', options: ['Man on X with no help', 'Cover 2 with a half', 'Zone with help inside', 'The flat'], answer: 0,
    why: 'Rolling the safety to the strength leaves the backside corner alone on #1. That is the trade the defense made.' },
  { id: 'b_two_split', groups: ['DB'], off: 'gun10', def: 'nickel2high', mode: 'choice',
    q: 'Two high. As the safety to the slot side, who is your first read after the snap?', options: ['#2, the slot', '#1, the widest receiver', 'The quarterback only', 'The running back'], answer: 0,
    why: 'In two-high, #2 tells you what to do. Vertical, you carry. Out, you look to #1. Inside, you rob.' }
];

const POS_MOTION = [
  /* QB */
  { id: 'mq_mug_one', groups: ['QB', 'OL', 'RB'], off: 'gun10', def: 'mug', mode: 'tap', snap: true,
    motion: { W: { x: 245, y: 130 }, M: { x: 320, y: 200 } }, duration: 700,
    q: 'Both backers mugged. Watch the snap. Tap the one who came.', answer: 'M',
    why: 'One dropped out, one came. The mug is a bluff on one side and real on the other; you confirm after the snap.' },
  { id: 'mq_bail', groups: ['QB'], off: 'gun10', def: 'pressOff', mode: 'choice', snap: true,
    motion: { LC: { x: 62, y: 120 } }, duration: 800,
    q: 'The press corner bails at the snap. That tells you', options: ['Zone, he is getting to a landmark', 'Man, he is baiting you', 'Blitz', 'Nothing'], answer: 0,
    why: 'Press then bail is a zone corner getting to his third or his half. Man corners stay in your face.' },
  { id: 'mq_rot_field', groups: ['QB', 'DB'], off: 'gun11', def: 'nickel2high', mode: 'choice', snap: true,
    motion: { SS: { x: 470, y: 120 }, FS: { x: 300, y: 48 } }, duration: 900,
    q: 'Which way did the rotation go?', options: ['To the field, the wide side', 'To the boundary', 'It did not rotate', 'Both safeties came down'], answer: 0,
    why: 'The safety dropped down to the wide side. Rotation direction tells you which side just lost a deep player.' },
  { id: 'mq_empty_walk', groups: ['QB', 'RB', 'LB'], off: 'empty', def: 'nickel2high', mode: 'choice', snap: true,
    motion: { M: { x: 470, y: 150 } }, duration: 800,
    q: 'Your back flexes out and a linebacker walks out with him. That means', options: ['Man coverage, and the back on a backer is your matchup', 'Zone', 'Blitz', 'Quarters'], answer: 0,
    why: 'A defender following an eligible out of the box is man. A backer on your back in space is the throw.' },
  /* RB */
  { id: 'mr_end_crash', groups: ['RB', 'QB'], off: 'gun11', def: 'over43', mode: 'choice', snap: true,
    motion: { SE: { x: 300, y: 250 } }, duration: 700,
    q: 'Zone read left. Watch the backside end. Give or keep?', options: ['Keep, he crashed on the back', 'Give, he stayed home', 'Throw', 'Both'], answer: 0,
    why: 'The read defender crashed down the line at the mesh. That is a keep: he took the back, the quarterback goes where he came from.' },
  { id: 'mr_a_blitz', groups: ['RB', 'OL'], off: 'gun11', def: 'over43', mode: 'tap', snap: true,
    motion: { M: { x: 320, y: 195 }, S: { x: 405, y: 110 } }, duration: 700,
    q: 'You are in protection. Watch the snap. Tap the backer who came through the A gap.', answer: 'M',
    why: 'The Mike shot the A gap and the Sam dropped. You fit the one who came, downhill, inside half.' },
  { id: 'mr_sam_fire', groups: ['RB'], off: 'gun11', def: 'over43', mode: 'tap', snap: true,
    motion: { S: { x: 455, y: 195 }, M: { x: 305, y: 110 } }, duration: 700,
    q: 'Same look, different snap. Tap who came.', answer: 'S',
    why: 'This time the Sam fired off the edge and the Mike dropped. Two snaps, two answers, same pre-snap picture.' },
  /* WR / TE */
  { id: 'mw_nb_out', groups: ['WR', 'TE'], off: 'gun11', def: 'single1', mode: 'choice', snap: true,
    motion: { NB: { x: 530, y: 215 } }, duration: 700,
    q: 'You are H on the seam. The nickel widens to the flat at the snap. Your seam is', options: ['Open, throw it between him and the safety', 'Covered', 'A hitch now', 'Dead'], answer: 0,
    why: 'He vacated the space under the post safety. That window opens for exactly one beat.' },
  { id: 'mw_press_bail', groups: ['WR', 'TE'], off: 'gun10', def: 'pressOff', mode: 'choice', snap: true,
    motion: { LC: { x: 62, y: 110 } }, duration: 800,
    q: 'Your press corner bails at the snap. You should', options: ['Settle into the hole he left, he is in zone', 'Run through him, it is man', 'Block him', 'Stop'], answer: 0,
    why: 'Bail equals zone. Zone means settle in the window, do not run into the next defender.' },
  /* OL */
  { id: 'mo_twist', groups: ['OL'], off: 'gun10', def: 'nickel2high', mode: 'choice', snap: true,
    motion: { DT3: { x: 410, y: 235 }, SE: { x: 350, y: 235 } }, duration: 800,
    q: 'Watch the tackle and end. What do the guard and tackle do?', options: ['Stay square, pass them off', 'Both go with the first mover', 'Both drop', 'Cut them'], answer: 0,
    why: 'They twisted. The penetrator draws you, the looper takes the gap. Square shoulders and a pass-off beat it every time.' },
  { id: 'mo_slide_cross', groups: ['OL'], off: 'gun11', def: 'over43', mode: 'choice', snap: true,
    motion: { DT3: { x: 420, y: 205 } }, duration: 700,
    q: 'Slide left. The 3-technique crosses the right guard\u2019s face going right. The guard', options: ['Passes him off and takes what comes into his gap', 'Follows him', 'Chases and hits him', 'Pulls'], answer: 0,
    why: 'Slide protection is gap. Chasing a man out of your gap is how the twist or the backer gets home.' },
  /* DL */
  { id: 'md_screen', groups: ['DL', 'LB'], off: 'gun10', def: 'nickel2high', mode: 'choice', snap: true,
    motion: { RG: { x: 420, y: 150 }, RT: { x: 460, y: 160 } }, duration: 800,
    q: 'Watch the right guard and tackle. What is this?', options: ['Screen, retrace', 'Draw', 'Play action', 'A pass, keep rushing'], answer: 0,
    why: 'Linemen releasing downfield with no one to block is a screen. Retrace and find the back.' },
  { id: 'md_down_pull', groups: ['DL'], off: 'gun11', def: 'over43', mode: 'choice', snap: true,
    motion: { RT: { x: 330, y: 205 }, LG: { x: 440, y: 215 } }, duration: 800,
    q: 'You are the strongside end. The tackle blocks down and the left guard pulls at you. You', options: ['Squeeze the down block, stay square, take on the puller', 'Chase the tackle inside', 'Run upfield', 'Drop'], answer: 0,
    why: 'Down block, then a puller. Squeeze, keep your outside arm free, and make the puller come to you.' },
  /* LB */
  { id: 'ml_high_hat', groups: ['LB'], off: 'gun10', def: 'nickel2high', mode: 'choice', snap: true,
    motion: { LT: { x: 210, y: 240 }, LG: { x: 255, y: 240 }, C: { x: 300, y: 240 }, RG: { x: 345, y: 240 }, RT: { x: 390, y: 240 } }, duration: 600,
    q: 'Watch the linemen at the snap. Run or pass?', options: ['Pass, high hat, get to your drop', 'Run, fill', 'Draw', 'Screen'], answer: 0,
    why: 'Five linemen setting back with high pads is pass. That is your key before the back ever moves.' },
  { id: 'ml_low_hat', groups: ['LB'], off: 'gun11', def: 'over43', mode: 'choice', snap: true,
    motion: { LT: { x: 220, y: 200 }, LG: { x: 262, y: 200 }, C: { x: 304, y: 200 }, RG: { x: 346, y: 200 }, RT: { x: 390, y: 200 }, TE: { x: 436, y: 202 } }, duration: 600,
    q: 'Watch the linemen. Run or pass?', options: ['Run, low hat driving forward, fit your gap', 'Pass, drop', 'Screen', 'Cannot tell'], answer: 0,
    why: 'Everybody firing forward off the ball is run. Trigger downhill and fit.' },
  { id: 'ml_pa', groups: ['LB'], off: 'gun11', def: 'over43', mode: 'choice', snap: true,
    motion: { LT: { x: 210, y: 240 }, LG: { x: 255, y: 240 }, C: { x: 300, y: 240 }, RG: { x: 345, y: 240 }, RT: { x: 390, y: 240 }, RB: { x: 300, y: 235 } }, duration: 700,
    q: 'The back comes forward like a run, but watch the linemen. What is it?', options: ['Play action, the line is in pass sets', 'Run', 'Draw', 'Screen'], answer: 0,
    why: 'The back lied. The line did not. Read hats, not backs, and you do not get caught.' },
  /* DB */
  { id: 'mb_two_vert', groups: ['DB'], off: 'gun10', def: 'nickel2high', mode: 'tap', snap: true,
    motion: { H: { x: 470, y: 95 } }, duration: 900,
    q: 'Quarters. #2 goes vertical past ten yards. Tap who takes him.', answer: 'SS',
    why: 'Quarters rule: safety takes #2 vertical. Corner stays on #1.' },
  { id: 'mb_two_flat', groups: ['DB', 'LB'], off: 'gun10', def: 'nickel2high', mode: 'tap', snap: true,
    motion: { H: { x: 560, y: 245 } }, duration: 800,
    q: 'Quarters. #2 breaks quick to the flat. Tap who takes him.', answer: 'NB',
    why: '#2 out under five yards is the underneath defender\u2019s. The safety looks to #1 the moment #2 breaks out.' },
  { id: 'mb_motion_man', groups: ['DB', 'LB'], off: 'gun10', def: 'nickel2high', mode: 'choice', snap: true,
    motion: { H: { x: 130, y: 232 }, NB: { x: 150, y: 150 } }, duration: 900,
    q: 'The slot motions across and the nickel runs with him. Coverage?', options: ['Man', 'Zone', 'Cover 0', 'Cannot tell'], answer: 0,
    why: 'A defender chasing motion across the formation is man. Zone defenders bump, they do not travel.' },
  { id: 'mb_motion_zone', groups: ['DB', 'LB'], off: 'gun10', def: 'nickel2high', mode: 'choice', snap: true,
    motion: { H: { x: 130, y: 232 }, W: { x: 200, y: 140 }, M: { x: 310, y: 128 } }, duration: 900,
    q: 'Same motion. This time nobody runs with him and the backers just shift. Coverage?', options: ['Zone', 'Man', 'Cover 0', 'Blitz'], answer: 0,
    why: 'Nobody traveled. The defense bumped its landmarks. That is zone.' }
];

function scenariosFor(group) {
  const pick = (list) => list.filter(s => s.groups.includes('ALL') || (group && s.groups.includes(group)))
    .map(s => ({ ...s, offense: OFF[s.off], defense: DEF[s.def] }));
  /* static looks first, then the ones that move */
  return pick(SCENARIOS).concat(pick(POS_STATIC)).concat(pick(MOTION)).concat(pick(POS_MOTION));
}

module.exports = { OFF, DEF, SCENARIOS, MOTION, POS_STATIC, POS_MOTION, scenariosFor };
