// Logos originais das 20 empresas de Neópolis.
// marca(id)  → só o símbolo (quadrado 100×100), usado na cidade e no ranking.
// logo(id)   → símbolo + nome da empresa, usado nos cartões.

const W = 'stroke-linecap="round" stroke-linejoin="round"';

const DESENHOS = {
  eletroluz: { fundo: '#111114', cor: '#f5c542', svg: (c) => `
    <circle cx="50" cy="50" r="33" fill="none" stroke="${c}" stroke-width="5"/>
    <path d="M56 17 L33 54 H48 L42 83 L68 44 H53 Z" fill="${c}"/>` },
  petrosul: { fundo: '#10294a', cor: '#ffffff', svg: (c) => `
    <g fill="none" stroke="${c}" stroke-width="4.5" ${W}>
      <path d="M44 16 L30 78 M44 16 L58 78 M34 60 H54 M37 45 H51 M40 30 H48"/><path d="M22 80 H66"/></g>
    <path d="M76 42 C76 42 64 56 64 64 A12 12 0 0 0 88 64 C88 56 76 42 76 42 Z" fill="#ff8a2b"/>` },
  alicerce: { fundo: '#b5532f', cor: '#fff3e6', svg: (c) => `
    <g fill="${c}">
      <rect x="18" y="58" width="30" height="13" rx="2"/><rect x="52" y="58" width="30" height="13" rx="2"/>
      <rect x="18" y="74" width="14" height="10" rx="2"/><rect x="35" y="74" width="30" height="10" rx="2"/><rect x="68" y="74" width="14" height="10" rx="2"/>
      <rect x="35" y="42" width="30" height="13" rx="2"/>
      <path d="M30 38 A20 20 0 0 1 70 38 Z"/><rect x="26" y="36" width="48" height="5" rx="2.5"/></g>` },
  database: { fundo: '#1e2430', cor: '#ffffff', svg: (c) => `
    <g fill="none" stroke="${c}" stroke-width="4">
      <ellipse cx="50" cy="26" rx="26" ry="9"/>
      <path d="M24 26 V40 C24 45 36 49 50 49 C64 49 76 45 76 40 V26"/>
      <path d="M24 40 V56 C24 61 36 65 50 65 C64 65 76 61 76 56 V40"/>
      <path d="M24 56 V72 C24 77 36 81 50 81 C64 81 76 77 76 72 V56"/></g>
    <circle cx="34" cy="44" r="3" fill="#ff5d5d"/><circle cx="34" cy="60" r="3" fill="#3ccf8e"/><circle cx="34" cy="76" r="3" fill="#4fa3ff"/>` },
  qbit: { fundo: '#0d1b3e', cor: '#33c2ff', svg: (c) => `
    <path d="M50 14 L81 32 V68 L50 86 L19 68 V32 Z" fill="none" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="15" fill="none" stroke="#ffffff" stroke-width="5"/>
    <path d="M57 57 L68 68" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>` },
  memorix: { fundo: '#2a1a0e', cor: '#ff8a1f', svg: (c) => `
    <rect x="24" y="28" width="52" height="44" rx="5" fill="${c}"/>
    <g stroke="${c}" stroke-width="4" stroke-linecap="round">
      ${[32, 42, 52, 62, 70].map((x) => `<path d="M${x} 20 V26 M${x} 74 V80"/>`).join('')}</g>
    <g fill="#2a1a0e"><rect x="32" y="38" width="8" height="24" rx="2"/><rect x="46" y="38" width="8" height="24" rx="2"/><rect x="60" y="38" width="8" height="24" rx="2"/></g>` },
  voltmotriz: { fundo: '#062b3a', cor: '#2ee6ff', svg: (c) => `
    <path d="M50 14 l6 9 10-3 1 10 10 3-4 10 7 7-9 6 2 10-10 1-3 10-9-5-8 7-6-9-10 3-1-10-10-3 4-10-7-7 9-6-2-10 10-1 3-10 9 5z" fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="13" fill="none" stroke="#ffffff" stroke-width="4.5"/>
    <path d="M45 41 L55 50 L45 59" fill="none" stroke="${c}" stroke-width="4" ${W}/>` },
  megastore: { fundo: '#121212', cor: '#7dff3a', svg: (c) => `
    <path d="M36 34 A14 14 0 0 1 64 34" fill="none" stroke="${c}" stroke-width="5"/>
    <path d="M24 34 H76 L72 82 H28 Z" fill="${c}"/>
    <path d="M36 72 V48 L50 62 L64 48 V72" fill="none" stroke="#121212" stroke-width="6" ${W}/>` },
  supermarket: { fundo: '#c8102e', cor: '#ffd23f', svg: (c) => `
    <rect x="22" y="44" width="56" height="36" rx="3" fill="#ffffff"/>
    <path d="M18 30 H82 L78 46 H22 Z" fill="${c}"/>
    <g fill="#c8102e"><path d="M30 30 H40 L38 46 H28 Z"/><path d="M50 30 H60 L60 46 H50 Z"/><path d="M70 30 H80 L80 46 H72 Z"/></g>
    <rect x="30" y="54" width="16" height="14" rx="2" fill="#c8102e"/><rect x="54" y="54" width="16" height="26" rx="2" fill="#2b2b2b"/>` },
  drinkcia: { fundo: '#ffb703', cor: '#1d1d1d', svg: (c) => `
    <path d="M43 14 H57 V30 C57 34 66 38 66 48 V82 C66 85 64 86 61 86 H39 C36 86 34 85 34 82 V48 C34 38 43 34 43 30 Z" fill="${c}"/>
    <rect x="34" y="54" width="32" height="16" fill="#ffffff"/>
    <circle cx="72" cy="30" r="4" fill="${c}"/><circle cx="78" cy="42" r="3" fill="${c}"/><circle cx="24" cy="36" r="3" fill="${c}"/>` },
  pulsar: { fundo: '#0f3d2e', cor: '#3ddc84', svg: (c) => `
    <g fill="${c}"><rect x="40" y="56" width="11" height="20" rx="2"/><rect x="55" y="44" width="11" height="32" rx="2"/><rect x="70" y="30" width="11" height="46" rx="2"/></g>
    <path d="M64 20 L84 14 L80 34" fill="none" stroke="${c}" stroke-width="5" ${W}/>
    <path d="M18 46 C18 70 40 86 68 84" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>` },
  invest: { fundo: '#050505', cor: '#ffffff', svg: (c) => `
    <path d="M14 74 L36 50 L50 62 L80 28" fill="none" stroke="${c}" stroke-width="6" ${W}/>
    <path d="M64 26 H82 V44" fill="none" stroke="${c}" stroke-width="6" ${W}/>
    <rect x="14" y="80" width="72" height="4" rx="2" fill="#d6a840"/>` },
  seguraprev: { fundo: '#0b4f8a', cor: '#ffffff', svg: (c) => `
    <path d="M50 12 L80 24 V48 C80 66 67 80 50 88 C33 80 20 66 20 48 V24 Z" fill="none" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>
    <g fill="${c}"><rect x="36" y="54" width="7" height="14" rx="1.5"/><rect x="47" y="46" width="7" height="22" rx="1.5"/><rect x="58" y="36" width="7" height="32" rx="1.5"/></g>` },
  ferroaco: { fundo: '#2b2b2b', cor: '#cfd3d6', svg: (c) => `
    <path d="M14 34 H74 C74 44 66 50 56 52 L60 62 H72 V72 H28 V62 H40 L44 52 C30 50 22 44 14 34 Z" fill="${c}"/>
    <path d="M74 34 H86 C86 40 80 42 74 42" fill="${c}"/>
    <g stroke="#ff8a2b" stroke-width="3" stroke-linecap="round"><path d="M60 24 L66 14"/><path d="M68 26 L78 20"/><path d="M52 24 L50 14"/></g>` },
  jm: { fundo: '#1a1a1a', cor: '#e2b04a', svg: (c) => `
    <path d="M24 54 A26 26 0 0 1 76 54 Z" fill="${c}"/><rect x="18" y="52" width="64" height="8" rx="4" fill="${c}"/>
    <rect x="46" y="26" width="8" height="26" rx="3" fill="#1a1a1a" opacity=".35"/>
    <path d="M30 86 V72 L50 62 L70 72 V86 Z" fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>` },
  agrotech: { fundo: '#1f5d2a', cor: '#f2c14e', svg: (c) => `
    <path d="M50 88 V24" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
    <g fill="${c}">${[30, 42, 54, 66].map((y) => `<ellipse cx="41" cy="${y}" rx="9" ry="5" transform="rotate(-35 41 ${y})"/><ellipse cx="59" cy="${y}" rx="9" ry="5" transform="rotate(35 59 ${y})"/>`).join('')}
    <ellipse cx="50" cy="18" rx="5" ry="9"/></g>` },
  atlas: { fundo: '#f4c430', cor: '#141414', svg: (c) => `
    <path d="M20 40 C34 18 66 18 80 40 C66 30 34 30 20 40 Z" fill="${c}"/>
    <path d="M50 30 L50 86" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
    <g fill="${c}"><rect x="70" y="60" width="6" height="6"/><rect x="78" y="54" width="5" height="5"/><rect x="78" y="66" width="4" height="4"/></g>` },
  eucalyptus: { fundo: '#e6f2e4', cor: '#1f7a3e', svg: (c) => `
    <path d="M26 20 H62 L74 32 V82 H26 Z" fill="#ffffff" stroke="#2c3a2e" stroke-width="4" stroke-linejoin="round"/>
    <path d="M62 20 V32 H74" fill="none" stroke="#2c3a2e" stroke-width="4" stroke-linejoin="round"/>
    <path d="M38 72 C36 52 48 40 64 40 C66 58 56 72 38 72 Z" fill="${c}"/>
    <path d="M38 72 C46 62 52 54 60 46" stroke="#e6f2e4" stroke-width="2.5" fill="none"/>` },
  doctormed: { fundo: '#0a74c9', cor: '#ffffff', svg: (c) => `
    <path d="M40 16 H60 V40 H84 V60 H60 V84 H40 V60 H16 V40 H40 Z" fill="${c}"/>
    <path d="M42 34 V46 C42 54 58 54 58 46 V34" fill="none" stroke="#0a74c9" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 52 V64" stroke="#0a74c9" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="68" r="4.5" fill="#0a74c9"/>` },
  farmacom: { fundo: '#e9f4ff', cor: '#1279ff', svg: (c) => `
    <g transform="rotate(-40 50 50)">
      <rect x="22" y="36" width="56" height="28" rx="14" fill="#ffffff" stroke="#173b66" stroke-width="4"/>
      <path d="M50 36 H64 A14 14 0 0 1 64 64 H50 Z" fill="${c}"/></g>
    <g stroke="${c}" stroke-width="3.5" stroke-linecap="round"><path d="M76 16 V28 M70 22 H82"/><path d="M20 72 V82 M15 77 H25"/></g>` },
};

const cache = {};

function claro(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170;
}

export function marcaSvg(id, tam = 100) {
  const d = DESENHOS[id];
  if (!d) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 100 100">
<rect width="100" height="100" rx="22" fill="${d.fundo}"/>${d.svg(d.cor)}</svg>`;
}

// Endereço de imagem (data URL) do símbolo
export function marca(id) {
  if (!cache[id]) cache[id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(marcaSvg(id));
  return cache[id];
}

// Símbolo + nome (para cartões e para a apresentação dos logos)
export function logoSvg(id, nome) {
  const d = DESENHOS[id];
  const tam = nome.length > 16 ? 15 : nome.length > 11 ? 18 : 22;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" width="200" height="150">
<rect width="200" height="150" rx="18" fill="${d.fundo}"/>
<g transform="translate(64 10) scale(.72)">${d.svg(d.cor)}</g>
<text x="100" y="128" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-weight="800" font-size="${tam}" letter-spacing=".5" fill="${claro(d.fundo) ? '#141414' : '#ffffff'}">${nome.replace(/&/g, '&amp;')}</text>
</svg>`;
}

export function logo(id, nome) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logoSvg(id, nome));
}

export const COR_EMPRESA = Object.fromEntries(Object.entries(DESENHOS).map(([k, v]) => [k, v.fundo]));
