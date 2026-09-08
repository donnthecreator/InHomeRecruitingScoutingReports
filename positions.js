/* positions.js — trait/archetype/gate config per position.
   Copied verbatim from report.html for pages that render a filed report
   (share.html). If you change POSITIONS in report.html, copy it here too. */
const POSITIONS = {
  QB: {
    label: "Quarterback",
    archetypes: [
      {k:"Pro-Style", d:"Under-center heavy, full-field progression reads, timing-based passing game."},
      {k:"Spread/RPO", d:"Shotgun-based, run-pass option reads, tempo, half-field simplified reads."},
      {k:"Dual-Threat", d:"Run-first playmaker whose legs are a primary weapon, arm talent secondary but present."}
    ],
    film: [
      {id:"accuracy", name:"Accuracy & Ball Placement", p:"Puts the ball where only the receiver can make a play — leverage, timing, and location relative to coverage."},
      {id:"arm", name:"Arm Talent", p:"Velocity, ability to drive the ball outside the numbers and push it vertically."},
      {id:"processing", name:"Processing / Progression", p:"Reads coverage post-snap, works through progressions, identifies the hot route under pressure."},
      {id:"pocket", name:"Pocket Management", p:"Feels rush without seeing it, resets feet, extends plays without abandoning structure."}
    ],
    athletic: [
      {id:"mobility", name:"Mobility / Escapability", metric:"40 time / short shuttle"},
      {id:"release", name:"Release Quickness", metric:"Time to throw (film est.)"},
      {id:"velocity", name:"Arm Strength", metric:"Ball velocity (mph, if tested)"}
    ],
    production: [
      {id:"efficiency", name:"Completion % / YPA", metric:"Season comp% / YPA"},
      {id:"tdint", name:"TD:INT Ratio", metric:"Season TD-INT"}
    ],
    gates: ["Poise under pressure","Huddle leadership / command","Ball security discipline","Competitiveness / late-game demeanor","Coachability"]
  },
  RB: {
    label: "Running Back",
    archetypes: [
      {k:"Power/Downhill", d:"Between-the-tackles runner, contact balance and finish over creativity."},
      {k:"Zone/Vision", d:"Patience, one-cut decisiveness, sets up blocks and presses the crease."},
      {k:"Scat/Receiving", d:"Space player — pass-game weapon first, home-run explosiveness in open field."}
    ],
    film: [
      {id:"vision", name:"Vision & Patience", p:"Sets up blocks, reads the hole develop, doesn't rush the crease."},
      {id:"contact", name:"Contact Balance", p:"Runs through arm tackles, keeps pads low, finishes runs forward."},
      {id:"burst", name:"Burst / Acceleration", p:"Gets from zero to top speed through the hole, separation vs. angle defenders."},
      {id:"passpro", name:"Pass Protection", p:"Recognizes blitz, squares up, willing and effective in protection."}
    ],
    athletic: [
      {id:"speed", name:"Top-End Speed", metric:"40 time"},
      {id:"agility", name:"Lateral Agility", metric:"Short shuttle / 3-cone"},
      {id:"power", name:"Play Strength", metric:"Broken tackle rate (film est.)"}
    ],
    production: [
      {id:"ypc", name:"Yards / Carry", metric:"Season YPC"},
      {id:"explosive", name:"Explosive Run Rate", metric:"Runs 15+ yds / season"}
    ],
    gates: ["Ball security","Competitive/finishing toughness","Effort in pass protection","Coachability"]
  },
  WR: {
    label: "Wide Receiver",
    archetypes: [
      {k:"X", d:"Boundary/split-end. Press-beater, contested-catch, plays through leverage on an island."},
      {k:"H", d:"Slot/movement piece. Quick separation, YAC creator, works the middle of the field."},
      {k:"Z", d:"Flanker/field. Vertical stress, motion versatility, big-play explosiveness."}
    ],
    film: [
      {id:"hands", name:"Hands / Ball Skills", p:"Catches away from body, high-pointing, contested-catch reliability."},
      {id:"yac", name:"YAC / Foot Speed", p:"What happens after the catch — burst, tackle-breaking, top gear."},
      {id:"breaks", name:"Breakpoints / COD", p:"Route sharpness, ability to separate at the top of the stem."},
      {id:"vital", name:"Vital Qualities", p:"Release package, competitive catch radius, blocking effort downfield."}
    ],
    athletic: [
      {id:"speed", name:"Top-End Speed", metric:"40 time"},
      {id:"release", name:"Release Quickness", metric:"Press-release win rate (film est.)"},
      {id:"radius", name:"Catch Radius", metric:"Vertical / wingspan if known"}
    ],
    production: [
      {id:"ypr", name:"Yards / Reception", metric:"Season YPR"},
      {id:"contested", name:"Contested Catch Rate", metric:"Season contested catches"}
    ],
    gates: ["Competitive toughness","Route discipline / effort on non-target plays","Blocking effort","Ball security","Coachability"]
  },
  TE: {
    label: "Tight End",
    archetypes: [
      {k:"In-line/Y", d:"Primary blocker who threatens as a receiver — attached to the formation most snaps."},
      {k:"Move/F", d:"Detached, motion-heavy, matchup piece against LBs and slot DBs."},
      {k:"Big Slot", d:"Basketball-frame vertical/seam threat, minimal in-line blocking asked of him."}
    ],
    film: [
      {id:"blocking", name:"In-Line Blocking", p:"Hand placement, leverage, and finish as a run and pass blocker."},
      {id:"routes", name:"Route Running / Separation", p:"Sells routes, creates natural separation vs. LBs and DBs."},
      {id:"hands", name:"Hands / Contested Catch", p:"Reliable hands in traffic, wins 50/50 balls in the seam and red zone."},
      {id:"yac", name:"YAC / Run After Catch", p:"Runs through/away from contact after the catch."}
    ],
    athletic: [
      {id:"speed", name:"Speed / Vertical Threat", metric:"40 time"},
      {id:"flex", name:"Flexibility / COD", metric:"Short shuttle"},
      {id:"release", name:"Release Quickness", metric:"Film est."}
    ],
    production: [
      {id:"ypt", name:"Yards / Target", metric:"Season YPT"},
      {id:"redzone", name:"Red Zone Production", metric:"Red zone TDs"}
    ],
    gates: ["Willingness to block","Competitive toughness","Coachability","Ball security"]
  },
  OL: {
    label: "Offensive Line",
    archetypes: [
      {k:"LT", d:"Blindside protector — length, foot quickness in pass sets vs. speed rushers."},
      {k:"IOL (G/C)", d:"Interior — power at point of attack, combo blocks, calls/communication."},
      {k:"RT", d:"Strongside — power in the run game, handles length and bull rush."}
    ],
    film: [
      {id:"passset", name:"Pass Set / Kick Slide", p:"Footwork, depth, and mirror ability in pass protection."},
      {id:"hands", name:"Hand Placement / Punch", p:"Hand accuracy and timing at the point of attack."},
      {id:"anchor", name:"Anchor / Power at POA", p:"Holds ground vs. bull rush, generates movement in the run game."},
      {id:"iq", name:"Football IQ (Protection ID)", p:"Sees stunts and blitzes, communicates calls, picks up twists."},
      {id:"finish", name:"Finish / Competitiveness", p:"Plays through the whistle, second-level effort, physicality."}
    ],
    athletic: [
      {id:"quickness", name:"Short-Area Quickness", metric:"10-yd split"},
      {id:"length", name:"Length / Reach", metric:"Arm length if known"},
      {id:"strength", name:"Core Strength / Anchor", metric:"Film est."}
    ],
    production: [
      {id:"pressures", name:"Pressures Allowed", metric:"Per game (film est.)"},
      {id:"knockdowns", name:"Knockdown / Pancake Rate", metric:"Film est."}
    ],
    gates: ["Communication / calls","Toughness","Competitiveness","Coachability"]
  },
  DL: {
    label: "Defensive Line",
    archetypes: [
      {k:"Edge", d:"Off the ball or with hand down — first step and bend to win the corner."},
      {k:"3-Tech", d:"Interior penetrator — quickness and hands to disrupt gaps and collapse the pocket."},
      {k:"Nose/1-Tech", d:"Two-gap anchor — length, power, and discipline to control the point of attack."}
    ],
    film: [
      {id:"getoff", name:"Get-Off / First Step", p:"Snap anticipation and initial quickness off the ball."},
      {id:"hands", name:"Hand Usage / Pass Rush Moves", p:"Counter moves, hand-fighting, ability to disengage blockers."},
      {id:"gap", name:"Gap Discipline / Run Defense", p:"Stays in assignment, sets edge, controls gap in the run game."},
      {id:"motor", name:"Motor / Finish", p:"Effort to the whistle, pursuit from backside, doesn't quit on reps."}
    ],
    athletic: [
      {id:"explosive", name:"Explosiveness", metric:"10-yd split / vertical"},
      {id:"bend", name:"Bend / Flexibility", metric:"Film est. corner-turning ability"},
      {id:"length", name:"Length", metric:"Arm length if known"}
    ],
    production: [
      {id:"pressure", name:"Sacks / Pressures", metric:"Season total"},
      {id:"tfl", name:"TFLs", metric:"Season total"}
    ],
    gates: ["Motor / effort","Competitiveness","Discipline (assignment soundness)","Coachability"]
  },
  LB: {
    label: "Linebacker",
    archetypes: [
      {k:"MIKE", d:"Downhill run defender and defensive communicator — reads and fills fast."},
      {k:"WILL", d:"Sideline-to-sideline range, best athlete of the group, coverage-capable."},
      {k:"SAM", d:"Handles TE/H-back in space, sets the edge, hybrid box/coverage skillset."}
    ],
    film: [
      {id:"diagnose", name:"Read & Diagnose", p:"Keys and triggers quickly, doesn't get held up by misdirection."},
      {id:"range", name:"Range / Pursuit", p:"Sideline-to-sideline speed, angles taken to the ball."},
      {id:"coverage", name:"Coverage (Man/Zone)", p:"Drops to zone landmarks, carries routes in man, closes on the ball."},
      {id:"deconstruct", name:"Block Deconstruction", p:"Takes on and defeats blocks from lineman and fullbacks without losing gap."},
      {id:"tackling", name:"Tackling", p:"Wraps up, form, doesn't miss in space."}
    ],
    athletic: [
      {id:"speed", name:"Speed / Range", metric:"40 time"},
      {id:"cod", name:"Change of Direction", metric:"Short shuttle"},
      {id:"explosive", name:"Explosiveness", metric:"Vertical / broad jump"}
    ],
    production: [
      {id:"tackles", name:"Tackles", metric:"Season total"},
      {id:"coverage", name:"Coverage Production", metric:"INTs / PBUs"}
    ],
    gates: ["Communication / leadership","Competitiveness","Tackling discipline (form over highlight)","Coachability"]
  },
  DB: {
    label: "Defensive Back",
    archetypes: [
      {k:"CB", d:"Man-coverage skillset, press-and-carry, isolated on an island vs. WR1s."},
      {k:"FS", d:"Deep-middle range player, ball skills, last line of defense over the top."},
      {k:"SS", d:"Box safety — run support, tackling, matches up on TEs and slot receivers."}
    ],
    film: [
      {id:"transition", name:"Backpedal / Transition", p:"Smoothness and speed flipping hips out of the backpedal."},
      {id:"ballskills", name:"Ball Skills", p:"Plays through the hands of the receiver, tracks the ball in the air."},
      {id:"man", name:"Man Coverage / Press", p:"Jams at the line, mirrors release, stays in phase down the field."},
      {id:"zone", name:"Zone Awareness / Range", p:"Reads QB eyes, drives on the ball from depth, closes throwing lanes."},
      {id:"tackling", name:"Tackling", p:"Willing and reliable in run support and open field."}
    ],
    athletic: [
      {id:"speed", name:"Top-End Speed", metric:"40 time"},
      {id:"hips", name:"Hip Fluidity", metric:"Film est."},
      {id:"length", name:"Length", metric:"Arm length if known"}
    ],
    production: [
      {id:"pbu", name:"PBUs / INTs", metric:"Season total"},
      {id:"tackles", name:"Tackles", metric:"Season total"}
    ],
    gates: ["Competitiveness / ball-hawk mentality","Tackling willingness","Discipline (eye control)","Coachability"]
  },
  ATH: {
    label: "Athlete (Flex)",
    archetypes: [
      {k:"Offense Flex", d:"Position-undecided offensive weapon — touches, matchups, and space are the priority."},
      {k:"Defense Flex", d:"Position-undecided defensive playmaker — instincts and range project across spots."},
      {k:"Special Teams", d:"Returner / core special teams impact player with developmental upside elsewhere."}
    ],
    film: [
      {id:"explosive", name:"Explosiveness", p:"Ability to create a big play from a standstill or in the open field."},
      {id:"ballskills", name:"Ball Skills / Playmaking", p:"Instinctive production with the ball in the air or in the hands."},
      {id:"instincts", name:"Football Instincts", p:"Plays fast without overthinking — translates regardless of scheme."},
      {id:"versatility", name:"Versatility", p:"Shows he can line up in multiple spots and produce."}
    ],
    athletic: [
      {id:"speed", name:"Speed", metric:"40 time"},
      {id:"cod", name:"Change of Direction", metric:"Short shuttle"},
      {id:"explosive", name:"Explosiveness", metric:"Vertical / broad jump"}
    ],
    production: [
      {id:"allpurpose", name:"Yards / Touch (All-Purpose)", metric:"Season total"},
      {id:"bigplay", name:"Big Play Rate", metric:"Plays 20+ yds / season"}
    ],
    gates: ["Competitiveness","Coachability","Versatility / willingness to move around","Effort on special teams"]
  }
};
const GRADE_LABELS = ["Poor","Below Avg","Average","Above Avg","Elite"];
