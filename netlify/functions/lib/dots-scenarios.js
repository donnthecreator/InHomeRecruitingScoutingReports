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

const SCENARIOS = [
  /* ---------- everyone: fronts and shells ---------- */
  { id: 'd_front_over', groups: ['ALL'], off: 'gun11', def: 'over43', mode: 'choice',
    q: 'Name this front.', options: ['4-3 Over', '4-3 Under', '3-4 Odd', 'Bear'], answer: 0,
    why: 'Four down. The 3-technique sits on the guard\u2019s outside shoulder to the tight end side, so the front is shaded OVER to strength.' },
  { id: 'd_front_under', groups: ['ALL'], off: 'gun11', def: 'under43', mode: 'choice',
    q: 'Name this front.', options: ['4-3 Over', '4-3 Under', '3-4 Odd', 'Bear'], answer: 1,
    why: 'The 3-technique is away from the tight end and the Sam is walked up on the edge over him. That is Under.' },
  { id: 'd_front_odd', groups: ['ALL'], off: 'gun12', def: 'odd34', mode: 'choice',
    q: 'Name this front.', options: ['4-3 Over', '4-3 Under', '3-4 Odd', 'Bear'], answer: 2,
    why: 'Three down with a nose on the center, outside backers on the edges, two inside backers. Odd front.' },
  { id: 'd_front_bear', groups: ['ALL'], off: 'gun11', def: 'bear', mode: 'choice',
    q: 'Name this front.', options: ['4-3 Over', '4-3 Under', '3-4 Odd', 'Bear'], answer: 3,
    why: 'Nose plus a defender covering each guard: three interior linemen are covered. That is the Bear look, and it is a run stopper and a protection headache.' },
  { id: 'd_shell_two', groups: ['ALL'], off: 'gun10', def: 'nickel2high', mode: 'choice',
    q: 'Pre-snap, what is the shell?', options: ['Single high', 'Two high', 'Zero, nobody deep', 'Cannot tell'], answer: 1,
    why: 'Two safeties at depth, splitting the hashes. Two high. You confirm after the snap whether it stays that way.' },
  { id: 'd_shell_single', groups: ['ALL'], off: 'gun10', def: 'single1', mode: 'tap',
    q: 'Single high. Tap the post safety.', answer: 'FS',
    why: 'One deep defender in the middle of the field. Everyone else is at the line or in the flats.' },
  { id: 'd_tap_3tech', groups: ['ALL'], off: 'gun11', def: 'over43', mode: 'tap',
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
  { id: 'd_qb_hot', groups: ['QB', 'WR'], off: 'gun11', def: 'nickelBlitz', mode: 'choice',
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

function scenariosFor(group) {
  return SCENARIOS.filter(s => s.groups.includes('ALL') || (group && s.groups.includes(group)))
    .map(s => ({ ...s, offense: OFF[s.off], defense: DEF[s.def] }));
}

module.exports = { OFF, DEF, SCENARIOS, scenariosFor };
