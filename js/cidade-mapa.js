// Neópolis: geração do mapa isométrico e desenho das peças fixas.
// Tudo é sorteado a partir do id da sala, então todos os jogadores da
// mesma partida veem exatamente a mesma cidade.

export const N = 40;            // tamanho do mapa em quadras de 1 bloco (tiles)
export const TW = 64, TH = 32;  // tamanho do bloco isométrico em pixels
export const TOPO = 320;        // espaço acima do mapa para os prédios altos
export const LARG = N * TW;
export const ALT = N * TH + TOPO + 40;
const OX = LARG / 2, OY = TOPO;

export const P = (x, y, z = 0) => [OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 - z];

// ---------------------------------------------------------------------
// Sorteio com semente
export function criarSorteio(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) { h = Math.imul(h ^ texto.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.entre = (min, max) => min + r() * (max - min);
  r.int = (min, max) => Math.floor(r.entre(min, max + 1));
  r.um = (lista) => lista[Math.floor(r() * lista.length)];
  r.embaralhar = (lista) => { const l = [...lista]; for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  return r;
}

// ---------------------------------------------------------------------
// Cores
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function misturar(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const tons = (c) => ({ topo: misturar(c, '#ffffff', 0.18), esq: c, dir: misturar(c, '#000000', 0.24) });

// ---------------------------------------------------------------------
// Primitivas de desenho (coordenadas do mundo)
function poli(ctx, pts, cor) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fillStyle = cor; ctx.fill();
}
function linha(ctx, a, b, cor, larg = 1) {
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = cor; ctx.lineWidth = larg; ctx.stroke();
}
function losango(ctx, x0, y0, w, d, cor, z = 0) {
  poli(ctx, [P(x0, y0, z), P(x0 + w, y0, z), P(x0 + w, y0 + d, z), P(x0, y0 + d, z)], cor);
}

// Caixa com janelas opcionais. J recebe as janelas (para acender à noite).
export function caixa(ctx, x0, y0, w, d, z0, h, cor, J, jan) {
  const x1 = x0 + w, y1 = y0 + d, t = tons(cor);
  poli(ctx, [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z0 + h), P(x0, y1, z0 + h)], t.esq);
  poli(ctx, [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z0 + h), P(x1, y0, z0 + h)], t.dir);
  poli(ctx, [P(x0, y0, z0 + h), P(x1, y0, z0 + h), P(x1, y1, z0 + h), P(x0, y1, z0 + h)], t.topo);
  if (jan) janelas(ctx, x0, y0, w, d, z0, h, J, jan);
}

function janelas(ctx, x0, y0, w, d, z0, h, J, jan) {
  const andar = jan.andar || 9, passo = jan.passo || 0.2, m = jan.margem ?? 0.12;
  const cor = jan.cor || '#2c3e50', alt = andar * (jan.altura || 0.55), largJ = passo * (jan.largura || 0.55);
  const x1 = x0 + w, y1 = y0 + d;
  for (let z = z0 + (jan.base ?? 6); z + alt < z0 + h - 4; z += andar) {
    for (let u = x0 + m; u + largJ <= x1 - m + 0.001; u += passo) {
      const q = [P(u, y1, z), P(u + largJ, y1, z), P(u + largJ, y1, z + alt), P(u, y1, z + alt)];
      poli(ctx, q, cor); J.push(q);
    }
    for (let v = y0 + m; v + largJ <= y1 - m + 0.001; v += passo) {
      const q = [P(x1, v, z), P(x1, v + largJ, z), P(x1, v + largJ, z + alt), P(x1, v, z + alt)];
      poli(ctx, q, misturar(cor, '#000000', 0.25)); J.push(q);
    }
  }
}

// Cilindro vertical (tanques, silos, chaminés redondas)
function cilindro(ctx, cx, cy, r, z0, h, cor, faixa) {
  const [sx, sy] = P(cx, cy, z0), rx = r * TW / 2 * Math.SQRT2, ry = r * TH / 2 * Math.SQRT2;
  const g = ctx.createLinearGradient(sx - rx, 0, sx + rx, 0);
  g.addColorStop(0, misturar(cor, '#ffffff', 0.12)); g.addColorStop(0.55, cor); g.addColorStop(1, misturar(cor, '#000000', 0.32));
  ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI); ctx.lineTo(sx - rx, sy - h); ctx.ellipse(sx, sy - h, rx, ry, 0, Math.PI, 0, true); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  if (faixa) {
    for (const f of faixa) {
      ctx.beginPath(); ctx.ellipse(sx, sy - f[0], rx, ry, 0, 0, Math.PI); ctx.lineTo(sx - rx, sy - f[1]); ctx.ellipse(sx, sy - f[1], rx, ry, 0, Math.PI, 0, true); ctx.closePath();
      ctx.fillStyle = f[2]; ctx.fill();
    }
  }
  ctx.beginPath(); ctx.ellipse(sx, sy - h, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = misturar(cor, '#ffffff', 0.25); ctx.fill();
  return [sx, sy - h];
}

function chamine(ctx, cx, cy, h, C, cor = '#b9b4ac', r = 0.12) {
  const topo = cilindro(ctx, cx, cy, r, 0, h, cor, [[h - 14, h - 8, '#c0392b'], [h - 26, h - 20, '#c0392b']]);
  C.push({ x: topo[0], y: topo[1], r: r * 30 });
  return topo;
}

function telhado(ctx, x0, y0, w, d, z, rh, cor) {
  const x1 = x0 + w, y1 = y0 + d, a = P(x0 + w / 2, y0 + d / 2, z + rh);
  poli(ctx, [P(x0, y0, z), P(x1, y0, z), a], misturar(cor, '#ffffff', 0.12));
  poli(ctx, [P(x0, y0, z), P(x0, y1, z), a], misturar(cor, '#ffffff', 0.05));
  poli(ctx, [P(x0, y1, z), P(x1, y1, z), a], cor);
  poli(ctx, [P(x1, y0, z), P(x1, y1, z), a], misturar(cor, '#000000', 0.22));
}

export function arvore(ctx, x, y, tam = 1, tipo = 'redonda') {
  const [sx, sy] = P(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(sx + 3, sy + 1, 9 * tam, 4.5 * tam, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(sx - 1.5 * tam, sy - 9 * tam, 3 * tam, 9 * tam);
  if (tipo === 'eucalipto') {
    ctx.fillStyle = '#3f7f3a'; ctx.beginPath(); ctx.ellipse(sx, sy - 22 * tam, 6 * tam, 15 * tam, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5fa04f'; ctx.beginPath(); ctx.ellipse(sx - 2 * tam, sy - 25 * tam, 3.5 * tam, 9 * tam, 0, 0, Math.PI * 2); ctx.fill();
  } else if (tipo === 'pinheiro') {
    for (let i = 0; i < 3; i++) poli(ctx, [[sx, sy - (30 - i * 7) * tam], [sx - (8 + i * 2) * tam, sy - (12 - i * 4) * tam], [sx + (8 + i * 2) * tam, sy - (12 - i * 4) * tam]], i % 2 ? '#2f6b3a' : '#3b7d45');
  } else {
    ctx.fillStyle = '#3e8a3a'; ctx.beginPath(); ctx.arc(sx, sy - 15 * tam, 9 * tam, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#58a84a'; ctx.beginPath(); ctx.arc(sx - 3 * tam, sy - 18 * tam, 5.5 * tam, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------------------------------------------------------------------
// Geração
const CORES_TORRE = ['#e9e4d8', '#cfd8e3', '#9db7d5', '#6f8fb3', '#d9a7a0', '#c8b89a', '#8fa7a0', '#f0e2b6', '#b9c4cc', '#7a8ca5', '#5d7a99', '#e3c9a8'];
const CORES_VIDRO = ['#24405e', '#1f3d4d', '#2e3b55', '#1c2f45', '#33475b'];
const CORES_CASA = ['#f2e6c9', '#e8c5a0', '#d9e3ea', '#f5d0c5', '#e0e6c8', '#f1f1f1', '#d6c2e0'];
const CORES_TELHA = ['#b5532f', '#8a3f2c', '#5d6d7e', '#a0522d', '#7b4b3a'];
const CORES_CARRO = ['#e74c3c', '#f1c40f', '#ecf0f1', '#3498db', '#2c3e50', '#16a085', '#8e44ad', '#d35400', '#95a5a6', '#c0392b'];
export { CORES_CARRO };

// Cada empresa tem um tipo de prédio coerente com o que ela faz
const TIPO_SEDE = {
  database: 'torre', qbit: 'torre', memorix: 'torre', pulsar: 'torre', invest: 'torre', seguraprev: 'torre',
  petrosul: 'refinaria', ferroaco: 'siderurgica', voltmotriz: 'fabrica', drinkcia: 'bebidas', alicerce: 'materiais',
  eucalyptus: 'papel', atlas: 'mina', agrotech: 'fazenda', eletroluz: 'usina', megastore: 'armazem',
  supermarket: 'hiper', jm: 'canteiro', doctormed: 'hospital', farmacom: 'laboratorio',
};

function zona(bx, by) {
  if (bx === 7 && by === 0) return 'mina';
  if (bx === 0 && by <= 1) return 'floresta';
  if ((bx <= 1 && by >= 6) || (bx === 0 && by === 5)) return 'fazenda';
  if (bx >= 6 && by <= 3) return 'industria';
  if ((bx >= 2 && bx <= 5 && (by === 2 || by === 3 || by === 5)) || (bx === 3 && by === 1) || (bx === 4 && by === 6)) return 'centro';
  return 'bairro';
}

export function gerarMapa(semente) {
  const r = criarSorteio('neopolis:' + semente);
  // --- grade do chão
  const grade = [];
  const PONTES = [10, 20, 30];
  for (let y = 0; y < N; y++) {
    grade.push([]);
    for (let x = 0; x < N; x++) {
      let t = 'grama';
      const agua = y >= 21 && y <= 23;
      if (agua) t = (x % 5 === 0 && PONTES.includes(x)) ? 'ponte' : 'agua';
      else if (x % 5 === 0 || y % 5 === 0) t = 'rua';
      else if (y === 24) t = 'orla';
      grade[y].push(t);
    }
  }

  // --- quarteirões (4×4) e o que vai em cada um
  const blocos = [];
  for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) if (by !== 4) blocos.push({ bx, by, x0: bx * 5 + 1, y0: by * 5 + 1, zona: zona(bx, by) });
  const pega = (filtro, n = 1) => {
    const livres = r.embaralhar(blocos.filter((b) => !b.tipo && filtro(b)));
    return livres.slice(0, n);
  };
  const marcar = (b, tipo, empresa) => { b.tipo = tipo; if (empresa) b.empresa = empresa; };

  marcar(blocos.find((b) => b.zona === 'mina'), 'mina', 'atlas');
  blocos.filter((b) => b.zona === 'floresta').forEach((b) => marcar(b, 'floresta'));
  marcar(pega((b) => ['1,0', '0,2', '1,1'].includes(`${b.bx},${b.by}`))[0], 'papel', 'eucalyptus');
  const fazendas = blocos.filter((b) => b.zona === 'fazenda');
  const sedeAgro = r.um(fazendas);
  fazendas.forEach((b) => marcar(b, 'fazenda', b === sedeAgro ? 'agrotech' : null));

  const industriais = ['petrosul', 'ferroaco', 'voltmotriz', 'drinkcia', 'alicerce'];
  pega((b) => b.zona === 'industria', industriais.length).forEach((b, i) => marcar(b, TIPO_SEDE[industriais[i]], industriais[i]));
  pega((b) => b.zona === 'industria', 9).forEach((b, i) => marcar(b, i % 2 ? 'armazem' : 'fabrica'));

  const torres = ['database', 'qbit', 'memorix', 'pulsar', 'invest', 'seguraprev'];
  pega((b) => b.zona === 'centro', torres.length).forEach((b, i) => marcar(b, 'torre', torres[i]));
  { const praca = pega((b) => b.zona === 'centro')[0]; if (praca) marcar(praca, 'praca'); }

  const borda = (b) => b.bx === 0 || b.bx === 7 || b.by === 0 || b.by === 7;
  marcar((pega((b) => b.zona === 'bairro' && borda(b))[0] || pega((b) => b.zona === 'bairro')[0]), 'usina', 'eletroluz');
  marcar(pega((b) => b.zona === 'bairro' && b.by >= 5)[0] || pega((b) => b.zona === 'bairro')[0], 'estadio');
  for (const id of ['doctormed', 'farmacom', 'supermarket', 'megastore', 'jm']) {
    const b = pega((x) => x.zona === 'bairro')[0] || pega((x) => x.zona === 'centro')[0];
    marcar(b, TIPO_SEDE[id], id);
  }
  pega((b) => b.zona === 'bairro', 2).forEach((b) => marcar(b, 'parque'));
  pega((b) => b.zona === 'bairro' || b.zona === 'centro', 2).forEach((b) => marcar(b, 'obra'));
  for (const b of blocos) {
    if (b.tipo) continue;
    if (b.zona === 'centro') marcar(b, 'torre');
    else {
      const dist = Math.hypot(b.bx - 3.5, b.by - 3.5);
      marcar(b, dist > 3.6 || r() < 0.45 ? 'casas' : 'predios');
    }
  }

  // chão dos quarteirões
  const CHAO = {
    torre: 'calcada', praca: 'calcada', predios: 'calcada', casas: 'grama', parque: 'parque', estadio: 'calcada',
    obra: 'terra', canteiro: 'terra', hospital: 'calcada', laboratorio: 'calcada', hiper: 'estacionamento',
    armazem: 'patio', fabrica: 'patio', refinaria: 'patio', siderurgica: 'patio', bebidas: 'patio', materiais: 'terra',
    papel: 'patio', mina: 'mina', fazenda: 'campo', floresta: 'mata', usina: 'grama',
  };
  for (const b of blocos) b.chao = CHAO[b.tipo];
  return { grade, blocos, r };
}

// ---------------------------------------------------------------------
// Chão (ruas, rio, calçadas, campos) — desenhado uma vez numa tela grande
export function desenharChao(ctx, mapa) {
  const { grade, blocos } = mapa;
  const r = criarSorteio('chao');
  // fundo da cidade
  losango(ctx, 0, 0, N, N, '#6fae55');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = grade[y][x];
    if (t === 'grama') losango(ctx, x, y, 1, 1, misturar('#74b85a', '#5f9e4a', r() * 0.6));
    else if (t === 'rua' || t === 'ponte') {
      if (t === 'ponte') losango(ctx, x, y, 1, 1, '#3d8fd6');
      losango(ctx, x, y, 1, 1, t === 'ponte' ? '#80868e' : '#5b6169');
    } else if (t === 'agua') losango(ctx, x, y, 1, 1, '#3d8fd6');
    else if (t === 'orla') losango(ctx, x, y, 1, 1, '#d8cfb8');
  }
  // margens do rio
  for (let x = 0; x < N; x++) {
    if (grade[21][x] === 'agua') linha(ctx, P(x, 21), P(x + 1, 21), '#9ccbe9', 3);
    if (grade[23][x] === 'agua') linha(ctx, P(x, 24), P(x + 1, 24), '#2c6fa8', 3);
  }
  // pontes: guarda-corpo e sombra na água
  for (let y = 21; y <= 23; y++) for (let x = 0; x < N; x++) if (grade[y][x] === 'ponte') {
    losango(ctx, x + 1, y, 0.12, 1, 'rgba(0,0,0,.25)');
    linha(ctx, P(x + 0.06, y, 3), P(x + 0.06, y + 1, 3), '#d0d4d9', 2);
    linha(ctx, P(x + 0.94, y, 3), P(x + 0.94, y + 1, 3), '#d0d4d9', 2);
  }
  // faixas e faixas de pedestre
  ctx.setLineDash([6, 8]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = grade[y][x];
    if (t !== 'rua' && t !== 'ponte') continue;
    const cruz = x % 5 === 0 && y % 5 === 0;
    if (cruz) continue;
    if (y % 5 === 0) linha(ctx, P(x, y + 0.5), P(x + 1, y + 0.5), 'rgba(255,255,255,.55)', 1.3);
    else linha(ctx, P(x + 0.5, y), P(x + 0.5, y + 1), 'rgba(255,255,255,.55)', 1.3);
  }
  ctx.setLineDash([]);
  for (let y = 0; y < N; y += 5) for (let x = 0; x < N; x += 5) {
    if (grade[y][x] !== 'rua') continue;
    for (let i = 0; i < 4; i++) {
      const f = 0.12 + i * 0.2;
      if (x + 1 < N && grade[y][x + 1] === 'rua') losango(ctx, x + 1.02, y + f, 0.14, 0.1, 'rgba(255,255,255,.7)');
      if (y + 1 < N && grade[y + 1][x] === 'rua') losango(ctx, x + f, y + 1.02, 0.1, 0.14, 'rgba(255,255,255,.7)');
    }
  }
  // chão de cada quarteirão
  for (const b of blocos) chaoBloco(ctx, b);
  // orla com calçadão
  for (let x = 0; x < N; x++) if (grade[24][x] === 'orla') losango(ctx, x, 24.62, 1, 0.38, '#bfb49a');
}

function chaoBloco(ctx, b) {
  const { x0, y0 } = b, r = criarSorteio(`chao${b.bx},${b.by}`);
  const calcada = '#cfd2d6';
  losango(ctx, x0 - 0.1, y0 - 0.1, 4.2, 4.2, calcada);
  switch (b.chao) {
    case 'calcada': losango(ctx, x0 + 0.08, y0 + 0.08, 3.84, 3.84, '#dcd8cf'); break;
    case 'grama': losango(ctx, x0 + 0.08, y0 + 0.08, 3.84, 3.84, '#7cc35a'); break;
    case 'patio': losango(ctx, x0 + 0.08, y0 + 0.08, 3.84, 3.84, '#a9aaa4'); break;
    case 'terra': losango(ctx, x0 + 0.08, y0 + 0.08, 3.84, 3.84, '#c39b6a'); break;
    case 'mata': losango(ctx, x0 - 0.1, y0 - 0.1, 4.2, 4.2, '#4f8f3f'); break;
    case 'parque':
      losango(ctx, x0 + 0.08, y0 + 0.08, 3.84, 3.84, '#86c95e');
      losango(ctx, x0 + 1.8, y0 + 0.08, 0.4, 3.84, '#e2d6b8');
      losango(ctx, x0 + 0.08, y0 + 1.8, 3.84, 0.4, '#e2d6b8');
      ctx.fillStyle = '#4aa3df'; { const [sx, sy] = P(x0 + 3, y0 + 3); ctx.beginPath(); ctx.ellipse(sx, sy, 34, 15, 0, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 'estacionamento':
      losango(ctx, x0 + 0.08, y0 + 0.08, 3.84, 3.84, '#6e737a');
      for (let i = 0; i < 9; i++) linha(ctx, P(x0 + 0.3 + i * 0.4, y0 + 2.2), P(x0 + 0.3 + i * 0.4, y0 + 2.9), 'rgba(255,255,255,.7)', 1);
      for (let i = 0; i < 9; i++) linha(ctx, P(x0 + 0.3 + i * 0.4, y0 + 3.1), P(x0 + 0.3 + i * 0.4, y0 + 3.85), 'rgba(255,255,255,.7)', 1);
      break;
    case 'mina': {
      const cores = ['#b07a4a', '#9a6a3f', '#865b35', '#714b2c', '#5d3d24'];
      cores.forEach((c, i) => losango(ctx, x0 - 0.1 + i * 0.35, y0 - 0.1 + i * 0.35, 4.2 - i * 0.7, 4.2 - i * 0.7, c));
      losango(ctx, x0 + 1.75, y0 + 1.75, 0.5, 0.5, '#3f6f8f');
      break;
    }
    case 'campo':
      for (let i = 0; i < 8; i++) losango(ctx, x0 - 0.1 + i * 0.525, y0 - 0.1, 0.525, 4.2, i % 2 ? '#a6cf55' : (r() < 0.5 ? '#d9c45a' : '#8fbf4a'));
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) linha(ctx, P(x0 + i * 0.525, y0 + j * 0.53), P(x0 + i * 0.525 + 0.5, y0 + j * 0.53), 'rgba(80,60,20,.12)', 1);
      break;
  }
}

// ---------------------------------------------------------------------
// Peças de cada quarteirão. Cada peça: { k (profundidade), d(ctx,J,C) }.
// Devolve também: âncora do marcador da empresa, extras animados.
export function pecasBloco(b) {
  const r = criarSorteio(`bloco${b.bx},${b.by}:${b.tipo}`);
  const { x0, y0 } = b;
  const pecas = [], extras = [];
  let ancora = null, altMax = 30;
  const add = (x, y, d) => pecas.push({ k: x + y, d });
  const corEmpresa = b.empresa ? CORES_SEDE[b.empresa] : null;

  const torre = (lx, ly, w, h, opts = {}) => {
    const cor = opts.cor || r.um(CORES_TORRE), vidro = opts.vidro || r.um(CORES_VIDRO);
    altMax = Math.max(altMax, h + 30);
    add(lx + w / 2, ly + w / 2, (ctx, J) => {
      const recuo = h > 150 && r() < 0.55;
      const h1 = recuo ? h * 0.62 : h;
      caixa(ctx, lx, ly, w, w, 0, 10, misturar(cor, '#000000', 0.12));
      caixa(ctx, lx, ly, w, w, 10, h1 - 10, cor, J, { cor: vidro, passo: 0.18, andar: 8 });
      let topo = h1;
      if (recuo) { const m = w * 0.18; caixa(ctx, lx + m, ly + m, w - 2 * m, w - 2 * m, h1, h - h1, cor, J, { cor: vidro, passo: 0.18, andar: 8, base: 3 }); topo = h; }
      const m2 = recuo ? w * 0.18 : 0;
      if (opts.faixa) caixa(ctx, lx + m2 - 0.02, ly + m2 - 0.02, w - 2 * m2 + 0.04, w - 2 * m2 + 0.04, topo - 12, 12, opts.faixa);
      if (opts.heliponto) {
        const [hx, hy] = P(lx + w / 2, ly + w / 2, topo + 1);
        ctx.fillStyle = '#3d4450'; ctx.beginPath(); ctx.ellipse(hx, hy, 18 * w / 1.5, 9 * w / 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('H', hx, hy + 3.5);
      } else {
        caixa(ctx, lx + m2 + 0.2, ly + m2 + 0.2, 0.35, 0.3, topo, 7, '#9aa3ad');
        if (r() < 0.6) caixa(ctx, lx + w - m2 - 0.55, ly + m2 + 0.25, 0.3, 0.3, topo, 10, '#7f8c8d');
      }
      if (h > 170) linha(ctx, P(lx + w / 2, ly + w / 2, topo), P(lx + w / 2, ly + w / 2, topo + 26), '#d0d4d9', 1.5);
    });
    return P(lx + w / 2, ly + w / 2, h + (h > 170 ? 30 : 8));
  };

  const casa = (cx, cy) => add(cx, cy, (ctx, J) => {
    const w = r.entre(0.5, 0.7), d = r.entre(0.5, 0.7), h = r.entre(12, 18);
    caixa(ctx, cx - w / 2, cy - d / 2, w, d, 0, h, r.um(CORES_CASA), J, { cor: '#3b4b5a', passo: 0.3, andar: 10, base: 4, margem: 0.1 });
    telhado(ctx, cx - w / 2 - 0.04, cy - d / 2 - 0.04, w + 0.08, d + 0.08, h, r.entre(9, 13), r.um(CORES_TELHA));
  });

  const arvores = (n, area, tipo) => {
    for (let i = 0; i < n; i++) {
      const x = r.entre(area[0], area[2]), y = r.entre(area[1], area[3]), t = r.entre(0.75, 1.15);
      add(x, y, (ctx) => arvore(ctx, x, y, t, tipo));
    }
  };

  switch (b.tipo) {
    case 'torre': {
      const sede = !!b.empresa;
      const lotes = r.embaralhar([[0, 0], [2, 0], [0, 2], [2, 2]]);
      if (sede) {
        ancora = torre(x0 + 0.35, y0 + 0.35, 1.9, r.entre(230, 285), { cor: corEmpresa.cor, vidro: corEmpresa.vidro, heliponto: r() < 0.5, faixa: corEmpresa.faixa });
        for (const [lx, ly] of lotes) if (lx + ly > 0) {
          if (r() < 0.2) arvores(3, [x0 + lx + 0.3, y0 + ly + 0.3, x0 + lx + 1.7, y0 + ly + 1.7]);
          else torre(x0 + lx + 0.3, y0 + ly + 0.3, 1.4, r.entre(60, 170));
        }
      } else if (r() < 0.35) {
        torre(x0 + 0.3, y0 + 0.3, 2.6, r.entre(140, 240), { heliponto: r() < 0.4 });
        torre(x0 + 3.0, y0 + 0.3, 0.8, r.entre(40, 90));
        torre(x0 + 0.3, y0 + 3.0, 0.8, r.entre(40, 90));
        torre(x0 + 3.0, y0 + 3.0, 0.8, r.entre(30, 60));
      } else {
        for (const [lx, ly] of lotes) {
          if (r() < 0.12) arvores(3, [x0 + lx + 0.3, y0 + ly + 0.3, x0 + lx + 1.7, y0 + ly + 1.7]);
          else torre(x0 + lx + 0.25, y0 + ly + 0.25, 1.5, r.entre(70, 230));
        }
      }
      break;
    }
    case 'predios':
      for (const [lx, ly] of [[0, 0], [2, 0], [0, 2], [2, 2]]) {
        if (r() < 0.15) { arvores(3, [x0 + lx + 0.3, y0 + ly + 0.3, x0 + lx + 1.7, y0 + ly + 1.7]); continue; }
        const w = r.entre(1.2, 1.6), h = r.entre(36, 95), cor = r.um(CORES_CASA.concat(CORES_TORRE));
        altMax = Math.max(altMax, h + 20);
        add(x0 + lx + 1, y0 + ly + 1, (ctx, J) => {
          caixa(ctx, x0 + lx + 0.25, y0 + ly + 0.25, w, w, 0, h, cor, J, { cor: '#34495e', passo: 0.22, andar: 9 });
          caixa(ctx, x0 + lx + 0.45, y0 + ly + 0.45, 0.3, 0.3, h, 8, '#7f8c8d');
        });
      }
      break;
    case 'casas':
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const cx = x0 + i + 0.5, cy = y0 + j + 0.5;
        if (r() < 0.72) casa(cx, cy); else add(cx, cy, (ctx) => arvore(ctx, cx, cy, r.entre(0.8, 1.1)));
      }
      altMax = 40;
      break;
    case 'praca':
      add(x0 + 2, y0 + 2, (ctx) => {
        cilindro(ctx, x0 + 2, y0 + 2, 0.55, 0, 4, '#b8b2a6');
        cilindro(ctx, x0 + 2, y0 + 2, 0.45, 4, 1, '#5dade2');
        cilindro(ctx, x0 + 2, y0 + 2, 0.08, 4, 14, '#d5d8dc');
      });
      arvores(10, [x0 + 0.2, y0 + 0.2, x0 + 3.8, y0 + 3.8]);
      altMax = 40;
      break;
    case 'parque':
      arvores(14, [x0 + 0.2, y0 + 0.2, x0 + 3.8, y0 + 1.7]);
      arvores(6, [x0 + 0.2, y0 + 2.3, x0 + 2.2, y0 + 3.8]);
      altMax = 40;
      break;
    case 'floresta':
      for (let i = 0; i < 26; i++) { const x = r.entre(x0, x0 + 4), y = r.entre(y0, y0 + 4); add(x, y, (ctx) => arvore(ctx, x, y, r.entre(0.9, 1.3), r() < 0.6 ? 'eucalipto' : 'pinheiro')); }
      altMax = 50;
      break;
    case 'estadio': {
      altMax = 70;
      const cx = x0 + 2, cy = y0 + 2;
      add(cx, cy, (ctx) => {
        const [sx, sy] = P(cx, cy), rx = 1.85 * TW / 2 * Math.SQRT2, ry = 1.85 * TH / 2 * Math.SQRT2, h = 22;
        ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI); ctx.lineTo(sx - rx, sy - h); ctx.ellipse(sx, sy - h, rx, ry, 0, Math.PI, 0, true); ctx.closePath();
        ctx.fillStyle = '#c9ccd1'; ctx.fill();
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(sx, sy - i * 5, rx, ry, 0, 0.1, Math.PI - 0.1); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(sx, sy - h, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = '#e74c3c'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(sx, sy - h, rx * 0.86, ry * 0.86, 0, 0, Math.PI * 2); ctx.fillStyle = '#c0392b'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(sx, sy - h + 8, rx * 0.66, ry * 0.66, 0, 0, Math.PI * 2); ctx.fillStyle = '#3fa34d'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(sx, sy - h + 8, rx * 0.46, ry * 0.46, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - h + 8 - ry * 0.46); ctx.lineTo(sx, sy - h + 8 + ry * 0.46); ctx.stroke();
      });
      for (const [dx, dy] of [[-0.1, -0.1], [4.1, -0.1], [-0.1, 4.1], [4.1, 4.1]]) {
        add(x0 + dx, y0 + dy, (ctx) => {
          linha(ctx, P(x0 + dx, y0 + dy), P(x0 + dx, y0 + dy, 62), '#7f8c8d', 2);
          caixa(ctx, x0 + dx - 0.15, y0 + dy - 0.05, 0.3, 0.1, 58, 8, '#ecf0f1');
        });
      }
      b.refletores = [[-0.1, -0.1], [4.1, -0.1], [-0.1, 4.1], [4.1, 4.1]].map(([dx, dy]) => P(x0 + dx, y0 + dy, 62));
      b.campo = P(cx, cy, 14);
      break;
    }
    case 'hospital':
      altMax = 110;
      add(x0 + 2, y0 + 1.6, (ctx, J) => {
        caixa(ctx, x0 + 0.4, y0 + 0.4, 3.2, 1.8, 0, 72, '#f4f6f7', J, { cor: '#5dade2', passo: 0.2, andar: 9 });
        const z = 72; losango(ctx, x0 + 1.75, y0 + 0.95, 0.5, 0.7, '#e74c3c', z + 0.5); losango(ctx, x0 + 1.55, y0 + 1.15, 0.9, 0.3, '#e74c3c', z + 0.5);
        const [hx, hy] = P(x0 + 3.0, y0 + 1.3, z + 1); ctx.fillStyle = '#3d4450'; ctx.beginPath(); ctx.ellipse(hx, hy, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('H', hx, hy + 3);
      });
      add(x0 + 1.4, y0 + 3.1, (ctx, J) => caixa(ctx, x0 + 0.4, y0 + 2.5, 2.0, 1.1, 0, 34, '#e8eef1', J, { cor: '#5dade2', passo: 0.22, andar: 9 }));
      add(x0 + 3.2, y0 + 3.3, (ctx) => { caixa(ctx, x0 + 2.95, y0 + 3.1, 0.5, 0.25, 0, 7, '#ffffff'); linha(ctx, P(x0 + 3.1, y0 + 3.35, 4), P(x0 + 3.3, y0 + 3.35, 4), '#e74c3c', 2); });
      ancora = P(x0 + 2, y0 + 1.3, 96);
      break;
    case 'laboratorio':
      altMax = 80;
      add(x0 + 2, y0 + 2, (ctx, J) => {
        caixa(ctx, x0 + 0.6, y0 + 0.6, 2.8, 2.8, 0, 26, '#f7f9f9', J, { cor: '#48c9b0', passo: 0.16, andar: 12 });
        caixa(ctx, x0 + 1.0, y0 + 1.0, 2.0, 2.0, 26, 24, '#d6eaf8', J, { cor: '#1a5276', passo: 0.16, andar: 8, base: 3 });
        cilindro(ctx, x0 + 1.5, y0 + 1.5, 0.25, 50, 6, '#aab7b8');
      });
      arvores(6, [x0 + 0.1, y0 + 3.5, x0 + 3.9, y0 + 3.9]);
      ancora = P(x0 + 2, y0 + 2, 70);
      break;
    case 'refinaria':
      altMax = 130;
      for (const [tx, ty, rr, hh] of [[x0 + 0.9, y0 + 0.9, 0.55, 26], [x0 + 2.2, y0 + 0.9, 0.55, 26], [x0 + 0.9, y0 + 2.4, 0.55, 26], [x0 + 3.2, y0 + 3.2, 0.45, 20]]) {
        add(tx, ty, (ctx) => cilindro(ctx, tx, ty, rr, 0, hh, '#ecf0f1', [[hh - 6, hh - 3, '#e67e22']]));
      }
      add(x0 + 3.0, y0 + 1.6, (ctx, J, C) => {
        cilindro(ctx, x0 + 3.0, y0 + 1.4, 0.18, 0, 95, '#bdc3c7', [[30, 34, '#7f8c8d'], [60, 64, '#7f8c8d']]);
        cilindro(ctx, x0 + 3.4, y0 + 1.9, 0.14, 0, 75, '#bdc3c7');
        chamine(ctx, x0 + 2.4, y0 + 2.4, 115, C, '#95a5a6', 0.09);
        b.chama = P(x0 + 2.4, y0 + 2.4, 117);
      });
      add(x0 + 1.6, y0 + 3.5, (ctx) => linha(ctx, P(x0 + 0.5, y0 + 3.4, 6), P(x0 + 3.5, y0 + 3.4, 6), '#7f8c8d', 3));
      ancora = P(x0 + 1.6, y0 + 1.6, 70);
      break;
    case 'siderurgica':
      altMax = 150;
      add(x0 + 1.8, y0 + 2.2, (ctx, J, C) => {
        caixa(ctx, x0 + 0.3, y0 + 1.2, 3.4, 2.4, 0, 46, '#8e5a3c', J, { cor: '#3b2a20', passo: 0.4, andar: 14, base: 20 });
        caixa(ctx, x0 + 0.3, y0 + 1.2, 3.4, 2.4, 46, 6, '#6e4430');
      });
      add(x0 + 1.5, y0 + 0.7, (ctx, J, C) => {
        chamine(ctx, x0 + 0.8, y0 + 0.6, 125, C);
        chamine(ctx, x0 + 1.6, y0 + 0.6, 135, C);
        chamine(ctx, x0 + 2.4, y0 + 0.6, 118, C);
        cilindro(ctx, x0 + 3.3, y0 + 0.7, 0.35, 0, 60, '#5d4037');
      });
      ancora = P(x0 + 2, y0 + 2.4, 80);
      break;
    case 'fabrica':
    case 'bebidas': {
      altMax = 130;
      const cor = b.tipo === 'bebidas' ? '#e9d8a6' : r.um(['#c7b299', '#b0bec5', '#d5c4a1', '#a9b7c6']);
      add(x0 + 1.8, y0 + 2, (ctx, J, C) => {
        caixa(ctx, x0 + 0.3, y0 + 0.8, 3.0, 2.6, 0, 30, cor, J, { cor: '#4a5a6a', passo: 0.35, andar: 12, base: 10 });
        for (let i = 0; i < 5; i++) {
          const xx = x0 + 0.3 + i * 0.6;
          poli(ctx, [P(xx, y0 + 3.4, 30), P(xx + 0.6, y0 + 3.4, 30), P(xx + 0.6, y0 + 3.4, 40), P(xx + 0.6, y0 + 0.8, 40), P(xx + 0.6, y0 + 0.8, 30)], misturar(cor, '#000', 0.08));
          poli(ctx, [P(xx, y0 + 0.8, 30), P(xx, y0 + 3.4, 30), P(xx + 0.6, y0 + 3.4, 40), P(xx + 0.6, y0 + 0.8, 40)], misturar(cor, '#ffffff', 0.2));
        }
        chamine(ctx, x0 + 3.5, y0 + 0.6, 100, C);
        if (b.tipo !== 'bebidas' || r() < 0.5) chamine(ctx, x0 + 3.5, y0 + 1.3, 80, C);
      });
      if (b.tipo === 'bebidas') for (const [tx, ty] of [[x0 + 3.4, y0 + 2.4], [x0 + 3.4, y0 + 3.2]]) add(tx, ty, (ctx) => cilindro(ctx, tx, ty, 0.3, 0, 42, '#dfe6e9', [[34, 38, '#f39c12']]));
      ancora = P(x0 + 1.8, y0 + 2, 70);
      break;
    }
    case 'materiais':
      altMax = 110;
      add(x0 + 1.4, y0 + 1.2, (ctx, J, C) => { caixa(ctx, x0 + 0.3, y0 + 0.3, 2.4, 1.6, 0, 26, '#c97c5d'); chamine(ctx, x0 + 3.2, y0 + 0.6, 85, C, '#a1887f'); });
      for (let i = 0; i < 6; i++) {
        const px = x0 + 0.4 + (i % 3) * 1.1, py = y0 + 2.3 + Math.floor(i / 3) * 0.8;
        add(px, py, (ctx) => { for (let k = 0; k < 3; k++) caixa(ctx, px, py, 0.7, 0.45, k * 5, 5, k % 2 ? '#b5532f' : '#c0623a'); });
      }
      add(x0 + 3.3, y0 + 3.3, (ctx) => poli(ctx, [P(x0 + 2.9, y0 + 3.6), P(x0 + 3.7, y0 + 3.6), P(x0 + 3.3, y0 + 3.2, 18)], '#e0c38c'));
      ancora = P(x0 + 1.4, y0 + 1.2, 55);
      break;
    case 'papel':
      altMax = 130;
      add(x0 + 1.6, y0 + 1.5, (ctx, J, C) => {
        caixa(ctx, x0 + 0.3, y0 + 0.4, 2.6, 2.0, 0, 34, '#dfe6e9', J, { cor: '#2e7d32', passo: 0.32, andar: 12, base: 10 });
        chamine(ctx, x0 + 3.3, y0 + 0.6, 110, C);
        cilindro(ctx, x0 + 3.3, y0 + 1.6, 0.35, 0, 48, '#95a5a6');
      });
      for (let i = 0; i < 4; i++) { const px = x0 + 0.4 + i * 0.85; add(px, y0 + 3.2, (ctx) => { for (let k = 0; k < 2; k++) caixa(ctx, px, y0 + 2.9, 0.7, 0.55, k * 5, 5, k ? '#a0522d' : '#8b5a2b'); }); }
      ancora = P(x0 + 1.6, y0 + 1.4, 64);
      break;
    case 'mina':
      altMax = 60;
      add(x0 + 3.3, y0 + 0.6, (ctx) => caixa(ctx, x0 + 3.0, y0 + 0.3, 0.7, 0.5, 0, 14, '#f1c40f'));
      for (const [px, py, h] of [[x0 + 0.6, y0 + 3.3, 20], [x0 + 1.3, y0 + 3.5, 14], [x0 + 3.4, y0 + 2.6, 18]]) add(px, py, (ctx) => poli(ctx, [P(px - 0.4, py + 0.3), P(px + 0.4, py + 0.3), P(px, py - 0.1, h)], '#5d4037'));
      add(x0 + 2.6, y0 + 2.6, (ctx) => { caixa(ctx, x0 + 2.4, y0 + 2.4, 0.6, 0.35, 2, 6, '#f39c12'); caixa(ctx, x0 + 2.4, y0 + 2.4, 0.25, 0.35, 8, 5, '#e67e22'); });
      ancora = P(x0 + 2, y0 + 2, 40);
      break;
    case 'fazenda':
      altMax = 80;
      if (b.empresa) {
        add(x0 + 1.2, y0 + 1.2, (ctx, J) => { caixa(ctx, x0 + 0.6, y0 + 0.6, 1.2, 0.9, 0, 22, '#b03a2e', J, { cor: '#f5f5f5', passo: 0.4, andar: 12, base: 6 }); telhado(ctx, x0 + 0.55, y0 + 0.55, 1.3, 1.0, 22, 14, '#5d4037'); });
        for (const [tx, ty] of [[x0 + 2.4, y0 + 0.8], [x0 + 3.0, y0 + 0.8], [x0 + 3.0, y0 + 1.5]]) add(tx, ty, (ctx) => cilindro(ctx, tx, ty, 0.28, 0, 46, '#d5d8dc', [[40, 43, '#2e7d32']]));
        ancora = P(x0 + 1.8, y0 + 1.2, 70);
      } else if (r() < 0.6) {
        const tx = x0 + r.entre(0.8, 3.2), ty = y0 + r.entre(0.8, 3.2);
        add(tx, ty, (ctx) => { caixa(ctx, tx - 0.35, ty - 0.3, 0.7, 0.6, 0, 14, '#f2e6c9'); telhado(ctx, tx - 0.4, ty - 0.35, 0.8, 0.7, 14, 10, '#8a3f2c'); });
      }
      arvores(r.int(1, 4), [x0 + 0.1, y0 + 3.4, x0 + 3.9, y0 + 3.9]);
      break;
    case 'usina':
      altMax = 130;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const px = x0 + 0.3 + i * 0.75, py = y0 + 2.0 + j * 0.65;
        add(px, py, (ctx) => {
          poli(ctx, [P(px, py, 3), P(px + 0.6, py, 3), P(px + 0.6, py + 0.4, 9), P(px, py + 0.4, 9)], '#1f3a93');
          linha(ctx, P(px + 0.3, py, 3), P(px + 0.3, py + 0.4, 9), 'rgba(255,255,255,.35)', 1);
        });
      }
      add(x0 + 3.2, y0 + 3.2, (ctx) => { caixa(ctx, x0 + 2.8, y0 + 2.9, 0.8, 0.7, 0, 16, '#d0d3d4'); });
      b.turbinas = [];
      for (const [tx, ty] of [[x0 + 0.7, y0 + 0.7], [x0 + 2.0, y0 + 0.5], [x0 + 3.3, y0 + 0.9], [x0 + 3.2, y0 + 2.1]]) {
        b.turbinas.push({ cubo: P(tx, ty, 92), fase: r() * 6 });
        add(tx, ty, (ctx) => {
          const [bx1, by1] = P(tx, ty), [bx2, by2] = P(tx, ty, 92);
          ctx.beginPath(); ctx.moveTo(bx1 - 2.5, by1); ctx.lineTo(bx2 - 1, by2); ctx.lineTo(bx2 + 1, by2); ctx.lineTo(bx1 + 2.5, by1); ctx.closePath();
          ctx.fillStyle = '#ecf0f1'; ctx.fill();
          ctx.fillStyle = '#d0d3d4'; ctx.fillRect(bx2 - 4, by2 - 2.5, 8, 5);
        });
      }
      ancora = P(x0 + 3.2, y0 + 3.2, 40);
      break;
    case 'armazem':
      altMax = 70;
      add(x0 + 2, y0 + 1.5, (ctx, J) => {
        const cor = b.empresa ? '#e8ecef' : r.um(['#dfe6e9', '#c8d6e5', '#d1ccc0']);
        caixa(ctx, x0 + 0.3, y0 + 0.4, 3.4, 2.2, 0, 28, cor);
        for (let i = 0; i < 6; i++) poli(ctx, [P(x0 + 0.5 + i * 0.52, y0 + 2.6, 0), P(x0 + 0.85 + i * 0.52, y0 + 2.6, 0), P(x0 + 0.85 + i * 0.52, y0 + 2.6, 13), P(x0 + 0.5 + i * 0.52, y0 + 2.6, 13)], '#7f8c8d');
        if (b.empresa) caixa(ctx, x0 + 0.3, y0 + 0.4, 3.4, 2.2, 28, 3, '#7dff3a');
      });
      for (let i = 0; i < 3; i++) { const px = x0 + 0.6 + i * 1.1; add(px, y0 + 3.3, (ctx) => { caixa(ctx, px, y0 + 2.9, 0.35, 0.8, 0, 13, '#f5f6fa'); caixa(ctx, px, y0 + 3.7, 0.35, 0.22, 0, 10, '#c0392b'); }); }
      ancora = P(x0 + 2, y0 + 1.5, 50);
      break;
    case 'hiper':
      altMax = 70;
      add(x0 + 2, y0 + 1.1, (ctx, J) => {
        caixa(ctx, x0 + 0.3, y0 + 0.3, 3.4, 1.6, 0, 24, '#fdfefe');
        caixa(ctx, x0 + 0.3, y0 + 1.9, 3.4, 0.08, 14, 10, '#c8102e');
        for (let i = 0; i < 4; i++) poli(ctx, [P(x0 + 0.6 + i * 0.8, y0 + 1.9, 0), P(x0 + 1.1 + i * 0.8, y0 + 1.9, 0), P(x0 + 1.1 + i * 0.8, y0 + 1.9, 11), P(x0 + 0.6 + i * 0.8, y0 + 1.9, 11)], '#5dade2');
      });
      for (let i = 0; i < 12; i++) {
        if (r() < 0.35) continue;
        const px = x0 + 0.35 + (i % 9) * 0.4, py = y0 + (i < 9 ? 2.35 : 3.25);
        const cor = r.um(CORES_CARRO);
        add(px, py, (ctx) => { caixa(ctx, px, py, 0.22, 0.42, 0, 5, cor); caixa(ctx, px + 0.02, py + 0.1, 0.18, 0.2, 5, 3, '#2c3e50'); });
      }
      ancora = P(x0 + 2, y0 + 1.1, 46);
      break;
    case 'obra':
    case 'canteiro': {
      altMax = 170;
      const andares = r.int(5, 11), alt = andares * 11;
      add(x0 + 1.6, y0 + 1.6, (ctx) => {
        for (let k = 0; k <= andares; k++) caixa(ctx, x0 + 0.5, y0 + 0.5, 2.2, 2.2, k * 11, 2, '#bdc3c7');
        for (const [cx, cy] of [[0.55, 2.55], [2.55, 2.55], [2.55, 0.55], [1.6, 2.55], [2.55, 1.6]]) linha(ctx, P(x0 + cx, y0 + cy), P(x0 + cx, y0 + cy, alt), '#95a5a6', 2);
        caixa(ctx, x0 + 0.5, y0 + 0.5, 2.2, 2.2, 0, alt * 0.45, '#d5d8dc', [], { cor: '#5d6d7e', passo: 0.3, andar: 11 });
        for (let k = 1; k <= andares; k += 2) linha(ctx, P(x0 + 2.75, y0 + 0.5, k * 11), P(x0 + 2.75, y0 + 2.7, k * 11), '#f39c12', 1);
      });
      add(x0 + 3.4, y0 + 3.4, (ctx) => { caixa(ctx, x0 + 3.0, y0 + 3.1, 0.8, 0.45, 0, 10, b.empresa ? '#e2b04a' : '#f39c12'); });
      add(x0 + 0.9, y0 + 3.4, (ctx) => poli(ctx, [P(x0 + 0.4, y0 + 3.7), P(x0 + 1.4, y0 + 3.7), P(x0 + 0.9, y0 + 3.2, 14)], '#e0c38c'));
      b.guindaste = { base: [x0 + 3.2, y0 + 0.6], alt: alt + 40, fase: r() * 6 };
      add(x0 + 3.2, y0 + 0.6, (ctx) => {
        const a = P(x0 + 3.2, y0 + 0.6), t = P(x0 + 3.2, y0 + 0.6, alt + 40);
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(t[0], t[1]); ctx.stroke();
        ctx.strokeStyle = '#d4ac0d'; ctx.lineWidth = 1;
        for (let z = 0; z < alt + 40; z += 8) { ctx.beginPath(); ctx.moveTo(a[0] - 2, a[1] - z); ctx.lineTo(a[0] + 2, a[1] - z - 8); ctx.stroke(); }
      });
      ancora = b.empresa ? P(x0 + 1.6, y0 + 1.6, alt + 20) : null;
      break;
    }
  }
  pecas.sort((a, c) => a.k - c.k);
  return { pecas, ancora, altMax, extras };
}

// Cor própria das sedes (combina com o logo)
const CORES_SEDE = {
  database: { cor: '#2f3b4c', vidro: '#4fa3ff', faixa: '#ff5d5d' },
  qbit: { cor: '#1b2b4a', vidro: '#33c2ff', faixa: '#33c2ff' },
  memorix: { cor: '#3a2a1e', vidro: '#ffb066', faixa: '#ff8a1f' },
  pulsar: { cor: '#1f4d3c', vidro: '#7de8b0', faixa: '#3ddc84' },
  invest: { cor: '#202020', vidro: '#c9c9c9', faixa: '#d6a840' },
  seguraprev: { cor: '#e8eef4', vidro: '#0b4f8a', faixa: '#0b4f8a' },
};

// Orla do rio (árvores e bancos), uma peça por trecho entre ruas
export function pecasOrla(bx) {
  const r = criarSorteio('orla' + bx), pecas = [];
  const x0 = bx * 5 + 1;
  for (let i = 0; i < 4; i++) { const x = x0 + i + r.entre(0.2, 0.8); pecas.push({ k: x + 24.3, d: (ctx) => arvore(ctx, x, 24.3, r.entre(0.8, 1)) }); }
  return { pecas, altMax: 40 };
}

// Postes (para o brilho noturno): pontos ao longo das ruas
export function postes(grade) {
  const lista = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = grade[y][x];
    if ((t === 'rua' || t === 'ponte') && (x + y) % 2 === 0) lista.push(P(x + 0.5, y + 0.5));
  }
  return lista;
}
