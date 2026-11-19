// Neópolis: geração do mapa isométrico e desenho das peças fixas.
// Tudo é sorteado a partir do id da sala, então todos os jogadores da
// mesma partida veem exatamente a mesma cidade.

export const N = 50;            // tamanho do mapa em quadras de 1 bloco (tiles)
export const TW = 64, TH = 32;  // tamanho do bloco isométrico em pixels
export const TOPO = 320;        // espaço acima do mapa para os prédios altos
export const LARG = N * TW;
export const ALT = N * TH + TOPO + 140;
const OX = LARG / 2, OY = TOPO;

export const P = (x, y, z = 0) => [OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 - z];

// Rio, pontes, baía e a mega ponte (estilo Golden Gate)
export const RIO = { y0: 26, y1: 28 };
export const PONTES = [15, 25, 35];
export const BAIA = { x0: 41, y0: 21, y1: 34 };
export const GG = { x: 45, y0: 21, y1: 34, torres: [23.5, 31.5], alt: 215, deck: 18 };
const ORLA_Y = 29;
export const ehBaia = (x, y) => x >= BAIA.x0 && y >= BAIA.y0 && y <= BAIA.y1;
export const ehAgua = (x, y) => ehBaia(x, y) || (y >= RIO.y0 && y <= RIO.y1);
// altura do tabuleiro da mega ponte em (x, y); 0 fora dela
export function alturaPonte(x, y) {
  if (x < GG.x || x >= GG.x + 1 || y < GG.y0 || y > GG.y1 + 1) return 0;
  return GG.deck * Math.max(0, Math.min(1, (y - GG.y0) / 1.3, (GG.y1 + 1 - y) / 1.3));
}

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
  } else if (tipo === 'palmeira') {
    ctx.strokeStyle = '#8d6e4a'; ctx.lineWidth = 2.4 * tam; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 3 * tam, sy - 14 * tam, sx + 1 * tam, sy - 26 * tam); ctx.stroke();
    ctx.fillStyle = '#2f8f46';
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; ctx.beginPath(); ctx.ellipse(sx + 1 * tam + Math.cos(a) * 6 * tam, sy - 26 * tam + Math.sin(a) * 3 * tam + 2 * tam, 7 * tam, 2.2 * tam, a, 0, Math.PI * 2); ctx.fill(); }
    return;
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

// helipontos no chão do heliporto (relativos ao canto do quarteirão)
const HELIPONTOS_BASE = [[0.8, 3.0], [2.0, 3.15], [3.2, 3.0]];

// Cada empresa tem um tipo de prédio coerente com o que ela faz
const TIPO_SEDE = {
  database: 'torre', qbit: 'torre', memorix: 'torre', pulsar: 'torre', invest: 'torre', seguraprev: 'torre',
  petrosul: 'refinaria', ferroaco: 'siderurgica', voltmotriz: 'fabrica', drinkcia: 'bebidas', alicerce: 'materiais',
  eucalyptus: 'papel', atlas: 'mina', agrotech: 'fazenda', eletroluz: 'usina', megastore: 'armazem',
  supermarket: 'hiper', jm: 'canteiro', doctormed: 'hospital', farmacom: 'laboratorio',
};

// O centro antigo (8×8) fica no meio; em volta, um anel de bairros novos.
function zona(bx, by) {
  const anel = bx === 0 || bx === 9 || by === 0 || by === 9;
  if (!anel) return zonaCentro(bx - 1, by - 1);
  if ((bx <= 1 && by <= 1) || (bx === 0 && by === 2) || (bx === 2 && by === 0)) return 'floresta';
  if ((bx === 0 && by >= 6) || (by === 9 && bx <= 2)) return 'fazenda';
  if ((by === 0 && bx >= 7) || (bx === 9 && by <= 1)) return 'industria';
  return 'periferia';
}

function zonaCentro(bx, by) {
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
  for (let y = 0; y < N; y++) {
    grade.push([]);
    for (let x = 0; x < N; x++) {
      let t = 'grama';
      if (ehBaia(x, y)) t = x === GG.x ? 'ponteGG' : 'agua';
      else if (y >= RIO.y0 && y <= RIO.y1) t = PONTES.includes(x) ? 'ponte' : 'agua';
      else if (x % 5 === 0 || y % 5 === 0) t = 'rua';
      else if (y === ORLA_Y) t = 'orla';
      grade[y].push(t);
    }
  }

  // --- quarteirões (4×4) e o que vai em cada um (10×10, menos o rio e a baía)
  const blocos = [];
  for (let by = 0; by < 10; by++) for (let bx = 0; bx < 10; bx++) {
    if (by === 5 || (bx >= 8 && (by === 4 || by === 6))) continue;
    blocos.push({ bx, by, x0: bx * 5 + 1, y0: by * 5 + 1, zona: zona(bx, by) });
  }
  const pega = (filtro, n = 1) => {
    const livres = r.embaralhar(blocos.filter((b) => !b.tipo && filtro(b)));
    return livres.slice(0, n);
  };
  const marcar = (b, tipo, empresa) => { b.tipo = tipo; if (empresa) b.empresa = empresa; };

  marcar(blocos.find((b) => b.zona === 'mina'), 'mina', 'atlas');
  blocos.filter((b) => b.zona === 'floresta').forEach((b) => marcar(b, 'floresta'));
  marcar(pega((b) => ['2,1', '1,3', '2,2'].includes(`${b.bx},${b.by}`))[0], 'papel', 'eucalyptus');
  // atrações dos bairros novos (lugares fixos, para ficarem à vista)
  const em = (bx, by) => blocos.find((b) => b.bx === bx && b.by === by);
  marcar(em(5, 9), 'shopping'); marcar(em(4, 9), 'estacionamento');
  marcar(em(9, 7), 'diversao'); marcar(em(9, 3), 'heliporto');
  const fazendas = blocos.filter((b) => b.zona === 'fazenda');
  const sedeAgro = r.um(fazendas);
  fazendas.forEach((b) => marcar(b, 'fazenda', b === sedeAgro ? 'agrotech' : null));

  const industriais = ['petrosul', 'ferroaco', 'voltmotriz', 'drinkcia', 'alicerce'];
  pega((b) => b.zona === 'industria', industriais.length).forEach((b, i) => marcar(b, TIPO_SEDE[industriais[i]], industriais[i]));
  pega((b) => b.zona === 'industria', 9).forEach((b, i) => marcar(b, i % 2 ? 'armazem' : 'fabrica'));

  const torres = ['database', 'qbit', 'memorix', 'pulsar', 'invest', 'seguraprev'];
  pega((b) => b.zona === 'centro', torres.length).forEach((b, i) => marcar(b, 'torre', torres[i]));
  { const praca = pega((b) => b.zona === 'centro')[0]; if (praca) marcar(praca, 'praca'); }

  marcar((pega((b) => b.zona === 'periferia' && b.bx <= 2)[0] || pega((b) => b.zona === 'bairro')[0]), 'usina', 'eletroluz');
  marcar(pega((b) => b.zona === 'bairro' && b.by >= 6)[0] || pega((b) => b.zona === 'bairro')[0], 'estadio');
  for (const id of ['doctormed', 'farmacom', 'supermarket', 'megastore', 'jm']) {
    const b = pega((x) => x.zona === 'bairro')[0] || pega((x) => x.zona === 'centro')[0];
    marcar(b, TIPO_SEDE[id], id);
  }
  pega((b) => b.zona === 'bairro', 2).forEach((b) => marcar(b, 'parque'));
  pega((b) => b.zona === 'bairro' || b.zona === 'centro', 2).forEach((b) => marcar(b, 'obra'));
  pega((b) => b.zona === 'periferia', 2).forEach((b) => marcar(b, 'parque'));
  for (const b of blocos) {
    if (b.tipo) continue;
    if (b.zona === 'centro') marcar(b, 'torre');
    else if (b.zona === 'industria') marcar(b, r() < 0.5 ? 'armazem' : 'fabrica');
    else if (b.zona === 'periferia') marcar(b, r() < 0.55 ? 'predios' : 'casas');
    else {
      const dist = Math.hypot(b.bx - 4.5, b.by - 4.5);
      marcar(b, dist > 3.6 || r() < 0.45 ? 'casas' : 'predios');
    }
  }

  // chão dos quarteirões
  const CHAO = {
    torre: 'calcada', praca: 'calcada', predios: 'calcada', casas: 'grama', parque: 'parque', estadio: 'calcada',
    obra: 'terra', canteiro: 'terra', hospital: 'calcada', laboratorio: 'calcada', hiper: 'estacionamento',
    armazem: 'patio', fabrica: 'patio', refinaria: 'patio', siderurgica: 'patio', bebidas: 'patio', materiais: 'terra',
    papel: 'patio', mina: 'mina', fazenda: 'campo', floresta: 'mata', usina: 'grama',
    shopping: 'calcada', estacionamento: 'garagem', diversao: 'diversao', heliporto: 'heliporto',
  };
  for (const b of blocos) b.chao = CHAO[b.tipo];
  return { grade, blocos, r };
}

// ---------------------------------------------------------------------
// Chão (ruas, rio, calçadas, campos) — desenhado uma vez numa tela grande
export function desenharChao(ctx, mapa) {
  const { grade, blocos } = mapa;
  const r = criarSorteio('chao');
  desenharArredores(ctx);
  // fundo da cidade
  losango(ctx, 0, 0, N, N, '#6fae55');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = grade[y][x];
    if (t === 'grama') losango(ctx, x, y, 1, 1, misturar('#74b85a', '#5f9e4a', r() * 0.6));
    else if (t === 'rua' || t === 'ponte') {
      if (t === 'ponte') losango(ctx, x, y, 1, 1, '#3d8fd6');
      losango(ctx, x, y, 1, 1, t === 'ponte' ? '#80868e' : '#5b6169');
    } else if (t === 'agua' || t === 'ponteGG') losango(ctx, x, y, 1, 1, ehBaia(x, y) ? misturar('#3d8fd6', '#2f7cc4', r() * 0.5) : '#3d8fd6');
    else if (t === 'orla') losango(ctx, x, y, 1, 1, '#d8cfb8');
  }
  // margens do rio e da baía
  for (let x = 0; x < N; x++) {
    if (grade[RIO.y0][x] === 'agua' && !ehBaia(x, RIO.y0 - 1)) linha(ctx, P(x, RIO.y0), P(x + 1, RIO.y0), '#9ccbe9', 3);
    if (grade[RIO.y1][x] === 'agua' && !ehBaia(x, RIO.y1 + 1)) linha(ctx, P(x, RIO.y1 + 1), P(x + 1, RIO.y1 + 1), '#2c6fa8', 3);
  }
  for (let x = BAIA.x0; x < N; x++) {
    linha(ctx, P(x, BAIA.y0), P(x + 1, BAIA.y0), '#9ccbe9', 3);
    linha(ctx, P(x, BAIA.y1 + 1), P(x + 1, BAIA.y1 + 1), '#2c6fa8', 3);
  }
  for (const y of [BAIA.y0, BAIA.y0 + 1, BAIA.y0 + 2, BAIA.y0 + 3, BAIA.y0 + 4, BAIA.y1 - 4, BAIA.y1 - 3, BAIA.y1 - 2, BAIA.y1 - 1, BAIA.y1]) {
    linha(ctx, P(BAIA.x0, y), P(BAIA.x0, y + 1), '#9ccbe9', 3);
  }
  // pontes: guarda-corpo e sombra na água
  for (let y = RIO.y0; y <= RIO.y1; y++) for (let x = 0; x < N; x++) if (grade[y][x] === 'ponte') {
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
  for (let x = 0; x < N; x++) if (grade[ORLA_Y][x] === 'orla') losango(ctx, x, ORLA_Y + 0.62, 1, 0.38, '#bfb49a');
  // sombra da mega ponte na água
  for (let y = GG.y0; y <= GG.y1; y++) losango(ctx, GG.x + 0.15, y + 0.35, 1, 1, 'rgba(10,30,60,.22)');
}

// Fora do mapa: mar a leste (com praia), o rio seguindo para oeste, matas e campos no resto
const DENTRO_TELA = (x, y) => { const [sx, sy] = P(x + 0.5, y + 0.5); return sx > -80 && sx < LARG + 80 && sy > -40 && sy < ALT + 60; };
export function tipoFora(x, y) {
  if (x >= 0 && y >= 0 && x < N && y < N) return null;
  if (x >= N + 1) return 'mar';
  if (x === N) return y >= BAIA.y0 && y <= BAIA.y1 ? 'mar' : 'praia';
  if (x < 0 && y >= RIO.y0 && y <= RIO.y1) return 'rio';
  return 'campo';
}
function desenharArredores(ctx) {
  const r = criarSorteio('arredores');
  for (let y = -40; y < N + 40; y++) for (let x = -40; x < N + 40; x++) {
    const t = tipoFora(x, y);
    if (!t || !DENTRO_TELA(x, y)) continue;
    if (t === 'mar') losango(ctx, x, y, 1.02, 1.02, misturar('#2f7cc4', '#2667a8', Math.min(1, (x - N) / 14) * 0.8 + r() * 0.15));
    else if (t === 'praia') losango(ctx, x, y, 1.02, 1.02, misturar('#e8d9a8', '#d9c48e', r() * 0.5));
    else if (t === 'rio') losango(ctx, x, y, 1.02, 1.02, '#3d8fd6');
    else {
      // campos em faixas embaixo; mata e capim no resto
      const faixa = y >= N && ((Math.floor(x / 4) + Math.floor(y / 6)) % 3 === 0);
      losango(ctx, x, y, 1.02, 1.02, faixa ? (Math.floor(x / 4) % 2 ? '#c9c36a' : '#a7cf5a') : misturar('#6fae55', '#5b9a47', r() * 0.7));
    }
  }
  // espuma na praia
  for (let y = -40; y < N + 40; y++) if (tipoFora(N, y) === 'praia' && DENTRO_TELA(N, y)) linha(ctx, P(N + 1, y), P(N + 1, y + 1), 'rgba(255,255,255,.7)', 2);
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
    case 'garagem':
      losango(ctx, x0 + 0.08, y0 + 0.08, 3.84, 3.84, '#5f646b');
      for (const [a, c] of [[2.15, 2.85], [3.15, 3.85]]) for (let i = 0; i <= 9; i++) linha(ctx, P(x0 + 0.25 + i * 0.38, y0 + a), P(x0 + 0.25 + i * 0.38, y0 + c), 'rgba(255,255,255,.75)', 1);
      linha(ctx, P(x0 + 0.2, y0 + 3.0), P(x0 + 3.8, y0 + 3.0), 'rgba(241,196,15,.8)', 1.5);
      break;
    case 'diversao':
      losango(ctx, x0 + 0.08, y0 + 0.08, 3.84, 3.84, '#8bcf62');
      losango(ctx, x0 + 0.08, y0 + 1.75, 3.84, 0.5, '#e9d9b0');
      losango(ctx, x0 + 1.75, y0 + 0.08, 0.5, 3.84, '#e9d9b0');
      for (let i = 0; i < 18; i++) { const [sx, sy] = P(x0 + r.entre(0.3, 3.7), y0 + r.entre(0.3, 3.7)); ctx.fillStyle = r.um(['#f7dc6f', '#f1948a', '#ffffff', '#bb8fce']); ctx.fillRect(sx, sy, 2, 2); }
      break;
    case 'heliporto': {
      losango(ctx, x0 + 0.08, y0 + 0.08, 3.84, 3.84, '#9ea3a8');
      for (const [hx, hy] of HELIPONTOS_BASE) {
        const [sx, sy] = P(x0 + hx, y0 + hy);
        ctx.fillStyle = '#4a5058'; ctx.beginPath(); ctx.ellipse(sx, sy, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy, 20, 10, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.beginPath();
        ctx.moveTo(sx - 6, sy - 4); ctx.lineTo(sx - 6, sy + 4); ctx.moveTo(sx + 6, sy - 4); ctx.lineTo(sx + 6, sy + 4); ctx.moveTo(sx - 6, sy); ctx.lineTo(sx + 6, sy); ctx.stroke();
      }
      linha(ctx, P(x0 + 0.2, y0 + 2.35), P(x0 + 3.8, y0 + 2.35), 'rgba(255,255,255,.6)', 1.2);
      break;
    }
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
  b.helipontos = [];
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
        (b.helipontos ||= []).push([lx + w / 2, ly + w / 2, topo + 2]);
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
      altMax = 120;
      const cx = x0 + 2, cy = y0 + 2;
      arvores(3, [x0 + 0.05, y0 + 0.05, x0 + 0.5, y0 + 0.5]);
      add(cx, cy, (ctx, J, C, L) => {
        const [sx, sy] = P(cx, cy), rx = 1.93 * TW / 2 * Math.SQRT2, ry = rx / 2, h = 36;
        // sombra
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(sx + 7, sy + 4, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        // fachada com pilares, faixa azul e portões
        const corpo = () => { ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI); ctx.lineTo(sx - rx, sy - h); ctx.ellipse(sx, sy - h, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); };
        corpo();
        const gf = ctx.createLinearGradient(sx - rx, 0, sx + rx, 0);
        gf.addColorStop(0, '#f2f3f5'); gf.addColorStop(0.6, '#d9dce1'); gf.addColorStop(1, '#b4b9c0');
        ctx.fillStyle = gf; ctx.fill();
        ctx.save(); corpo(); ctx.clip();
        ctx.beginPath(); ctx.ellipse(sx, sy - h + 6, rx, ry, 0, 0, Math.PI); ctx.lineTo(sx - rx, sy - h + 15); ctx.ellipse(sx, sy - h + 15, rx, ry, 0, Math.PI, 0, true); ctx.closePath();
        ctx.fillStyle = '#1f5fa8'; ctx.fill();
        for (let k = 0; k <= 26; k++) {
          const a = (k / 26) * Math.PI, px = sx + Math.cos(a) * rx, py = sy + Math.sin(a) * ry;
          ctx.strokeStyle = 'rgba(40,50,60,.22)'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - h); ctx.stroke();
          if (k % 5 === 2) { ctx.fillStyle = '#2b3138'; ctx.fillRect(px - 3, py - 10, 6, 10); }
        }
        ctx.restore();
        // arquibancadas descendo até o campo (azul, com a torcida em vermelho)
        for (let k = 0; k < 7; k++) {
          const f = 0.9 - k * 0.04;
          ctx.beginPath(); ctx.ellipse(sx, sy - h + k * 3.2, rx * f, ry * f, 0, 0, Math.PI * 2);
          ctx.fillStyle = k === 2 ? '#c0392b' : (k % 2 ? '#3c8ce7' : '#2d6fc0'); ctx.fill();
        }
        // campo listrado com as linhas
        const zc = h - 24, X = (dx, dy) => P(cx + dx, cy + dy, zc);
        const quad = (a, b2, c, d, cor) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b2); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); ctx.fillStyle = cor; ctx.fill(); };
        quad(X(-1.08, -0.72), X(1.08, -0.72), X(1.08, 0.72), X(-1.08, 0.72), '#2f8f3a');
        for (let i = 0; i < 8; i++) { const a = -0.96 + i * 0.24; quad(X(a, -0.62), X(a + 0.24, -0.62), X(a + 0.24, 0.62), X(a, 0.62), i % 2 ? '#3fa34d' : '#37974a'); }
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1;
        const contorno = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(...X(x1, y1)); ctx.lineTo(...X(x2, y1)); ctx.lineTo(...X(x2, y2)); ctx.lineTo(...X(x1, y2)); ctx.closePath(); ctx.stroke(); };
        contorno(-0.96, -0.62, 0.96, 0.62); contorno(-0.96, -0.3, -0.72, 0.3); contorno(0.72, -0.3, 0.96, 0.3);
        ctx.beginPath(); ctx.moveTo(...X(0, -0.62)); ctx.lineTo(...X(0, 0.62)); ctx.stroke();
        { const [ex, ey] = X(0, 0); ctx.beginPath(); ctx.ellipse(ex, ey, 0.18 * TW / 2 * Math.SQRT2, 0.18 * TH / 2 * Math.SQRT2, 0, 0, Math.PI * 2); ctx.stroke(); }
        for (const gx of [-0.98, 0.98]) { const a = P(cx + gx, cy - 0.1, zc), b2 = P(cx + gx, cy + 0.1, zc); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0], a[1] - 4); ctx.lineTo(b2[0], b2[1] - 4); ctx.lineTo(b2[0], b2[1]); ctx.stroke(); }
        // cobertura (anel branco com treliças)
        ctx.beginPath(); ctx.ellipse(sx, sy - h - 3, rx * 1.01, ry * 1.01, 0, 0, Math.PI * 2); ctx.ellipse(sx, sy - h - 3, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(244,246,249,.95)'; ctx.fill('evenodd');
        ctx.strokeStyle = 'rgba(120,130,145,.55)'; ctx.lineWidth = 1;
        for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * rx * 0.8, sy - h - 3 + Math.sin(a) * ry * 0.8); ctx.lineTo(sx + Math.cos(a) * rx * 1.01, sy - h - 3 + Math.sin(a) * ry * 1.01); ctx.stroke(); }
        for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; L.push([sx + Math.cos(a) * rx * 0.82, sy - h - 3 + Math.sin(a) * ry * 0.82, '#fff6d8', 1.4]); }
        // telão no fundo
        const [tx, ty] = [sx, sy - ry * 0.92 - h - 10];
        ctx.fillStyle = '#20252b'; ctx.fillRect(tx - 17, ty - 12, 34, 14); ctx.fillStyle = '#7f8c8d'; ctx.fillRect(tx - 1.5, ty + 2, 3, 8);
        ctx.fillStyle = '#16a085'; ctx.fillRect(tx - 15, ty - 10, 30, 10);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('2 × 1', tx, ty - 2.5);
        L.push([tx, ty - 5, '#5dfcc4', 9]);
        // bandeiras
        for (const a of [3.5, 4.2, 4.9, 5.6]) {
          const fx = sx + Math.cos(a) * rx * 0.97, fy = sy - h - 3 + Math.sin(a) * ry * 0.97;
          ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 14); ctx.stroke();
          ctx.fillStyle = a < 4.5 ? '#f1c40f' : '#1f5fa8'; ctx.fillRect(fx, fy - 14, 7, 4.5);
        }
      });
      // refletores nos cantos de trás e dos lados (o da frente cobriria o campo)
      for (const [dx, dy] of [[-0.1, -0.1], [4.1, -0.1], [-0.1, 4.1]]) {
        add(x0 + dx, y0 + dy, (ctx) => {
          linha(ctx, P(x0 + dx, y0 + dy), P(x0 + dx, y0 + dy, 84), '#8e979f', 2.5);
          for (let z = 12; z < 80; z += 12) linha(ctx, P(x0 + dx - 0.04, y0 + dy, z), P(x0 + dx + 0.04, y0 + dy, z + 6), '#aab3ba', 1);
          caixa(ctx, x0 + dx - 0.2, y0 + dy - 0.06, 0.4, 0.12, 80, 11, '#ecf0f1');
          for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) losango(ctx, x0 + dx - 0.17 + i * 0.12, y0 + dy + 0.065, 0.09, 0.001, '#fff9c4', 82 + j * 4);
        });
      }
      b.refletores = [[-0.1, -0.1], [4.1, -0.1], [-0.1, 4.1]].map(([dx, dy]) => P(x0 + dx, y0 + dy, 86));
      b.campo = P(cx, cy, 14);
      break;
    }
    case 'hospital':
      altMax = 110;
      add(x0 + 2, y0 + 1.6, (ctx, J) => {
        caixa(ctx, x0 + 0.4, y0 + 0.4, 3.2, 1.8, 0, 72, '#f4f6f7', J, { cor: '#5dade2', passo: 0.2, andar: 9 });
        const z = 72; losango(ctx, x0 + 1.75, y0 + 0.95, 0.5, 0.7, '#e74c3c', z + 0.5); losango(ctx, x0 + 1.55, y0 + 1.15, 0.9, 0.3, '#e74c3c', z + 0.5);
        b.helipontos.push([x0 + 3.0, y0 + 1.3, z + 2]);
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
    case 'shopping': {
      altMax = 110;
      add(x0 + 2, y0 + 1.4, (ctx, J, C, L) => {
        const ax = x0 + 0.25, ay = y0 + 0.25, w = 3.5, d = 2.3, h = 34, fx = ax + w, fy = ay + d;
        caixa(ctx, ax, ay, w, d, 0, h, '#efe6d8');
        // vitrines (térreo) e faixa de vidro (andar de cima) nas duas fachadas da frente
        for (const [z1, z2] of [[3, 15], [20, 30]]) {
          for (let u = ax + 0.08; u < fx - 0.1; u += 0.32) {
            const q = [P(u, fy, z1), P(u + 0.27, fy, z1), P(u + 0.27, fy, z2), P(u, fy, z2)]; poli(ctx, q, '#5aa9d6'); J.push(q);
          }
          for (let v = ay + 0.08; v < fy - 0.1; v += 0.32) {
            const q = [P(fx, v, z1), P(fx, v + 0.27, z1), P(fx, v + 0.27, z2), P(fx, v, z2)]; poli(ctx, q, '#4a8fb8'); J.push(q);
          }
        }
        caixa(ctx, ax, fy, w, 0.16, 15, 2.5, '#c8102e');               // marquise
        caixa(ctx, fx, ay, 0.16, d, 15, 2.5, '#a50d25');
        caixa(ctx, ax + 0.4, ay + 0.3, 0.5, 0.4, h, 6, '#b8bec5');      // ar-condicionado
        caixa(ctx, ax + 2.7, ay + 0.3, 0.45, 0.4, h, 6, '#b8bec5');
        // cúpula de vidro
        cilindro(ctx, ax + w / 2, ay + d / 2, 0.62, h, 7, '#9fd3ef');
        { const [cx2, cy2] = P(ax + w / 2, ay + d / 2, h + 7), rx2 = 0.62 * TW / 2 * Math.SQRT2, ry2 = 0.62 * TH / 2 * Math.SQRT2;
          ctx.beginPath(); ctx.ellipse(cx2, cy2, rx2, ry2, 0, Math.PI, 0); ctx.ellipse(cx2, cy2, rx2, rx2 * 0.75, 0, 0, Math.PI, true); ctx.closePath();
          const g2 = ctx.createLinearGradient(cx2 - rx2, cy2 - rx2, cx2 + rx2, cy2); g2.addColorStop(0, '#d6f0ff'); g2.addColorStop(1, '#6fb6e0');
          ctx.fillStyle = g2; ctx.fill(); L.push([cx2, cy2 - 8, '#bfe6ff', 6]); }
        // letreiro na fachada
        caixa(ctx, ax + 0.9, fy, 1.7, 0.06, h - 1, 11, '#1b1b1f');
        ctx.save(); const [lx2, ly2] = P(ax + 1.75, fy + 0.07, h + 2.5); ctx.translate(lx2, ly2); ctx.transform(1, 0.5, 0, 1, 0, 0);
        ctx.fillStyle = '#f6d36b'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SHOPPING', 0, 0); ctx.restore();
        L.push([lx2, ly2 - 2, '#ffd166', 10]);
      });
      // estacionamento na frente e palmeiras
      for (let i = 0; i < 9; i++) {
        if (r() < 0.3) continue;
        const px = x0 + 0.35 + i * 0.4, py = y0 + 3.15, cor = r.um(CORES_CARRO);
        add(px, py + 0.2, (ctx) => { caixa(ctx, px, py, 0.22, 0.42, 0, 5, cor); caixa(ctx, px + 0.02, py + 0.1, 0.18, 0.2, 5, 3, '#2c3e50'); });
      }
      for (const [px, py] of [[x0 + 0.15, y0 + 2.85], [x0 + 1.4, y0 + 2.85], [x0 + 2.6, y0 + 2.85], [x0 + 3.85, y0 + 2.85], [x0 + 3.9, y0 + 1.0], [x0 + 3.9, y0 + 2.0]]) add(px, py, (ctx) => arvore(ctx, px, py, 0.9, 'palmeira'));
      ancora = null;
      break;
    }
    case 'estacionamento': {
      altMax = 80;
      // edifício-garagem (4 andares abertos) no fundo
      add(x0 + 2, y0 + 1.1, (ctx, J, C, L) => {
        const ax = x0 + 0.25, ay = y0 + 0.25, w = 3.5, d = 1.65;
        for (let n = 0; n < 4; n++) {
          const z = n * 13;
          caixa(ctx, ax, ay, w, d, z, 2.5, '#b4b9bf');
          if (n < 3) {
            caixa(ctx, ax + 0.08, ay + 0.08, w - 0.16, d - 0.16, z + 2.5, 10.5, '#3b4047');
            for (let i = 0; i < 8; i++) { if ((i + n) % 3 === 0) continue; const px = ax + 0.2 + i * 0.42; caixa(ctx, px, ay + d - 0.55, 0.22, 0.4, z + 2.5, 4.5, CORES_CARRO[(i * 3 + n) % CORES_CARRO.length]); }
            for (let i = 0; i <= 5; i++) caixa(ctx, ax + i * (w - 0.1) / 5, ay + d - 0.1, 0.1, 0.1, z + 2.5, 10.5, '#9aa0a6');
            for (let i = 0; i <= 2; i++) caixa(ctx, ax + w - 0.1, ay + i * (d - 0.1) / 2, 0.1, 0.1, z + 2.5, 10.5, '#9aa0a6');
            L.push([...P(ax + w / 2, ay + d - 0.2, z + 11), '#ffe9a8', 3]);
          }
        }
        for (let i = 0; i < 5; i++) { const px = ax + 0.3 + i * 0.7; if (i % 2) caixa(ctx, px, ay + 0.6, 0.22, 0.42, 41.5, 4.5, CORES_CARRO[(i * 5) % CORES_CARRO.length]); }
        caixa(ctx, ax + w - 0.35, ay + 0.1, 0.3, 0.3, 41.5, 9, '#2980b9');
        { const [px2, py2] = P(ax + w - 0.2, ay + 0.25, 47); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('P', px2, py2 + 3); }
      });
      // carros no pátio da frente
      for (const fila of [2.5, 3.5]) for (let i = 0; i < 9; i++) {
        if (r() < 0.25) continue;
        const px = x0 + 0.33 + i * 0.38, py = y0 + fila - 0.21, cor = r.um(CORES_CARRO);
        add(px + 0.1, py + 0.2, (ctx) => { caixa(ctx, px, py, 0.22, 0.42, 0, 5, cor); caixa(ctx, px + 0.02, py + 0.1, 0.18, 0.2, 5, 3, '#2c3e50'); });
      }
      // cabine e cancela na entrada, postes e placa "P"
      add(x0 + 3.9, y0 + 3.0, (ctx) => {
        caixa(ctx, x0 + 3.75, y0 + 2.88, 0.22, 0.22, 0, 12, '#f5f6fa');
        caixa(ctx, x0 + 3.75, y0 + 2.88, 0.22, 0.22, 12, 2, '#c0392b');
        for (let i = 0; i < 5; i++) linha(ctx, P(x0 + 3.86, y0 + 3.1 + i * 0.15, 6), P(x0 + 3.86, y0 + 3.25 + i * 0.15, 6), i % 2 ? '#ffffff' : '#e74c3c', 2);
      });
      for (const [px, py] of [[x0 + 0.1, y0 + 3.0], [x0 + 1.9, y0 + 3.0]]) add(px, py, (ctx, J, C, L) => { linha(ctx, P(px, py), P(px, py, 30), '#7f8c8d', 1.5); caixa(ctx, px - 0.06, py - 0.06, 0.12, 0.12, 30, 2, '#5d6d7e'); L.push([...P(px, py, 29), '#fff1c1', 4]); });
      break;
    }
    case 'diversao': {
      altMax = 175;
      const cxr = x0 + 1.9, cyr = y0 + 1.15;
      b.roda = { cx: cxr, cy: cyr, hub: 84, R: 1.5, fase: r() * 6 };
      add(cxr, cyr - 0.2, (ctx) => {
        caixa(ctx, cxr - 1.6, cyr - 0.5, 3.2, 1.0, 0, 3, '#b9b0a0');
        caixa(ctx, cxr - 0.35, cyr - 0.3, 0.7, 0.6, 3, 8, '#e74c3c');
        telhado(ctx, cxr - 0.4, cyr - 0.35, 0.8, 0.7, 11, 5, '#c0392b');
      });
      // carrossel
      add(x0 + 3.0, y0 + 3.0, (ctx, J, C, L) => {
        const cx2 = x0 + 3.0, cy2 = y0 + 3.0;
        cilindro(ctx, cx2, cy2, 0.55, 0, 3, '#d7ccc8');
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; linha(ctx, P(cx2 + Math.cos(a) * 0.45, cy2 + Math.sin(a) * 0.45, 3), P(cx2 + Math.cos(a) * 0.45, cy2 + Math.sin(a) * 0.45, 15), '#f1c40f', 1.4); }
        const [tx2, ty2] = P(cx2, cy2, 15), rx2 = 0.62 * TW / 2 * Math.SQRT2, ry2 = 0.62 * TH / 2 * Math.SQRT2;
        for (let k = 0; k < 10; k++) {
          const a1 = k / 10 * Math.PI * 2, a2 = (k + 1) / 10 * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(tx2, ty2 - 16); ctx.lineTo(tx2 + Math.cos(a1) * rx2, ty2 + Math.sin(a1) * ry2); ctx.lineTo(tx2 + Math.cos(a2) * rx2, ty2 + Math.sin(a2) * ry2); ctx.closePath();
          ctx.fillStyle = k % 2 ? '#e74c3c' : '#fdfefe'; ctx.fill();
        }
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; L.push([tx2 + Math.cos(a) * rx2, ty2 + Math.sin(a) * ry2, k % 2 ? '#ffd166' : '#ff7eb6', 2.5]); }
      });
      // barracas
      for (const [bx2, by2, cor] of [[x0 + 0.3, y0 + 2.6, '#3498db'], [x0 + 0.3, y0 + 3.3, '#e67e22'], [x0 + 1.1, y0 + 3.4, '#9b59b6']]) {
        add(bx2 + 0.3, by2 + 0.25, (ctx, J, C, L) => {
          caixa(ctx, bx2, by2, 0.55, 0.45, 0, 8, '#fdfefe');
          for (let i = 0; i < 4; i++) caixa(ctx, bx2 - 0.03 + i * 0.15, by2 - 0.03, 0.15, 0.51, 8, 3, i % 2 ? '#ffffff' : cor);
          L.push([...P(bx2 + 0.28, by2 + 0.46, 6), '#ffe08a', 4]);
        });
      }
      // portal de entrada
      add(x0 + 3.9, y0 + 1.95, (ctx, J, C, L) => {
        caixa(ctx, x0 + 3.8, y0 + 1.55, 0.14, 0.14, 0, 24, '#8e44ad'); caixa(ctx, x0 + 3.8, y0 + 2.31, 0.14, 0.14, 0, 24, '#8e44ad');
        caixa(ctx, x0 + 3.78, y0 + 1.5, 0.18, 1.0, 24, 6, '#f1c40f');
        for (let i = 0; i < 6; i++) L.push([...P(x0 + 3.95, y0 + 1.55 + i * 0.17, 27), i % 2 ? '#ff7eb6' : '#7fd8ff', 2.5]);
      });
      arvores(5, [x0 + 2.3, y0 + 2.4, x0 + 3.9, y0 + 2.6]);
      arvores(4, [x0 + 0.1, y0 + 2.3, x0 + 1.6, y0 + 2.5]);
      break;
    }
    case 'heliporto': {
      altMax = 90;
      add(x0 + 1.2, y0 + 0.8, (ctx, J, C, L) => {
        caixa(ctx, x0 + 0.3, y0 + 0.3, 1.8, 1.1, 0, 20, '#e8edf1', J, { cor: '#3d7ab8', passo: 0.22, andar: 10, base: 4 });
        caixa(ctx, x0 + 0.3, y0 + 0.3, 1.8, 1.1, 20, 2, '#2c6fa8');
      });
      add(x0 + 3.0, y0 + 0.9, (ctx) => {
        caixa(ctx, x0 + 2.4, y0 + 0.3, 1.35, 1.25, 0, 18, '#c5cdd4');
        telhado(ctx, x0 + 2.35, y0 + 0.25, 1.45, 1.35, 18, 8, '#7f8c8d');
        poli(ctx, [P(x0 + 2.55, y0 + 1.55, 0), P(x0 + 3.6, y0 + 1.55, 0), P(x0 + 3.6, y0 + 1.55, 14), P(x0 + 2.55, y0 + 1.55, 14)], '#4b5560');
      });
      add(x0 + 0.6, y0 + 1.95, (ctx, J, C, L) => {
        cilindro(ctx, x0 + 0.6, y0 + 1.95, 0.16, 0, 48, '#ecf0f1');
        cilindro(ctx, x0 + 0.6, y0 + 1.95, 0.3, 48, 9, '#5dade2');
        cilindro(ctx, x0 + 0.6, y0 + 1.95, 0.32, 57, 2, '#34495e');
        L.push([...P(x0 + 0.6, y0 + 1.95, 62), '#ff5252', 3]); L.push([...P(x0 + 0.6, y0 + 1.95, 52), '#bfe6ff', 6]);
      });
      add(x0 + 3.75, y0 + 2.25, (ctx) => { linha(ctx, P(x0 + 3.75, y0 + 2.25), P(x0 + 3.75, y0 + 2.25, 22), '#95a5a6', 1.2); poli(ctx, [P(x0 + 3.75, y0 + 2.25, 22), P(x0 + 3.75, y0 + 2.25, 17), P(x0 + 3.75, y0 + 2.75, 18.5)], '#ff7f27'); });
      for (const [hx, hy] of HELIPONTOS_BASE) {
        b.helipontos.push([x0 + hx, y0 + hy, 1]);
        add(x0 + hx, y0 + hy - 0.5, (ctx, J, C, L) => { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; L.push([...P(x0 + hx + Math.cos(a) * 0.48, y0 + hy + Math.sin(a) * 0.48), '#ffb347', 2]); } });
      }
      break;
    }
  }

  // árvores onde sobra espaço (fundo dos quarteirões mais vazios)
  if (['usina', 'armazem', 'fabrica', 'bebidas', 'materiais', 'papel', 'refinaria', 'siderurgica', 'hiper', 'hospital', 'laboratorio', 'heliporto', 'mina'].includes(b.tipo)) {
    for (let i = 0; i < 6; i++) { if (r() < 0.35) continue; const x = x0 + 0.1 + i * 0.68, y = y0 + 0.08; add(x, y, (ctx) => arvore(ctx, x, y, r.entre(0.6, 0.85))); }
    for (let i = 1; i < 6; i++) { if (r() < 0.35) continue; const x = x0 + 0.08, y = y0 + 0.1 + i * 0.68; add(x, y, (ctx) => arvore(ctx, x, y, r.entre(0.6, 0.85))); }
  }
  if (b.tipo === 'usina') arvores(6, [x0 + 2.4, y0 + 1.3, x0 + 3.8, y0 + 1.9]);

  // sinalização de trânsito nas esquinas
  const urbano = !['floresta', 'fazenda', 'mina'].includes(b.tipo);
  const cantos = [[x0 - 0.14, y0 - 0.14], [x0 + 4.14, y0 - 0.14], [x0 - 0.14, y0 + 4.14], [x0 + 4.14, y0 + 4.14]];
  b.semaforos = [];
  for (const [qx, qy] of cantos) {
    const v = r();
    if (urbano && v < 0.2 && ['torre', 'predios', 'shopping', 'hiper', 'estacionamento', 'hospital', 'praca'].includes(b.tipo)) {
      const fase = r() * 12;
      b.semaforos.push({ p: [qx, qy], fase });
      add(qx, qy, (ctx) => {
        linha(ctx, P(qx, qy), P(qx, qy, 24), '#3d4450', 1.6);
        const [sx, sy] = P(qx, qy, 25); ctx.fillStyle = '#1e2329'; ctx.fillRect(sx - 2.8, sy - 11, 5.6, 12);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#4a1c1c', '#4a3d14', '#163d22'][i]; ctx.beginPath(); ctx.arc(sx, sy - 8.5 + i * 3.6, 1.4, 0, Math.PI * 2); ctx.fill(); }
      });
    } else if (v < (urbano ? 0.55 : 0.25)) {
      const tipo = urbano ? r.um(['pare', 'pare', 'velocidade', 'pedestre', 'proibido', 'preferencia']) : r.um(['pare', 'velocidade']);
      add(qx, qy, (ctx) => placa(ctx, qx, qy, tipo));
    }
  }

  pecas.sort((a, c) => a.k - c.k);
  return { pecas, ancora, altMax, extras };
}

// Placas de trânsito
function placa(ctx, x, y, tipo) {
  linha(ctx, P(x, y), P(x, y, 15), '#8a939b', 1.3);
  const [sx, sy] = P(x, y, 18);
  ctx.lineWidth = 1;
  if (tipo === 'pare') {
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(sx + Math.cos(a) * 3.6, sy + Math.sin(a) * 3.6); }
    ctx.closePath(); ctx.fillStyle = '#d62828'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 2, sy - 0.5, 4, 1);
  } else if (tipo === 'velocidade') {
    ctx.beginPath(); ctx.arc(sx, sy, 3.6, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#d62828'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = 'bold 3.6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('60', sx, sy + 1.3);
  } else if (tipo === 'pedestre') {
    ctx.fillStyle = '#1f5fa8'; ctx.fillRect(sx - 3.4, sy - 3.4, 6.8, 6.8);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(sx, sy - 2.6); ctx.lineTo(sx + 2.6, sy + 2.2); ctx.lineTo(sx - 2.6, sy + 2.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(sx - 0.4, sy - 0.6, 0.8, 2.2);
  } else if (tipo === 'proibido') {
    ctx.beginPath(); ctx.arc(sx, sy, 3.6, 0, Math.PI * 2); ctx.fillStyle = '#1f5fa8'; ctx.fill(); ctx.strokeStyle = '#d62828'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 2.4, sy - 2.4); ctx.lineTo(sx + 2.4, sy + 2.4); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(sx, sy + 3.4); ctx.lineTo(sx + 3.8, sy - 3); ctx.lineTo(sx - 3.8, sy - 3); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#d62828'; ctx.lineWidth = 1.2; ctx.stroke();
  }
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

// Orla do rio (árvores, bancos e postes), uma peça por trecho entre ruas
export function pecasOrla(bx) {
  const r = criarSorteio('orla' + bx), pecas = [];
  const x0 = bx * 5 + 1, y = ORLA_Y + 0.3;
  for (let i = 0; i < 4; i++) {
    const x = x0 + i + r.entre(0.2, 0.8);
    pecas.push({ k: x + y, d: (ctx) => arvore(ctx, x, y, r.entre(0.8, 1), r() < 0.3 ? 'palmeira' : 'redonda') });
  }
  const xb = x0 + 1.5;
  pecas.push({ k: xb + y + 0.3, d: (ctx) => { caixa(ctx, xb, y + 0.3, 0.5, 0.12, 2, 1.5, '#8d6e4a'); caixa(ctx, xb, y + 0.36, 0.5, 0.06, 3.5, 3, '#8d6e4a'); } });
  return { pecas, altMax: 40 };
}

// ---------------------------------------------------------------------
// Mega ponte (estilo Golden Gate) sobre a baía: uma peça por trecho do tabuleiro,
// com as torres, os cabos principais, os pendurais e as luzes.
const LARANJA = '#c4402f', LARANJA_ESC = '#9e3123';
function zCabo(y) {
  const [ta, tb] = GG.torres, H = GG.alt, d = GG.deck;
  if (y >= ta && y <= tb) { const m = (ta + tb) / 2, s = (y - m) / ((tb - ta) / 2); return d + 10 + (H - 10 - d - 10) * s * s; }
  if (y < ta) { const s = (y - GG.y0) / (ta - GG.y0); return d + 6 + (H - 10 - d - 6) * s * s; }
  const s = (GG.y1 + 1 - y) / (GG.y1 + 1 - tb); return d + 6 + (H - 10 - d - 6) * s * s;
}
export function pecasGG() {
  const trechos = [];
  const xa = GG.x + 0.08, xb = GG.x + 0.92;
  for (let y = GG.y0; y <= GG.y1; y++) {
    const pecas = [];
    const torre = GG.torres.find((t) => t >= y && t < y + 1);
    pecas.push({ k: 0, d: (ctx, J, C, L) => {
      const z0 = alturaPonte(GG.x + 0.5, y), z1 = alturaPonte(GG.x + 0.5, y + 1);
      if (torre != null) {
        caixa(ctx, GG.x - 0.3, torre - 0.45, 1.6, 0.9, -4, 10, '#8f9499');                       // base na água
        caixa(ctx, GG.x - 0.12, torre - 0.2, 0.26, 0.4, 0, GG.alt, LARANJA);                      // perna de trás
      }
      // tabuleiro (treliça laranja embaixo, asfalto em cima)
      const lado = (u, za, zb, h, cor) => poli(ctx, [P(u, y, za - h), P(u, y + 1, zb - h), P(u, y + 1, zb), P(u, y, za)], cor);
      lado(GG.x + 1, z0, z1, 7, LARANJA_ESC);
      poli(ctx, [P(GG.x, y, z0), P(GG.x + 1, y, z0), P(GG.x + 1, y + 1, z1), P(GG.x, y + 1, z1)], '#5b6169');
      linha(ctx, P(GG.x + 0.5, y + 0.15, z0 + 0.3), P(GG.x + 0.5, y + 0.85, z1 + 0.3), 'rgba(255,255,255,.6)', 1.2);
      for (let k = 0; k < 4; k++) linha(ctx, P(GG.x + 1, y + k * 0.25, z0 - 7), P(GG.x + 1, y + k * 0.25 + 0.25, z0 - 1), '#7d2519', 1);
      if (torre != null) {
        for (const zz of [GG.deck + 30, 95, 150, GG.alt - 14]) caixa(ctx, GG.x + 0.1, torre - 0.12, 0.8, 0.24, zz, 9, LARANJA_ESC);   // vigas entre as pernas
      }
      // cabos e pendurais (de trás e da frente)
      for (const xc of [xa, xb]) {
        ctx.strokeStyle = LARANJA; ctx.lineWidth = 2.2; ctx.beginPath();
        for (let i = 0; i <= 8; i++) { const yy = y + i / 8, [px, py] = P(xc, yy, zCabo(yy)); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(196,64,47,.85)'; ctx.lineWidth = 0.8;
        for (let i = 0; i < 4; i++) { const yy = y + 0.125 + i * 0.25; const zt = zCabo(yy), zd = alturaPonte(GG.x + 0.5, yy); if (zt - zd < 6) continue; linha(ctx, P(xc, yy, zd + 2), P(xc, yy, zt), 'rgba(196,64,47,.85)', 0.8); }
        for (let i = 0; i < 2; i++) { const yy = y + 0.25 + i * 0.5; L.push([...P(xc, yy, zCabo(yy)), '#ffe9a8', 1.6]); }
        if (xc === xa) {
          // guarda-corpo
          linha(ctx, P(GG.x + 0.03, y, z0 + 3), P(GG.x + 0.03, y + 1, z1 + 3), LARANJA, 1.2);
        }
      }
      linha(ctx, P(GG.x + 0.97, y, z0 + 3), P(GG.x + 0.97, y + 1, z1 + 3), LARANJA, 1.2);
      if (torre != null) {
        caixa(ctx, GG.x + 0.86, torre - 0.2, 0.26, 0.4, 0, GG.alt, LARANJA);                      // perna da frente
        for (const xx of [GG.x + 0.01, GG.x + 0.99]) L.push([...P(xx, torre, GG.alt + 3), '#ff5252', 2.4]);
        b_luz(ctx, GG.x + 0.99, torre, GG.alt);
      }
    } });
    trechos.push({ x0: GG.x, y0: y, tam: 1, k: GG.x + y - 0.2, altMax: GG.alt + 20, pecas });
  }
  return trechos;
}
function b_luz(ctx, x, y, z) { const [px, py] = P(x, y, z + 3); ctx.fillStyle = '#7d2519'; ctx.fillRect(px - 1.5, py - 1.5, 3, 3); }

// ---------------------------------------------------------------------
// Matas, campos e chácaras em volta da cidade (preenche o que era vazio)
export function pecasFora() {
  const grupos = [];
  for (let gy = -40; gy < N + 40; gy += 5) for (let gx = -40; gx < N + 40; gx += 5) {
    const tipo = tipoFora(gx + 2, gy + 2);
    if (!tipo || tipo !== 'campo' || !DENTRO_TELA(gx + 2, gy + 2)) continue;
    if (gx + 5 > 0 && gy + 5 > 0 && gx < N && gy < N) continue;
    const r = criarSorteio(`fora${gx},${gy}`), pecas = [];
    const embaixo = gy >= N;
    const n = embaixo ? r.int(3, 7) : r.int(9, 16);
    for (let i = 0; i < n; i++) {
      const x = gx + r.entre(0.2, 4.8), y = gy + r.entre(0.2, 4.8);
      if (tipoFora(Math.floor(x), Math.floor(y)) !== 'campo' || (x > -0.6 && y > -0.6 && x < N + 0.6 && y < N + 0.6)) continue;
      const tipoA = gy < 0 || gx < 0 ? r.um(['pinheiro', 'redonda', 'eucalipto', 'redonda']) : 'redonda';
      const t = r.entre(0.8, 1.25);
      pecas.push({ k: x + y, d: (ctx) => arvore(ctx, x, y, t, tipoA) });
    }
    if (embaixo && r() < 0.35) {
      const cx = gx + 2.5, cy = gy + 2.5;
      pecas.push({ k: cx + cy, d: (ctx) => { caixa(ctx, cx - 0.35, cy - 0.3, 0.7, 0.6, 0, 13, '#f2e6c9'); telhado(ctx, cx - 0.4, cy - 0.35, 0.8, 0.7, 13, 9, '#a0522d'); } });
    }
    if (!pecas.length) continue;
    pecas.sort((a, c) => a.k - c.k);
    grupos.push({ x0: gx, y0: gy, tam: 5, k: gx + gy + 5, altMax: 50, pecas });
  }
  return grupos;
}

// Postes (para o brilho noturno): pontos ao longo das ruas
export function postes(grade) {
  const lista = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = grade[y][x];
    if ((t === 'rua' || t === 'ponte') && (x + y) % 2 === 0) lista.push(P(x + 0.5, y + 0.5));
    if (t === 'ponteGG' && y % 2 === 0) lista.push(P(x + 0.5, y + 0.5, alturaPonte(x + 0.5, y + 0.5)));
  }
  return lista;
}
