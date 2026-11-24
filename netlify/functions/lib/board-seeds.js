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
  GATEWAY26_ROSTER: {
    label: 'Gateway HS (Aurora, CO) \u2014 rest of the 26-27 varsity roster',
    program: 'GATEWAY26',
    source: 'Gateway 26-27 varsity roster, Nov 24 2026. The 11 selected prospects are the GATEWAY26 seed; this is everyone else.',
    rows: [
      ["Sonny Lopez", "LB", "Gateway HS", "CO", "5'11\"", "185", "", "", "2029", "", "#0 · LB, RB · So on the 26-27 varsity roster"],
      ["Jeramiah Stark", "ATH", "Gateway HS", "CO", "6'2\"", "185", "", "", "2027", "", "#6 · ATH · Sr on the 26-27 varsity roster"],
      ["Luis Grajeda", "RB", "Gateway HS", "CO", "5'10\"", "165", "", "", "2028", "", "#8 · RB, CB · Jr on the 26-27 varsity roster"],
      ["Jaysean Jones-Hinson", "DB", "Gateway HS", "CO", "6'0\"", "180", "", "", "2028", "", "#9 · DB, ATH · Jr on the 26-27 varsity roster"],
      ["Brandon Collins", "WR", "Gateway HS", "CO", "6'0\"", "170", "", "", "2029", "", "#10 · WR, CB · So on the 26-27 varsity roster"],
      ["Nolan Vazquez", "DB", "Gateway HS", "CO", "6'2\"", "160", "", "", "2027", "", "#11 · FS, WR · Sr on the 26-27 varsity roster"],
      ["Claude Espinoza", "LB", "Gateway HS", "CO", "6'0\"", "180", "", "", "2028", "", "#13 · OLB, WR · Jr on the 26-27 varsity roster"],
      ["Urocca Guyton", "ATH", "Gateway HS", "CO", "5'5\"", "115", "", "", "2029", "", "#14 · ATH · So on the 26-27 varsity roster"],
      ["Josiah Hayes", "DB", "Gateway HS", "CO", "6'2\"", "175", "", "", "2027", "", "#16 · DB, WR · Sr on the 26-27 varsity roster"],
      ["Raeyaun Walker", "QB", "Gateway HS", "CO", "5'9\"", "180", "", "", "2030", "", "#17 · QB, ATH · Fr on the 26-27 varsity roster"],
      ["Gamaliel Ross", "RB", "Gateway HS", "CO", "5'10\"", "175", "", "", "2029", "", "#18 · RB, LB · So on the 26-27 varsity roster"],
      ["Teyon Bates", "DB", "Gateway HS", "CO", "6'0\"", "155", "", "", "2029", "", "#19 · DB, WR · So on the 26-27 varsity roster"],
      ["Quinton Sykes", "DB", "Gateway HS", "CO", "", "", "", "", "2029", "", "#20 · DB, WR · So on the 26-27 varsity roster"],
      ["Bryce Green", "DB", "Gateway HS", "CO", "6'3\"", "175", "", "", "2029", "", "#21 · DB, WR · So on the 26-27 varsity roster"],
      ["Hezekiah Potter", "DB", "Gateway HS", "CO", "5'8\"", "140", "", "", "2029", "", "#22 · CB · So on the 26-27 varsity roster"],
      ["Yhael Perez", "DB", "Gateway HS", "CO", "5'8\"", "170", "", "", "2029", "", "#24 · DB, RB, WR · So on the 26-27 varsity roster"],
      ["Anthony Motto", "K", "Gateway HS", "CO", "5'7\"", "125", "", "", "2027", "", "#26 · K, WR, DB · Sr on the 26-27 varsity roster"],
      ["Aboubacar Cisse", "DB", "Gateway HS", "CO", "6'3\"", "185", "", "", "2028", "", "#27 · DB, WR · Jr on the 26-27 varsity roster"],
      ["Jakhi Howard", "WR", "Gateway HS", "CO", "5'9\"", "160", "", "", "2030", "", "#28 · WR, DB · Fr on the 26-27 varsity roster"],
      ["Eduardo Varela", "DB", "Gateway HS", "CO", "5'9\"", "155", "", "", "2029", "", "#34 · DB, RB · So on the 26-27 varsity roster"],
      ["Hector Hernanadez", "LB", "Gateway HS", "CO", "5'11\"", "175", "", "", "2027", "", "#35 · LB, RB · Sr on the 26-27 varsity roster"],
      ["Adrian Kumul", "DB", "Gateway HS", "CO", "5'8\"", "175", "", "", "2028", "", "#36 · SS, RB · Jr on the 26-27 varsity roster"],
      ["Daniel Amenta", "DB", "Gateway HS", "CO", "5'7\"", "135", "", "", "2029", "", "#38 · DB, RB · So on the 26-27 varsity roster"],
      ["Edwin Morales", "DL", "Gateway HS", "CO", "6'0\"", "180", "", "", "2029", "", "#39 · DE · So on the 26-27 varsity roster"],
      ["Waleed Bellali", "LB", "Gateway HS", "CO", "6'1\"", "170", "", "", "2027", "", "#40 · OLB · Sr on the 26-27 varsity roster"],
      ["Cordae Morris", "QB", "Gateway HS", "CO", "5'10\"", "185", "", "", "2028", "", "#44 · QB, LB · Jr on the 26-27 varsity roster"],
      ["Keith Lucero", "DB", "Gateway HS", "CO", "5'7\"", "135", "", "", "2029", "", "#45 · DB, RB · So on the 26-27 varsity roster"],
      ["Saul Herrera", "DL", "Gateway HS", "CO", "6'1\"", "175", "", "", "2029", "", "#47 · DE, OLB · So on the 26-27 varsity roster"],
      ["Malik Omar-Muhammad Johnson", "DB", "Gateway HS", "CO", "", "", "", "", "2029", "", "#49 · DB, WR · So on the 26-27 varsity roster"],
      ["Isaac Gonzalez Morena", "DL", "Gateway HS", "CO", "6'2\"", "230", "", "", "2027", "", "#50 · DE, OL · Sr on the 26-27 varsity roster"],
      ["Drace Zavala-ogman", "DL", "Gateway HS", "CO", "6'2\"", "185", "", "", "2029", "", "#51 · DL, OL · So on the 26-27 varsity roster"],
      ["Christopher Amaya", "LB", "Gateway HS", "CO", "5'9\"", "220", "", "", "2028", "", "#53 · LB, DL · Jr on the 26-27 varsity roster"],
      ["Santiago Rueda", "LB", "Gateway HS", "CO", "6'2\"", "185", "", "", "2030", "", "#54 · OLB, OL · Fr on the 26-27 varsity roster"],
      ["Luis Almazan", "OL", "Gateway HS", "CO", "6'2\"", "250", "", "", "2029", "", "#56 · OL, DL · So on the 26-27 varsity roster"],
      ["Kaptan Ruiz", "LB", "Gateway HS", "CO", "5'8\"", "225", "", "", "2028", "", "#57 · LB, DT, OL · Jr on the 26-27 varsity roster"],
      ["Alan Martinez Lopez", "OL", "Gateway HS", "CO", "", "", "", "", "2029", "", "#58 · OL, DL · So on the 26-27 varsity roster"],
      ["Carlos Maes", "OL", "Gateway HS", "CO", "6'2\"", "265", "", "", "2028", "", "#65 · OL, DL · Jr on the 26-27 varsity roster"],
      ["Vincent Mendoza", "DL", "Gateway HS", "CO", "5'10\"", "315", "", "", "2029", "", "#66 · DL, OL · So on the 26-27 varsity roster"],
      ["Shooter Torres Sanchez", "DL", "Gateway HS", "CO", "", "", "", "", "2028", "", "#68 · DL, OL · Jr on the 26-27 varsity roster"],
      ["Xzyjon Revis", "OL", "Gateway HS", "CO", "6'3\"", "310", "", "", "2028", "", "#70 · G, DL · Jr on the 26-27 varsity roster"],
      ["Bezen Lema", "OL", "Gateway HS", "CO", "6'0\"", "245", "", "", "2028", "", "#72 · OL, DL · Jr on the 26-27 varsity roster"],
      ["Cesar Valenzuela Mottu", "K", "Gateway HS", "CO", "", "", "", "", "2028", "", "#80 · K · Jr on the 26-27 varsity roster"],
      ["Maxmillion Hughes", "TE", "Gateway HS", "CO", "6'5\"", "190", "", "", "2030", "", "#88 · TE, DE · Fr on the 26-27 varsity roster"],
    ],
  },
};
module.exports = { SEEDS };
