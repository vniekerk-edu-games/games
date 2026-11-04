'use strict';
/* =========================================================
   ART – all pictures are drawn as SVG in code (no image files)
   ========================================================= */
const SKINS = ['#f6d2b0', '#e2aa7c', '#b97c4f', '#7a4f30'];
const HAIRS = ['#2a1a10', '#6b3f1d', '#c98a3a', '#e8c66a'];
const SHIRTS = ['#e2502d', '#2b84ff', '#2f9e4a', '#f5b51a', '#8a4fd6', '#ff7ab0'];
const HATS = [null, '#c9a96a', '#2f6b45', '#e2502d'];

function avatarSVG(av, extra = '') {
  const skin = SKINS[av.skin || 0], hair = HAIRS[av.hair || 0], shirt = av.pa ? '#a8885a' : SHIRTS[av.shirt || 0], hat = HATS[av.hat || 0];
  const girl = av.g === 'meisie';
  let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" ${extra}>`;
  if (girl && !hat) s += `<path d="M66 30 Q90 34 84 62 Q80 50 70 44Z" fill="${hair}"/>`;
  s += `<path d="M16 100 Q18 72 50 70 Q82 72 84 100Z" fill="${shirt}"/>`;
  s += `<path d="M40 71 L50 82 L60 71" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="3"/>`;
  s += `<rect x="43" y="58" width="14" height="14" rx="4" fill="${skin}"/>`;
  if (girl) s += `<path d="M27 40 Q22 66 33 70 L37 44Z M73 40 Q78 66 67 70 L63 44Z" fill="${hair}"/>`;
  s += `<circle cx="28" cy="46" r="5" fill="${skin}"/><circle cx="72" cy="46" r="5" fill="${skin}"/>`;
  s += `<circle cx="50" cy="44" r="22" fill="${skin}"/>`;
  s += `<path d="M28 42 Q27 18 50 18 Q73 18 72 42 Q68 30 52 29 Q38 29 28 42Z" fill="${hair}"/>`;
  if (av.pa) s += `<path d="M31 48 Q33 70 50 70 Q67 70 69 48 Q64 58 50 58 Q36 58 31 48Z" fill="${hair}"/>`;
  s += `<circle cx="42" cy="45" r="3.2" fill="#2a1a10"/><circle cx="58" cy="45" r="3.2" fill="#2a1a10"/>`;
  s += `<circle cx="43" cy="44" r="1" fill="#fff"/><circle cx="59" cy="44" r="1" fill="#fff"/>`;
  if (!av.pa) s += `<circle cx="36" cy="52" r="3.5" fill="#ff8a8a" opacity=".45"/><circle cx="64" cy="52" r="3.5" fill="#ff8a8a" opacity=".45"/>`;
  s += `<path d="M43 ${av.pa ? 56 : 54} Q50 ${av.pa ? 61 : 60} 57 ${av.pa ? 56 : 54}" fill="none" stroke="#7a2a1a" stroke-width="2.4" stroke-linecap="round"/>`;
  if (hat) s += `<ellipse cx="50" cy="28" rx="33" ry="7" fill="${hat}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/><path d="M33 28 Q34 9 50 9 Q66 9 67 28Z" fill="${hat}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/><rect x="33.5" y="21" width="33" height="5" fill="rgba(0,0,0,.28)"/>`;
  return s + '</svg>';
}

function camperSVG(col = '#2b9fc9', extra = '') {
  return `<svg viewBox="0 0 100 72" xmlns="http://www.w3.org/2000/svg" ${extra}>
  <ellipse cx="50" cy="66" rx="44" ry="4" fill="rgba(0,0,0,.22)"/>
  <rect x="20" y="4" width="54" height="7" rx="3" fill="#d9d2c0" stroke="#3a2a17" stroke-width="1.6"/>
  <path d="M6 56 V24 Q6 11 20 11 H74 Q90 11 94 28 L96 56Z" fill="#fffaf0" stroke="#3a2a17" stroke-width="2"/>
  <path d="M6.9 38 H95 L96 56 H6Z" fill="${col}"/>
  <path d="M6 56 V24 Q6 11 20 11 H74 Q90 11 94 28 L96 56Z" fill="none" stroke="#3a2a17" stroke-width="2"/>
  <rect x="12" y="17" width="20" height="14" rx="3" fill="#8fd3f5" stroke="#3a2a17" stroke-width="1.6"/>
  <rect x="36" y="17" width="20" height="14" rx="3" fill="#8fd3f5" stroke="#3a2a17" stroke-width="1.6"/>
  <path d="M62 17 H77 Q86 17 89 31 H62Z" fill="#8fd3f5" stroke="#3a2a17" stroke-width="1.6"/>
  <path d="M15 19 L22 19" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  <path d="M59 14 V54" stroke="#3a2a17" stroke-width="1.4" opacity=".6"/>
  <rect x="63" y="40" width="6" height="2.5" rx="1" fill="#3a2a17"/>
  <circle cx="93" cy="44" r="2.6" fill="#ffd84d" stroke="#3a2a17" stroke-width="1"/>
  <circle cx="26" cy="57" r="9" fill="#2a2a2a"/><circle cx="26" cy="57" r="4" fill="#cfcfcf"/>
  <circle cx="76" cy="57" r="9" fill="#2a2a2a"/><circle cx="76" cy="57" r="4" fill="#cfcfcf"/>
  </svg>`;
}

function acaciaSVG(extra = '') {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" ${extra}>
  <ellipse cx="50" cy="94" rx="30" ry="5" fill="rgba(0,0,0,.2)"/>
  <path d="M46 95 L48 62 Q40 50 26 40 L30 38 Q42 46 49 54 Q50 44 47 34 L52 34 Q54 46 53 54 Q60 44 72 38 L75 41 Q62 50 54 62 L56 95Z" fill="#7a4f2a"/>
  <ellipse cx="50" cy="32" rx="46" ry="13" fill="#3f7a2f"/>
  <ellipse cx="34" cy="26" rx="24" ry="10" fill="#4f9a3a"/>
  <ellipse cx="64" cy="25" rx="26" ry="10" fill="#4f9a3a"/>
  <ellipse cx="50" cy="20" rx="20" ry="8" fill="#62b04a"/>
  </svg>`;
}
function rockSVG(extra = '') {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" ${extra}><ellipse cx="50" cy="86" rx="40" ry="7" fill="rgba(0,0,0,.2)"/>
  <path d="M12 84 Q8 58 26 44 Q34 26 56 28 Q80 30 88 56 Q94 76 86 84Z" fill="#9a8f84"/><path d="M26 44 Q34 26 56 28 Q70 30 78 42 Q60 38 46 48 Q34 56 28 70Z" fill="#b9afa3"/></svg>`;
}
function aloeSVG(extra = '') {
  let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" ${extra}><ellipse cx="50" cy="90" rx="34" ry="6" fill="rgba(0,0,0,.2)"/>`;
  s += `<path d="M48 40 Q50 10 52 40" stroke="#e2502d" stroke-width="5" fill="none"/><path d="M49 10 Q50 2 51 10 L52 24 L48 24Z" fill="#ff7a3b"/>`;
  [[-60, '#5a9a5a'], [-30, '#6aae66'], [0, '#4f8f4f'], [30, '#6aae66'], [60, '#5a9a5a'], [-80, '#4f8f4f'], [80, '#4f8f4f']].forEach(([a, c]) => {
    s += `<path d="M50 88 Q${50 + a * .45} 70 ${50 + a * .62} ${52 - Math.abs(a) * .1} Q${50 + a * .2} 72 50 88Z" fill="${c}" stroke="#3a6a3a" stroke-width="1.2"/>`;
  });
  return s + '</svg>';
}
function braaiSVG(extra = '', fire = true) {
  let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" ${extra}><ellipse cx="50" cy="93" rx="36" ry="5" fill="rgba(0,0,0,.2)"/>
  <path d="M26 92 L34 66 M74 92 L66 66" stroke="#3a3a3a" stroke-width="4"/>
  <path d="M16 54 Q16 76 50 76 Q84 76 84 54Z" fill="#3a3a3a"/><rect x="14" y="50" width="72" height="6" rx="3" fill="#555"/>`;
  if (fire) s += `<path d="M30 52 Q32 30 40 40 Q42 22 50 34 Q56 18 60 38 Q66 28 70 52Z" fill="#ff8a1a"/><path d="M38 52 Q42 38 46 44 Q50 32 54 44 Q58 38 62 52Z" fill="#ffd84d"/>`;
  s += `<path d="M18 50 H82 M24 46 V54 M34 46 V54 M44 46 V54 M54 46 V54 M64 46 V54 M74 46 V54" stroke="#888" stroke-width="2"/>`;
  return s + '</svg>';
}

/* ---------- hub scene ---------- */
function hubSceneSVG(unlocked) {
  const has = id => unlocked.includes(id);
  const tree = (x, y, sc) => `<g transform="translate(${x - 50 * sc},${y - 95 * sc}) scale(${sc})">${acaciaSVG().replace(/<\/?svg[^>]*>/g, '')}</g>`;
  const inner = svg => svg.replace(/<svg[^>]*>/, '').replace('</svg>', '');
  let s = `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fc0ee"/><stop offset=".55" stop-color="#bfe4f5"/><stop offset="1" stop-color="#fbe3b0"/></linearGradient>
    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9c964"/><stop offset="1" stop-color="#5f9a43"/></linearGradient>
    <radialGradient id="sun"><stop offset="0" stop-color="#fff7c8"/><stop offset=".55" stop-color="#ffe680"/><stop offset="1" stop-color="#ffe680" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <circle cx="1270" cy="160" r="140" fill="url(#sun)"/><circle cx="1270" cy="160" r="58" fill="#fff4b8"/>
  <g fill="#fff" opacity=".9"><g><ellipse cx="300" cy="140" rx="70" ry="26"/><ellipse cx="350" cy="120" rx="50" ry="30"/><ellipse cx="250" cy="150" rx="40" ry="18"/>
    <animateTransform attributeName="transform" type="translate" from="-80 0" to="80 0" dur="40s" repeatCount="indefinite" values="-80 0;80 0;-80 0"/></g>
    <g><ellipse cx="900" cy="100" rx="60" ry="20"/><ellipse cx="940" cy="86" rx="44" ry="24"/>
    <animateTransform attributeName="transform" type="translate" dur="55s" repeatCount="indefinite" values="60 0;-60 0;60 0"/></g></g>
  <path d="M0 470 L80 400 L200 380 L260 300 L420 290 L470 330 L560 320 L640 250 L860 245 L930 300 L1040 290 L1100 230 L1300 225 L1360 290 L1480 300 L1600 260 V560 H0Z" fill="#9db3d1"/>
  <path d="M260 300 L420 290 L430 310 L270 320Z M640 250 L860 245 L870 270 L650 274Z M1100 230 L1300 225 L1310 250 L1110 254Z" fill="#c6d4e6"/>
  <path d="M0 520 Q200 420 420 470 Q620 400 820 460 Q1050 390 1260 450 Q1450 400 1600 440 V600 H0Z" fill="#c4b874"/>
  <path d="M0 560 Q300 520 600 548 Q900 520 1200 545 Q1450 525 1600 540 V900 H0Z" fill="url(#gr)"/>
  <path d="M760 900 Q780 760 900 640 Q1010 540 1130 470" fill="none" stroke="#e8d3a0" stroke-width="40" stroke-linecap="round"/>
  <path d="M760 900 Q780 760 900 640 Q1010 540 1130 470" fill="none" stroke="#d9be84" stroke-width="40" stroke-dasharray="2 46" stroke-linecap="round"/>
  <path d="M1040 900 Q1160 760 1340 720 Q1480 690 1600 640 V900Z" fill="#3fa1d8"/>
  <path d="M1100 900 Q1200 790 1350 752 Q1480 722 1600 680" fill="none" stroke="#8fd3f5" stroke-width="6" stroke-dasharray="40 30" opacity=".8"><animate attributeName="stroke-dashoffset" from="0" to="-140" dur="3s" repeatCount="indefinite"/></path>
  <path d="M1040 900 Q1160 760 1340 720 Q1480 690 1600 640" fill="none" stroke="#c9a46a" stroke-width="10"/>
  ${tree(1460, 560, 1.6)}${tree(720, 540, 1.3)}${tree(140, 640, 2.6)}
  <g transform="translate(1330,770) rotate(-12)"><path d="M0 0 Q60 26 140 0 Q120 22 70 24 Q20 22 0 0Z" fill="#e2502d" stroke="#8f2a10" stroke-width="3"/><path d="M40 -4 L100 30" stroke="#7a4f2a" stroke-width="6" stroke-linecap="round"/></g>
  <g transform="translate(1110,440)"><rect x="-5" y="0" width="10" height="90" fill="#7a4f2a"/><path d="M-60 6 H50 L66 22 L50 38 H-60Z" fill="#c98a3a" stroke="#7a4f2a" stroke-width="3"/><text x="-4" y="30" text-anchor="middle" font-family="Trebuchet MS" font-weight="bold" font-size="20" fill="#4a2500">Staproete</text></g>
  <g transform="translate(260,470) scale(3.1)">${inner(camperSVG('#2b9fc9'))}</g>
  <path d="M560 520 L700 540 L700 548 L560 532Z" fill="#e2502d" opacity=".9"/>
  <path d="M560 532 L566 640 M700 548 L694 640" stroke="#555" stroke-width="5"/>
  <g transform="translate(560,600) scale(1.15)">${inner(braaiSVG())}</g>
  <g opacity=".55"><circle cx="618" cy="560" r="16" fill="#ddd"><animate attributeName="cy" values="600;470" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0" dur="3s" repeatCount="indefinite"/></circle>
    <circle cx="610" cy="560" r="12" fill="#ddd"><animate attributeName="cy" values="600;480" dur="3s" begin="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0" dur="3s" begin="1.5s" repeatCount="indefinite"/></circle></g>
  <g transform="translate(470,640)"><path d="M0 0 H44 V40 H0Z M0 40 L-6 70 M44 40 L50 70 M4 0 V-30 H40 V0" fill="#2b84ff" stroke="#1a4fb0" stroke-width="5"/></g>
  <g transform="translate(720,650)"><path d="M0 0 H44 V40 H0Z M0 40 L-6 70 M44 40 L50 70 M4 0 V-30 H40 V0" fill="#2f9e4a" stroke="#1d6a30" stroke-width="5"/></g>`;
  const emo = (x, y, e, size = 60) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle">${e}</text>`;
  if (has('vlag')) s += `<path d="M300 470 V330" stroke="#555" stroke-width="5"/><path d="M300 332 L380 350 L300 372Z" fill="#ffcf3f"><animate attributeName="d" values="M300 332 L380 350 L300 372Z;M300 332 L376 356 L300 372Z;M300 332 L380 350 L300 372Z" dur="1.5s" repeatCount="indefinite"/></path>`;
  if (has('sokker')) s += emo(240, 800, '⚽', 54);
  if (has('bordspel')) s += `<g transform="translate(860,700)"><rect x="-80" y="0" width="160" height="16" rx="6" fill="#a8743f"/><path d="M-70 16 L-76 70 M70 16 L76 70" stroke="#7a4f2a" stroke-width="8"/></g>` + emo(830, 698, '🎲', 40) + emo(890, 698, '♟️', 40);
  if (has('potjie')) s += emo(520, 720, '🍲', 58);
  if (has('krieket')) s += `<g transform="translate(990,700)"><path d="M0 0 V70 M14 0 V70 M28 0 V70" stroke="#f3e3bf" stroke-width="6"/><path d="M-2 0 H30" stroke="#c98a3a" stroke-width="4"/></g>` + emo(1060, 780, '🏏', 50);
  if (has('rugby')) s += emo(130, 850, '🏉', 54);
  if (has('ligte')) { s += `<path d="M300 380 Q430 420 560 400" stroke="#333" stroke-width="2" fill="none"/>`; for (let i = 0; i < 8; i++) { const x = 310 + i * 32, y = 385 + Math.sin(i / 7 * Math.PI) * 26; s += `<circle cx="${x}" cy="${y}" r="7" fill="${['#ffcf3f', '#ff7ab0', '#5ec8ff', '#7ee08a'][i % 4]}"><animate attributeName="opacity" values="1;.4;1" dur="${1 + i % 3 * .4}s" repeatCount="indefinite"/></circle>`; } }
  if (has('teleskoop')) s += emo(1250, 560, '🔭', 60);
  if (has('kitaar')) s += emo(660, 780, '🎸', 56);
  return s + '</svg>';
}
