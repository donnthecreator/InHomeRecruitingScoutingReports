/* The film clip checklist. Mirrors InHome-Film-Clip-Guide.md. A clip
   uploaded with a guide_id checks the item off. `start10` marks the ten
   to cut first. Groups use the same codes as the position picker. */
const GUIDE = [
  /* core */
  { id: 'core_two_high',     groups: ['ALL'], title: 'Two-high, no movement: name the coverage',            start10: true },
  { id: 'core_rotation',     groups: ['ALL'], title: 'Two-high, one safety rotates down at the snap',      start10: true },
  { id: 'core_single_press', groups: ['ALL'], title: 'Single-high with pressed corners: Cover 1 vs Cover 3' },
  { id: 'core_zero',         groups: ['ALL'], title: 'Cover 0: nobody deep, pressure coming',               start10: true },
  { id: 'core_personnel',    groups: ['ALL'], title: 'Personnel ID off the huddle break (11 / 12 / 21)' },
  { id: 'core_situation',    groups: ['ALL'], title: 'Down and distance read, third and long late half', start10: true },
  /* QB */
  { id: 'qb_mike',        groups: ['QB'], title: 'Five-man pressure, where is the Mike',                 start10: true },
  { id: 'qb_overload',    groups: ['QB'], title: 'Overload to one side, what has to happen' },
  { id: 'qb_leverage',    groups: ['QB'], title: 'Safety leverage on the slot, what it takes away' },
  { id: 'qb_rpo',         groups: ['QB'], title: 'RPO: who is the read defender' },
  { id: 'qb_progression', groups: ['QB'], title: 'First read covered, where the eyes go next' },
  { id: 'qb_empty',       groups: ['QB'], title: 'Empty vs six on the line, what you do pre-snap' },
  /* RB */
  { id: 'rb_zone_aim',    groups: ['RB'], title: 'Outside zone, first read / aiming point' },
  { id: 'rb_zone_cut',    groups: ['RB'], title: 'Zone: bang, bend, or bounce' },
  { id: 'rb_gap_pull',    groups: ['RB'], title: 'Gap scheme, follow the puller' },
  { id: 'rb_blitz_pickup',groups: ['RB'], title: 'Pass pro: who is yours, what is your fit',           start10: true },
  { id: 'rb_scan',        groups: ['RB'], title: 'Pass pro: nobody comes, scan then leak' },
  { id: 'rb_screen',      groups: ['RB'], title: 'Screen setup' },
  /* WR / TE */
  { id: 'wr_release',     groups: ['WR', 'TE'], title: 'Press release vs leverage',                        start10: true },
  { id: 'wr_cover2_hole', groups: ['WR', 'TE'], title: 'Cover 2 honey hole' },
  { id: 'wr_hot',         groups: ['WR', 'TE'], title: 'Sight adjust / hot vs blitz from your side' },
  { id: 'wr_scramble',    groups: ['WR', 'TE'], title: 'Scramble drill' },
  { id: 'wr_stalk',       groups: ['WR'],       title: 'Backside stalk block' },
  { id: 'te_down_gap',    groups: ['TE'],       title: 'TE down block, C gap first' },
  { id: 'te_lb_lev',      groups: ['TE'],       title: 'TE vs linebacker leverage in man' },
  /* OL */
  { id: 'ol_front_id',    groups: ['OL'], title: 'Front ID: where is the 3-tech, odd or even' },
  { id: 'ol_combo',       groups: ['OL'], title: 'Combo timing, when the tackle comes off' },
  { id: 'ol_slide',       groups: ['OL'], title: 'Slide protection, a defender crosses your face' },
  { id: 'ol_twist',       groups: ['OL'], title: 'Twist pickup' },
  { id: 'ol_pull',        groups: ['OL'], title: 'Pull rules, who the puller kicks out' },
  /* DL */
  { id: 'dl_gap',         groups: ['DL'], title: 'Gap integrity on a run to your side' },
  { id: 'dl_down_pull',   groups: ['DL'], title: 'Down block equals puller',                             start10: true },
  { id: 'dl_pass_run',    groups: ['DL'], title: 'Pass/run key off the lineman' },
  { id: 'dl_rush_plan',   groups: ['DL'], title: 'Rush plan: won inside twice, what now' },
  { id: 'dl_screen',      groups: ['DL'], title: 'Screen recognition' },
  /* LB */
  { id: 'lb_pull',        groups: ['LB'], title: 'Guard pull, where is the ball',                        start10: true },
  { id: 'lb_fit',         groups: ['LB'], title: 'Run fit, right shoulder' },
  { id: 'lb_pa',          groups: ['LB'], title: 'Play action, read hats not backs' },
  { id: 'lb_zone_eyes',   groups: ['LB'], title: 'Zone drop, where are your eyes' },
  { id: 'lb_empty',       groups: ['LB'], title: 'Empty check' },
  /* DB */
  { id: 'db_leverage',    groups: ['DB'], title: 'Leverage and help',                                    start10: true },
  { id: 'db_split',       groups: ['DB'], title: 'Split tells' },
  { id: 'db_cover2',      groups: ['DB'], title: 'Cover 2 corner duties' },
  { id: 'db_force',       groups: ['DB'], title: 'Force: set the edge' },
  { id: 'db_eyes',        groups: ['DB'], title: 'Zone eyes vs man eyes (two clips)' },
  { id: 'db_smash',       groups: ['DB'], title: 'Safety on a smash concept' },
  { id: 'db_quarters',    groups: ['DB'], title: 'Quarters, #2 vertical trigger' }
];
module.exports = { GUIDE };
