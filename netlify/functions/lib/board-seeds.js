/* =====================================================================
   board-seeds.js

   Rosters a school has handed us, committed here so a board can be put
   on a program's portal with one button in admin rather than a
   spreadsheet upload. Same row shape the Board tab's Excel upload
   produces, so importProgramBoard handles both the same way:

     [name, position, school, state, height, weight, phone, email,
      classYear, filmLink, note]

   Phone and email are stored admin-side only; they never reach a
   scout, a coach portal or a public profile.
===================================================================== */
const SEEDS = {
  GATEWAY26: {
    label: 'Gateway HS (Aurora, CO) — 2027/2028 prospects',
    program: 'GATEWAY26',
    source: "Coach Rashad Mason's prospect sheet, Nov 2026",
    rows: [
      ['Alex Florentino', 'DB', 'Gateway HS', 'CO', '5\'7"', '165', '720-469-2401', 'af2013756@gmail.com', '2027', 'http://www.hudl.com/v/2UaK6H', 'Nickel/OLB. Versatile defender who can play in space as a nickel/DB and come down in the box as an OLB. GPA 2.8. Projection D2/D3/NAIA.'],
      ['Braden Davis', 'OL', 'Gateway HS', 'CO', '6\'4"', '230', '470-510-3480', 'branden52davis@gmail.com', '2027', 'https://www.hudl.com/video/3/20118247/6afa69cd1f7e69b9b08ddfec', 'OL/DL. Long, athletic 2-way lineman with a frame that will fill out quickly in a college weight room. GPA 2.1. Projection FBS/FCS. X @Braden52davis.'],
      ['Quincey Brooks-Turner', 'OL', 'Gateway HS', 'CO', '5\'10"', '270', '303-578-7560', 'Quinceybrooksturner@gmail.com', '2027', 'https://www.hudl.com/v/2UcE9f', 'C. Makes our line calls, snaps it clean, and plays with great pad level, hands, and toughness. GPA 3.6. Projection D2/D3/NAIA.'],
      ['Forrest Clemmons', 'WR', 'Gateway HS', 'CO', '5\'9"', '140', '720-236-8203', 'forrestclemmons098@gmail.com', '2027', 'https://www.hudl.com/v/2UZF3z', 'WR/DB. Space player who can help you as a WR and as a DB. GPA 1.9. Projection D2/D3/NAIA.'],
      ['Justis Smith', 'OL', 'Gateway HS', 'CO', '6\'3"', '265', '720-456-2691', 'justissmith00@gmail.com', '2027', 'http://www.hudl.com/v/2TgzFB', 'OL/DL. Big, physical 2-way lineman with good size to compete right away at JUCO. Knee injury (rehab). GPA 2.5. Projection FBS/FCS. X @justoo2027.'],
      ['Lyric Wynn', 'RB', 'Gateway HS', 'CO', '5\'10"', '195', '720-978-8128', 'boss77football@gmail.com', '2027', 'https://www.hudl.com/v/2UY1Pk', 'RB/OLB. Best all-around prospect. 3x 100 meter league champion. GPA 4.1. Projection FBS/FCS. X @itsboss_34.'],
      ['Westin Rayburn', 'QB', 'Gateway HS', 'CO', '5\'11"', '160', '720-591-1333', 'westinrayburn09@gmail.com', '2027', 'http://www.hudl.com/v/2UbiNh', 'QB. Smart, accurate QB who understands the offense, makes the right reads. GPA 3.6. Projection D2/D3/NAIA. X @WestinRayburn01.'],
      ['Lucio Beltran', 'DL', 'Gateway HS', 'CO', '5\'11"', '275', '303-968-9785', 'lucioalvarezz5280@gmail.com', '2027', 'https://www.hudl.com/video/2/135/6afb4da2d667b0e6b2bd84c4', 'DL. Physical interior lineman who plays with leverage and toughness. GPA 2.3. Projection D2/D3/NAIA. X @lucio_Alvarr.'],
      ['Geraghty Osei', 'LB', 'Gateway HS', 'CO', '6\'2"', '195', '720-477-8059', 'geraghtyo3755@aurorak12.org', '2028', 'http://www.hudl.com/v/2UTi7R', 'LB/Edge. Long, athletic LB/Edge with real upside. GPA 3.0. Projection FBS/FCS.'],
      ['Jake Brock', 'ATH', 'Gateway HS', 'CO', '5\'7"', '175', '720-908-8104', 'jakebrock2010@gmail.com', '2028', 'http://www.hudl.com/v/2UawTN', 'ATH. Versatile ATH who can help you in multiple spots. GPA 4.0. Projection D2/D3/NAIA.'],
      ['Giovanni Wynn', 'RB', 'Gateway HS', 'CO', '5\'9"', '198', '303-435-1287', 'giovanniw9113@aurorak12.org', '2028', '', "RB. Physical RB with real game speed. GPA 4.0. Projection FBS/FCS. No film link on the coach's sheet."],
    ],
  },
};
module.exports = { SEEDS };
