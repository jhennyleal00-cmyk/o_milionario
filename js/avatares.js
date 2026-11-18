// Os 8 avatares prontos (desenhos originais, em SVG).
// No banco ficam como 'preset:0' … 'preset:7'.

const PELES = ['#f1c9a5', '#d9a57b', '#b97a52', '#8a5636', '#5e3a24'];

const LISTA = [
  { fundo: '#1f3b57', pele: PELES[0], cabelo: '#2b1d14', estilo: 'lateral', terno: '#1b1e27', gravata: '#c9a24a' },
  { fundo: '#5a2230', pele: PELES[2], cabelo: '#1a1210', estilo: 'longo',   terno: '#222a3a', gravata: null, colar: true },
  { fundo: '#24463a', pele: PELES[3], cabelo: '#141010', estilo: 'careca',  terno: '#2c2c32', gravata: '#8f2d2d', barba: true },
  { fundo: '#4b3a6b', pele: PELES[1], cabelo: '#6b3e1f', estilo: 'coque',   terno: '#3a2f4d', gravata: null, colar: true, oculos: true },
  { fundo: '#6b4a1e', pele: PELES[4], cabelo: '#0f0b09', estilo: 'blackpower', terno: '#1c2433', gravata: '#2f6f8f' },
  { fundo: '#23384f', pele: PELES[0], cabelo: '#c9a35b', estilo: 'rabo',    terno: '#3b4250', gravata: null, colar: true },
  { fundo: '#3d2a24', pele: PELES[2], cabelo: '#9a9a9a', estilo: 'curto',   terno: '#1d1d22', gravata: '#c9a24a', oculos: true, barba: true },
  { fundo: '#1d4d4d', pele: PELES[1], cabelo: '#24160f', estilo: 'cacheado', terno: '#283a2e', gravata: '#b8862f' },
];

function escurecer(hex, f = 0.82) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

function desenhar(a, i) {
  const c = a.cabelo, p = a.pele, sombra = escurecer(p);
  let atras = '', frente = '';
  switch (a.estilo) {
    case 'lateral':
      frente = `<path d="M39 55 C37 29 83 27 81 52 C79 42 71 37 62 37 C57 42 47 44 41 46 Z" fill="${c}"/>`; break;
    case 'longo':
      atras = `<path d="M35 54 C33 24 87 24 85 54 L88 96 C78 100 42 100 32 96 Z" fill="${c}"/>`;
      frente = `<path d="M39 52 C38 30 82 30 81 52 C76 41 66 38 58 39 C50 41 44 45 39 52 Z" fill="${c}"/>`; break;
    case 'careca':
      frente = `<path d="M41 47 C44 36 52 32 60 32 C68 32 76 36 79 47 C74 41 67 39 60 39 C53 39 46 41 41 47 Z" fill="${sombra}" opacity=".35"/>`; break;
    case 'coque':
      atras = `<circle cx="60" cy="24" r="10" fill="${c}"/>`;
      frente = `<path d="M39 54 C37 29 83 29 81 54 C78 42 70 37 60 37 C50 37 42 42 39 54 Z" fill="${c}"/>`; break;
    case 'blackpower':
      atras = `<circle cx="60" cy="44" r="31" fill="${c}"/>`;
      frente = `<path d="M40 50 C42 36 52 33 60 33 C68 33 78 36 80 50 C74 43 67 41 60 41 C53 41 46 43 40 50 Z" fill="${c}"/>`; break;
    case 'rabo':
      atras = `<path d="M78 40 C96 46 96 72 86 84 C88 70 86 56 76 48 Z" fill="${c}"/>`;
      frente = `<path d="M39 54 C37 29 83 29 81 52 C76 40 66 36 56 38 C48 40 42 46 39 54 Z" fill="${c}"/>`; break;
    case 'curto':
      frente = `<path d="M39 52 C38 31 82 31 81 52 C79 43 72 38 60 38 C48 38 41 43 39 52 Z" fill="${c}"/>`; break;
    case 'cacheado':
      frente = [[44, 40], [52, 34], [60, 32], [68, 34], [76, 40], [41, 48], [79, 48]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${c}"/>`).join(''); break;
  }
  const barba = a.barba ? `<path d="M41 58 C43 84 77 84 79 58 C75 70 67 73 60 73 C53 73 45 70 41 58 Z" fill="${c}"/>` : '';
  const oculos = a.oculos ? `<g fill="none" stroke="#141414" stroke-width="2"><rect x="44" y="50" width="13" height="10" rx="3"/><rect x="63" y="50" width="13" height="10" rx="3"/><path d="M57 54 L63 54"/></g>` : '';
  const gola = `<path d="M47 86 L60 104 L73 86 Z" fill="#f4f1ea"/>`;
  const gravata = a.gravata
    ? `<path d="M57.5 89 L62.5 89 L64 106 L60 112 L56 106 Z" fill="${a.gravata}"/>`
    : (a.colar ? `<path d="M50 88 Q60 100 70 88" fill="none" stroke="#e2c46f" stroke-width="1.6"/>` : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<defs><clipPath id="r${i}"><circle cx="60" cy="60" r="60"/></clipPath></defs>
<g clip-path="url(#r${i})">
<rect width="120" height="120" fill="${a.fundo}"/>
<circle cx="60" cy="60" r="44" fill="#ffffff" opacity=".05"/>
${atras}
<path d="M10 124 C12 94 32 85 60 85 C88 85 108 94 110 124 Z" fill="${a.terno}"/>
${gola}${gravata}
<path d="M47 86 L54 96 L48 100 L42 89 Z M73 86 L66 96 L72 100 L78 89 Z" fill="${escurecer(a.terno.length === 7 ? a.terno : '#222222', 0.7)}"/>
<rect x="52" y="68" width="16" height="20" rx="5" fill="${sombra}"/>
<circle cx="40" cy="57" r="4.5" fill="${sombra}"/><circle cx="80" cy="57" r="4.5" fill="${sombra}"/>
<ellipse cx="60" cy="55" rx="20" ry="23" fill="${p}"/>
${barba}
<circle cx="52" cy="55" r="2.3" fill="#231a14"/><circle cx="68" cy="55" r="2.3" fill="#231a14"/>
<path d="M48 49 Q52 47 56 49 M64 49 Q68 47 72 49" stroke="${c === '#9a9a9a' ? '#6d6d6d' : c}" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M53 66 Q60 71 67 66" stroke="#6b3b2a" stroke-width="2" fill="none" stroke-linecap="round"/>
${oculos}${frente}
</g></svg>`;
}

export const AVATARES = LISTA.map((a, i) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(desenhar(a, i)));

// Converte o valor guardado no banco num endereço de imagem
export function fotoSrc(foto) {
  if (!foto) return AVATARES[0];
  const m = /^preset:(\d)$/.exec(foto);
  if (m) return AVATARES[Number(m[1])] || AVATARES[0];
  return foto;
}
