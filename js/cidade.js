// Neópolis viva: câmera (arrastar e aproximar), dia e noite, carros,
// caminhões, barcos, fumaça, turbinas, guindastes e os marcadores das
// empresas (logo, ou foto + nome + ações do dono).
import {
  N, TW, TH, TOPO, LARG, ALT, P, gerarMapa, desenharChao, pecasBloco, pecasOrla, postes,
  criarSorteio, caixa, CORES_CARRO, misturar, RIO, PONTES, GG, BAIA, alturaPonte, pecasGG, pecasFora,
} from './cidade-mapa.js';
import { marca } from './logos.js';
import { valorK } from './ui.js';

const CICLO = 240, TRANSICAO = 12;   // 2 min de dia + 2 min de noite
const suave = (t) => t * t * (3 - 2 * t);

export function fatorNoite(ms = Date.now()) {
  if (globalThis.__NEOPOLIS_NOITE != null) return globalThis.__NEOPOLIS_NOITE; // usado só nos testes
  const c = (ms / 1000) % CICLO;
  if (c < TRANSICAO) return 1 - suave(c / TRANSICAO);
  if (c < CICLO / 2) return 0;
  if (c < CICLO / 2 + TRANSICAO) return suave((c - CICLO / 2) / TRANSICAO);
  return 1;
}

export function criarCidade({ semente, aoClicarEmpresa }) {
  const movel = matchMedia('(pointer: coarse)').matches;
  const RES = movel ? 1 : 1.5;
  const RES_CHAO = movel ? 1 : 1.25;   // o chão é grande: um pouco menos de resolução no computador
  const raiz = document.createElement('div');
  raiz.className = 'cidade-raiz';
  const canvas = document.createElement('canvas');
  canvas.className = 'cidade-canvas';
  canvas.setAttribute('aria-label', 'Mapa da cidade de Neópolis');
  const aviso = document.createElement('div');
  aviso.className = 'cidade-carregando';
  aviso.textContent = 'Construindo Neópolis…';
  raiz.append(canvas, aviso);
  const ctx = canvas.getContext('2d');
  canvas.alvosMarcadores = () => alvos; // posições dos marcadores na tela (usado nos testes)
  canvas.camera = (x, y, z) => { cam.x = x; cam.y = y; cam.z = z; limitar(); };   // usado nos testes

  let pronta = false, ativo = true, raf = 0;
  let W = 0, H = 0, dpr = 1;
  const cam = { x: LARG / 2, y: TOPO + N * TH / 2 - 40, z: movel ? 0.6 : 0.85 };
  let mapa, chao, brilho, objetos = [], chamines = [], blocosAnim = [], sedes = {};
  let carros = [], barcos = [], fumaca = [], helis = [], helipontos = [];
  let estadoEmpresas = {}, fotos = {};
  const imgs = {};
  let alvos = [];

  // ---------------------------------------------------------------- montar
  function montar() {
    mapa = gerarMapa(semente);
    chao = document.createElement('canvas');
    chao.width = Math.ceil(LARG * RES_CHAO); chao.height = Math.ceil(ALT * RES_CHAO);
    const c = chao.getContext('2d'); c.scale(RES_CHAO, RES_CHAO); desenharChao(c, mapa);

    // brilho dos postes (meia resolução: é tudo difuso mesmo)
    brilho = document.createElement('canvas');
    brilho.width = Math.ceil(LARG / 2); brilho.height = Math.ceil(ALT / 2);
    const g = brilho.getContext('2d'); g.scale(0.5, 0.5);
    for (const [x, y] of postes(mapa.grade)) {
      const gr = g.createRadialGradient(x, y, 0, x, y, 34);
      gr.addColorStop(0, 'rgba(255,214,140,.55)'); gr.addColorStop(1, 'rgba(255,214,140,0)');
      g.fillStyle = gr; g.fillRect(x - 34, y - 34, 68, 68);
    }

    for (const b of mapa.blocos) {
      const pb = pecasBloco(b);
      const s = criarSprite(pb.pecas, b.x0, b.y0, 4, pb.altMax, `luz${b.bx},${b.by}`);
      objetos.push({ k: b.x0 + 2 + b.y0 + 2, s, b });
      chamines.push(...s.C);
      if (b.turbinas || b.guindaste || b.chama || b.refletores || b.roda || (b.semaforos && b.semaforos.length)) { b.anim = true; blocosAnim.push(b); }
      if (b.empresa && pb.ancora) sedes[b.empresa] = { ancora: pb.ancora, bloco: b };
      helipontos.push(...(b.helipontos || []));
    }
    for (let bx = 0; bx < 8; bx++) {
      const po = pecasOrla(bx);
      const s = criarSprite(po.pecas, bx * 5 + 1, 29, 1, po.altMax, 'orla' + bx);
      objetos.push({ k: bx * 5 + 3 + 29.5, s });
    }
    // mega ponte e arredores
    for (const t of pecasGG()) objetos.push({ k: t.k, s: criarSprite(t.pecas, t.x0, t.y0, t.tam, t.altMax, 'gg' + t.y0) });
    // arredores: o que fica atrás/ao lado da cidade nunca cobre nada dela, então
    // vai pintado direto no chão (bem mais leve); só o que está na frente vira figura
    for (const g of pecasFora().sort((a, b) => a.k - b.k)) {
      if (g.y0 < N) { for (const p of g.pecas) p.d(c, [], [], []); continue; }
      objetos.push({ k: g.k, s: criarSprite(g.pecas, g.x0, g.y0, g.tam, g.altMax, `fora${g.x0},${g.y0}`) });
    }
    objetos.sort((a, b) => a.k - b.k);
    criarVeiculos();
    pronta = true;
    aviso.remove();
  }

  function criarSprite(pecas, x0, y0, tam, altMax, sementeLuz) {
    const m = 0.4;
    const esq = P(x0 - m, y0 + tam + m)[0] - 6, dir = P(x0 + tam + m, y0 - m)[0] + 6;
    const topo = P(x0 - m, y0 - m)[1] - altMax - 30, baixo = P(x0 + tam + m, y0 + tam + m)[1] + 6;
    const w = dir - esq, h = baixo - topo;
    const dia = document.createElement('canvas');
    dia.width = Math.ceil(w * RES); dia.height = Math.ceil(h * RES);
    const g = dia.getContext('2d');
    g.scale(RES, RES); g.translate(-esq, -topo);
    const J = [], C = [], Lz = [];
    for (const p of pecas) p.d(g, J, C, Lz);

    const noite = document.createElement('canvas');
    noite.width = dia.width; noite.height = dia.height;
    const n = noite.getContext('2d');
    n.drawImage(dia, 0, 0);
    n.globalCompositeOperation = 'source-atop';
    n.fillStyle = 'rgba(9,14,40,.66)'; n.fillRect(0, 0, noite.width, noite.height);
    n.globalCompositeOperation = 'source-over';
    n.scale(RES, RES); n.translate(-esq, -topo);
    const r = criarSorteio(sementeLuz);
    const acesas = 0.35 + r() * 0.35;
    for (const q of J) {
      if (r() > acesas) continue;
      n.beginPath(); n.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) n.lineTo(q[i][0], q[i][1]); n.closePath();
      const v = r();
      n.fillStyle = v < 0.7 ? '#ffd27a' : v < 0.9 ? '#fff2c9' : '#a8d8ff';
      n.fill();
    }
    // luzes fixas (letreiros, cabos da ponte, roda-gigante…): sempre acesas à noite
    for (const [lx, ly, cor, raio] of Lz) {
      const rr = raio || 2;
      const gr = n.createRadialGradient(lx, ly, 0, lx, ly, rr * 3);
      gr.addColorStop(0, cor); gr.addColorStop(0.35, cor + 'aa'); gr.addColorStop(1, cor + '00');
      n.fillStyle = gr; n.fillRect(lx - rr * 3, ly - rr * 3, rr * 6, rr * 6);
    }
    return { dia, noite, x: esq, y: topo, w, h, C };
  }

  // ---------------------------------------------------------------- veículos
  const ehRua = (x, y) => x >= 0 && y >= 0 && x < N && y < N && ['rua', 'ponte', 'ponteGG'].includes(mapa.grade[y][x]);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function criarVeiculos() {
    const r = criarSorteio('veiculos' + semente);
    const ruas = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ehRua(x, y) && !(x % 5 === 0 && y % 5 === 0)) ruas.push([x, y]);
    const total = movel ? 60 : 110;
    for (let i = 0; i < total; i++) {
      const [x, y] = r.um(ruas);
      const horiz = y % 5 === 0;
      const sentido = r() < 0.5 ? 1 : -1;
      const caminhao = r() < 0.22;
      carros.push({
        tx: x, ty: y, dx: horiz ? sentido : 0, dy: horiz ? 0 : sentido, p: r(),
        vel: caminhao ? r.entre(0.7, 1.0) : r.entre(1.0, 1.7), caminhao,
        cor: caminhao ? r.um(['#ecf0f1', '#f39c12', '#2980b9', '#c0392b', '#7f8c8d']) : r.um(CORES_CARRO),
      });
    }
    const yr = RIO.y0 + 1;
    barcos = [
      { x: 3, y: yr - 0.6, v: 0.55, cor: '#ecf0f1' },
      { x: 26, y: yr + 0.6, v: -0.45, cor: '#f39c12' },
      { x: 14, y: yr - 0.6, v: 0.4, cor: '#c0392b' },
      // na baía e no mar (passam por baixo da mega ponte)
      { x: 42, y: BAIA.y0 + 2.5, v: 0.35, cor: '#ffffff', min: BAIA.x0 + 0.6, max: N + 12, vela: true },
      { x: 52, y: BAIA.y1 - 2.2, v: -0.28, cor: '#2980b9', min: BAIA.x0 + 0.6, max: N + 12 },
      { x: 47, y: RIO.y1 - 0.4, v: 0.22, cor: '#e74c3c', min: BAIA.x0 + 0.6, max: N + 10, vela: true },
    ];
    // helicópteros: voam entre os helipontos (heliporto, prédios e hospital)
    const rh = criarSorteio('helis' + semente);
    if (helipontos.length >= 2) {
      const cores = ['#e74c3c', '#f1c40f', '#2c3e50', '#16a085'];
      const n = Math.min(movel ? 3 : 4, helipontos.length);
      for (let i = 0; i < n; i++) {
        const p = helipontos[i % helipontos.length];
        helis.push({ x: p[0], y: p[1], z: p[2], pad: i % helipontos.length, estado: 'parado', espera: 2 + rh() * 8 + i * 3, rotor: 0, giro: 0, cor: cores[i % cores.length], ang: rh() * 6 });
      }
    }
  }

  function moverCarros(dt) {
    for (const c of carros) {
      c.p += c.vel * dt;
      while (c.p >= 1) {
        c.p -= 1; c.tx += c.dx; c.ty += c.dy;
        const opcoes = DIRS.filter(([dx, dy]) => ehRua(c.tx + dx, c.ty + dy) && !(dx === -c.dx && dy === -c.dy));
        if (!opcoes.length) { c.dx = -c.dx; c.dy = -c.dy; continue; }
        const reto = opcoes.find(([dx, dy]) => dx === c.dx && dy === c.dy);
        const escolha = reto && Math.random() < 0.6 ? reto : opcoes[Math.floor(Math.random() * opcoes.length)];
        [c.dx, c.dy] = escolha;
      }
    }
    for (const b of barcos) {
      b.x += b.v * dt;
      if (b.min != null) { if (b.x > b.max || b.x < b.min) { b.v = -b.v; b.x = Math.min(b.max, Math.max(b.min, b.x)); } continue; }
      if (b.x > BAIA.x0 - 0.5 && b.v > 0) b.x = -2;
      if (b.x < -2) b.x = BAIA.x0 - 0.5;
    }
    moverHelis(dt);
  }

  function posCarro(c) {
    const faixa = 0.2;
    return [c.tx + 0.5 + c.dx * c.p - c.dy * faixa, c.ty + 0.5 + c.dy * c.p + c.dx * faixa];
  }

  function desenharCarro(c, noite) {
    const [x, y] = posCarro(c);
    const zp = alturaPonte(x, y);
    const comp = c.caminhao ? 0.62 : 0.4, larg = c.caminhao ? 0.24 : 0.2;
    const horiz = c.dx !== 0;
    const w = horiz ? comp : larg, d = horiz ? larg : comp;
    const escurece = (cor) => noite > 0 ? misturar(cor, '#0b1030', noite * 0.55) : cor;
    if (c.caminhao) {
      const cab = 0.18;
      const fx = horiz ? (c.dx > 0 ? x + comp / 2 - cab : x - comp / 2) : x - larg / 2;
      const fy = horiz ? y - larg / 2 : (c.dy > 0 ? y + comp / 2 - cab : y - comp / 2);
      const bx = horiz ? (c.dx > 0 ? x - comp / 2 : x - comp / 2 + cab) : x - larg / 2;
      const by = horiz ? y - larg / 2 : (c.dy > 0 ? y - comp / 2 : y - comp / 2 + cab);
      caixa(ctx, bx, by, horiz ? comp - cab : larg, horiz ? larg : comp - cab, 1 + zp, 11, escurece(c.cor));
      caixa(ctx, fx, fy, horiz ? cab : larg, horiz ? larg : cab, 1 + zp, 8, escurece('#34495e'));
    } else {
      caixa(ctx, x - w / 2, y - d / 2, w, d, 1 + zp, 4.5, escurece(c.cor));
      caixa(ctx, x - w / 2 + (horiz ? w * 0.25 : 0.02), y - d / 2 + (horiz ? 0.02 : d * 0.25), horiz ? w * 0.5 : w - 0.04, horiz ? d - 0.04 : d * 0.5, 5.5 + zp, 3, escurece('#2c3e50'));
    }
    if (noite > 0.15) {
      const [fx2, fy2] = P(x + c.dx * comp * 0.7, y + c.dy * comp * 0.7, 2 + zp);
      ctx.globalAlpha = noite * 0.7;
      ctx.fillStyle = '#fff1b8';
      ctx.beginPath(); ctx.ellipse(fx2, fy2, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      const [tx2, ty2] = P(x - c.dx * comp * 0.5, y - c.dy * comp * 0.5, 3 + zp);
      ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(tx2, ty2, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function desenharBarco(b, noite) {
    if (b.min == null) for (const px of PONTES) if (b.x > px - 0.6 && b.x < px + 1.6) return; // passando sob a ponte
    if (b.x > GG.x - 0.6 && b.x < GG.x + 1.6) return;
    const esc = (c) => noite > 0 ? misturar(c, '#0b1030', noite * 0.55) : c;
    const [sx, sy] = P(b.x, b.y);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(sx - Math.sign(b.v) * 22, sy - Math.sign(b.v) * 11, 14, 4, Math.atan2(16, 32), 0, Math.PI * 2); ctx.fill();
    caixa(ctx, b.x - 0.5, b.y - 0.16, 1.0, 0.32, 0, 5, esc('#2c3e50'));
    if (b.vela) {
      const [mx, my] = P(b.x, b.y, 5), [tx, ty] = P(b.x, b.y, 34);
      ctx.strokeStyle = esc('#6d4c41'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = esc(b.cor); ctx.beginPath(); ctx.moveTo(tx, ty + 2); ctx.lineTo(tx + 13 * Math.sign(b.v || 1), my - 3); ctx.lineTo(tx, my - 3); ctx.closePath(); ctx.fill();
    } else caixa(ctx, b.x - 0.25, b.y - 0.12, 0.45, 0.24, 5, 6, esc(b.cor));
    if (noite > 0.2) { const [lx, ly] = P(b.x, b.y, 12); ctx.fillStyle = '#ffe9a8'; ctx.globalAlpha = noite; ctx.fillRect(lx - 1.5, ly - 1.5, 3, 3); ctx.globalAlpha = 1; }
  }

  // ---------------------------------------------------------------- fumaça
  let acumulaFumaca = 0;
  function moverFumaca(dt) {
    acumulaFumaca += dt;
    if (acumulaFumaca > 0.28) {
      acumulaFumaca = 0;
      for (const c of chamines) fumaca.push({ x: c.x + (Math.random() - 0.5) * 3, y: c.y, r: 3 + Math.random() * 2, vida: 0, max: 5 + Math.random() * 2, vx: 7 + Math.random() * 5, vy: -(12 + Math.random() * 6) });
    }
    for (const f of fumaca) { f.vida += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += 3.2 * dt; f.vy *= 0.995; }
    fumaca = fumaca.filter((f) => f.vida < f.max);
  }

  // ---------------------------------------------------------------- helicópteros
  const CRUZEIRO = 250;
  function moverHelis(dt) {
    for (const h of helis) {
      const alvo = h.alvo != null ? helipontos[h.alvo] : null;
      h.rotor += dt * (h.estado === 'parado' ? (h.espera < 2.5 ? 18 : 0) : 26);
      if (h.estado === 'parado') {
        h.espera -= dt;
        if (h.espera <= 0) {
          let a = Math.floor(Math.random() * helipontos.length);
          if (a === h.pad) a = (a + 1) % helipontos.length;
          if (helis.some((o) => o !== h && (o.alvo === a || (o.estado === 'parado' && o.pad === a)))) a = (a + 2) % helipontos.length;
          h.alvo = a; h.estado = 'subindo';
        }
      } else if (h.estado === 'subindo') {
        h.z = Math.min(CRUZEIRO, h.z + 55 * dt);
        if (h.z >= CRUZEIRO) h.estado = 'voando';
      } else if (h.estado === 'voando') {
        const dx = alvo[0] - h.x, dy = alvo[1] - h.y, dist = Math.hypot(dx, dy);
        h.ang = Math.atan2(dy, dx);
        const passo = 2.6 * dt;
        if (dist <= passo) { h.x = alvo[0]; h.y = alvo[1]; h.estado = 'descendo'; }
        else { h.x += dx / dist * passo; h.y += dy / dist * passo; }
      } else if (h.estado === 'descendo') {
        h.z = Math.max(alvo[2], h.z - 45 * dt);
        if (h.z <= alvo[2]) { h.estado = 'parado'; h.pad = h.alvo; h.alvo = null; h.espera = 6 + Math.random() * 10; }
      }
    }
  }

  function desenharHeli(h, t, noite) {
    const [sx, sy] = P(h.x, h.y, h.z);
    const esc = (c) => noite > 0 ? misturar(c, '#0b1030', noite * 0.5) : c;
    // sombra no chão quando voa
    if (h.z > 6) { const [gx, gy] = P(h.x, h.y); ctx.fillStyle = `rgba(0,0,0,${(0.18 * Math.max(0.2, 1 - h.z / 320)).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(gx, gy, 11, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    // direção na tela
    const [ax, ay] = P(h.x + Math.cos(h.ang), h.y + Math.sin(h.ang), h.z);
    let ux = ax - sx, uy = ay - sy; const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l;
    // esquis
    ctx.strokeStyle = esc('#2c3e50'); ctx.lineWidth = 1.2;
    for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx - ux * 7 + uy * 3 * s2, sy - uy * 7 + 5 - ux * 1.5 * s2); ctx.lineTo(sx + ux * 7 + uy * 3 * s2, sy + uy * 7 + 5 - ux * 1.5 * s2); ctx.stroke(); }
    // cauda
    ctx.strokeStyle = esc(h.cor); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - ux * 16, sy - uy * 16 - 2); ctx.stroke();
    ctx.fillStyle = esc(h.cor); ctx.fillRect(sx - ux * 16 - 1.5, sy - uy * 16 - 6, 3, 6);
    // corpo e cabine
    ctx.fillStyle = esc(h.cor); ctx.beginPath(); ctx.ellipse(sx, sy, 8, 5, Math.atan2(uy, ux), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = esc('#9fd3ef'); ctx.beginPath(); ctx.ellipse(sx + ux * 4, sy + uy * 4 - 1, 3.5, 2.8, Math.atan2(uy, ux), 0, Math.PI * 2); ctx.fill();
    // hélice
    const gira = h.rotor;
    ctx.strokeStyle = 'rgba(30,30,30,.75)'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 2; i++) { const a = gira + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(sx - Math.cos(a) * 15, sy - 6 - Math.sin(a) * 7); ctx.lineTo(sx + Math.cos(a) * 15, sy - 6 + Math.sin(a) * 7); ctx.stroke(); }
    if (h.estado !== 'parado') { ctx.fillStyle = 'rgba(200,200,200,.18)'; ctx.beginPath(); ctx.ellipse(sx, sy - 6, 15, 7, 0, 0, Math.PI * 2); ctx.fill(); }
    // luzes de navegação
    if (Math.floor(t * 1.6 + h.ang) % 2 === 0) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(sx - ux * 16, sy - uy * 16 - 7, 1.6, 0, Math.PI * 2); ctx.fill(); }
    if (noite > 0.3 && h.estado !== 'parado') {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = noite * 0.35;
      const [gx, gy] = P(h.x + Math.cos(h.ang) * 0.6, h.y + Math.sin(h.ang) * 0.6);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 26); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = g; ctx.fillRect(gx - 26, gy - 26, 52, 52);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ---------------------------------------------------------------- extras animados
  function desenharRoda(rd, t, noite) {
    const { cx, cy, hub, R } = rd, Rz = R * 45, n = 14, giro = t * 0.22 + rd.fase;
    const ponto = (a, raio = 1) => P(cx + Math.cos(a) * R * raio, cy, hub + Math.sin(a) * Rz * raio);
    const perna = (dy) => { const a = P(cx, cy + dy), b2 = P(cx, cy, hub); ctx.strokeStyle = '#d0d3d4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke(); };
    perna(-0.55);
    const [hx, hy] = P(cx, cy, hub);
    ctx.strokeStyle = noite > 0.5 ? '#9fb4c7' : '#eef2f5'; ctx.lineWidth = 1.1;
    for (let i = 0; i < n; i++) { const [px, py] = ponto(giro + i * Math.PI * 2 / n); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(px, py); ctx.stroke(); }
    ctx.lineWidth = 2.6; ctx.strokeStyle = noite > 0.5 ? '#c7d3de' : '#ffffff';
    ctx.beginPath(); for (let i = 0; i <= 48; i++) { const [px, py] = ponto(i / 48 * Math.PI * 2); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i <= 48; i++) { const [px, py] = ponto(i / 48 * Math.PI * 2, 0.9); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
    const cores = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c'];
    for (let i = 0; i < n; i++) {
      const [px, py] = ponto(giro + i * Math.PI * 2 / n);
      ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + 4); ctx.stroke();
      ctx.fillStyle = noite > 0 ? misturar(cores[i % cores.length], '#0b1030', noite * 0.35) : cores[i % cores.length];
      ctx.beginPath(); ctx.ellipse(px, py + 7, 4.2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      if (noite > 0.2) { ctx.fillStyle = '#fff3c4'; ctx.globalAlpha = noite * 0.9; ctx.fillRect(px - 1.5, py + 5.5, 3, 2); ctx.globalAlpha = 1; }
    }
    ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
    if (noite > 0.05) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = noite;
      for (let i = 0; i < 28; i++) { const [px, py] = ponto(i / 28 * Math.PI * 2); ctx.fillStyle = ['#ff5c8a', '#ffd166', '#5ec8ff'][(i + Math.floor(t * 3)) % 3]; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    perna(0.55);
  }

  function desenharSemaforos(lista, t, noite) {
    for (const sm of lista) {
      const c = (t + sm.fase) % 12, i = c < 5 ? 2 : c < 6.5 ? 1 : 0;
      const [sx, sy] = P(sm.p[0], sm.p[1], 25);
      const cor = ['#ff3b3b', '#ffc93b', '#3bff7a'][i];
      ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(sx, sy - 8.5 + i * 3.6, 1.5, 0, Math.PI * 2); ctx.fill();
      if (noite > 0.1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = noite * 0.6; ctx.beginPath(); ctx.arc(sx, sy - 8.5 + i * 3.6, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    }
  }

  function desenharExtras(b, t, noite) {
    if (b.roda) desenharRoda(b.roda, t, noite);
    if (b.semaforos && b.semaforos.length) desenharSemaforos(b.semaforos, t, noite);
    if (b.turbinas) for (const tb of b.turbinas) {
      const [cx, cy] = tb.cubo;
      ctx.strokeStyle = noite > 0.5 ? '#9aa4ad' : '#f4f6f7'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = t * 1.6 + tb.fase + i * 2.094;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); ctx.stroke();
      }
      if (noite > 0.3 && Math.floor(t * 1.2) % 2 === 0) { ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(cx, cy - 4, 2, 0, Math.PI * 2); ctx.fill(); }
    }
    if (b.guindaste) {
      const gd = b.guindaste, [bx, by] = gd.base, a = Math.sin(t * 0.25 + gd.fase) * 1.4 + 2.3;
      const topo = P(bx, by, gd.alt), ponta = P(bx + Math.cos(a) * 2.4, by + Math.sin(a) * 2.4, gd.alt), contra = P(bx - Math.cos(a) * 0.8, by - Math.sin(a) * 0.8, gd.alt);
      ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(contra[0], contra[1]); ctx.lineTo(ponta[0], ponta[1]); ctx.stroke();
      ctx.fillStyle = '#7f8c8d'; ctx.fillRect(contra[0] - 4, contra[1] - 2, 8, 6);
      const desce = 26 + Math.sin(t * 0.7 + gd.fase) * 14;
      ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ponta[0], ponta[1]); ctx.lineTo(ponta[0], ponta[1] + desce); ctx.stroke();
      ctx.fillStyle = '#8e5a3c'; ctx.fillRect(ponta[0] - 5, ponta[1] + desce, 10, 5);
      if (noite > 0.3) { ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(topo[0], topo[1] - 3, 2, 0, Math.PI * 2); ctx.fill(); }
    }
    if (b.chama) {
      const [fx, fy] = b.chama, h = 9 + Math.sin(t * 13) * 2.5 + Math.sin(t * 7.3) * 1.5;
      ctx.fillStyle = '#ff9f1a'; ctx.beginPath(); ctx.moveTo(fx - 3.5, fy); ctx.quadraticCurveTo(fx, fy - h * 1.4, fx + 3.5, fy); ctx.fill();
      ctx.fillStyle = '#ffe26b'; ctx.beginPath(); ctx.moveTo(fx - 1.8, fy); ctx.quadraticCurveTo(fx, fy - h * 0.8, fx + 1.8, fy); ctx.fill();
      if (noite > 0.1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = noite * 0.5; ctx.fillStyle = '#ff8c1a'; ctx.beginPath(); ctx.arc(fx, fy - 6, 18, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    }
    if (b.refletores && noite > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = noite * 0.55;
      const [cx, cy] = b.campo;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      g.addColorStop(0, 'rgba(200,255,200,.8)'); g.addColorStop(1, 'rgba(200,255,200,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 120, cy - 120, 240, 240);
      ctx.fillStyle = '#ffffff';
      for (const [rx, ry] of b.refletores) { ctx.beginPath(); ctx.arc(rx, ry + 4, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ---------------------------------------------------------------- avião
  function desenharAviao(t) {
    const periodo = 55, dur = 20, c = t % periodo;
    if (c > dur) return;
    const f = c / dur;
    const x = -300 + f * (LARG + 600), y = TOPO + 150 + f * 500 - 260;
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath(); ctx.ellipse(x + 80, y + 330, 16, 6, 0.46, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.46);
    ctx.fillStyle = '#f4f6f7';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-8, -18); ctx.lineTo(2, -18); ctx.lineTo(8, 0); ctx.lineTo(2, 18); ctx.lineTo(-8, 18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-23, -7); ctx.lineTo(-19, -7); ctx.lineTo(-14, 0); ctx.lineTo(-19, 7); ctx.lineTo(-23, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-23, -1, 6, 2);
    ctx.restore();
  }

  // ---------------------------------------------------------------- marcadores
  function imagem(src) {
    if (!src) return null;
    if (!imgs[src]) { const im = new Image(); im.src = src; imgs[src] = im; }
    const im = imgs[src];
    return im.complete && im.naturalWidth ? im : null;
  }

  function retArred(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // Seta verde (subiu) ou vermelha (caiu) no canto do marcador
  function seta(cx, cy, pct) {
    if (!pct) return;
    const sobe = pct > 0;
    ctx.fillStyle = '#0e0e12'; ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = sobe ? '#3ccf8e' : '#ff6b6b'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = sobe ? '#3ccf8e' : '#ff6b6b';
    ctx.beginPath();
    if (sobe) { ctx.moveTo(cx, cy - 4.5); ctx.lineTo(cx + 4.5, cy + 3); ctx.lineTo(cx - 4.5, cy + 3); }
    else { ctx.moveTo(cx, cy + 4.5); ctx.lineTo(cx + 4.5, cy - 3); ctx.lineTo(cx - 4.5, cy - 3); }
    ctx.closePath(); ctx.fill();
  }

  function desenharMarcadores() {
    alvos = [];
    const compacto = cam.z < 0.62;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textBaseline = 'alphabetic';
    for (const [id, sede] of Object.entries(sedes)) {
      const st = estadoEmpresas[id];
      if (!st) continue;
      const sx = (sede.ancora[0] - cam.x) * cam.z + W / 2, sy = (sede.ancora[1] - cam.y) * cam.z + H / 2;
      if (sx < -150 || sx > W + 150 || sy < -60 || sy > H + 80) continue;
      const logoImg = imagem(marca(id));
      // donos: no modo grupo, a foto de todos os membros do grupo (até 4)
      const idsDonos = st.grupo_id && st.membros?.length ? st.membros.slice(0, 4).map((m) => m.id) : st.dono_id ? [st.dono_id] : [];
      const tam = compacto ? 26 : 30;
      const passo = Math.round(tam * 0.55), larguraFotos = idsDonos.length ? tam + (idsDonos.length - 1) * passo : tam;
      let w, h = tam + 10;
      ctx.font = '700 12px Manrope, system-ui, sans-serif';
      const titulo = st.grupo_id ? `Grupo ${st.grupo_nome || ''}` : st.dono_id ? (st.dono_nome || 'Dono') : st.nome;
      // valor: com dono, quanto valem as ações do dono (o lance que ele levou); sem dono, o preço de 1 ação
      const valorTxt = st.dono_id ? valorK(st.valor ?? Number(st.preco) * st.acoes_dono) : valorK(st.preco);
      const sub = st.dono_id ? `${st.acoes_dono} ${st.acoes_dono === 1 ? 'ação' : 'ações'} · ${valorTxt}` : `Disponível · ${valorTxt}`;
      const pctTxt = st.pct ? ` ${st.pct > 0 ? '▲' : '▼'} ${Math.abs(Number(st.pct)).toFixed(1).replace('.', ',')}%` : '';
      ctx.font = '600 11px Manrope, system-ui, sans-serif';
      const larguraSub = ctx.measureText(sub + pctTxt).width;
      ctx.font = '700 12px Manrope, system-ui, sans-serif';
      w = compacto ? larguraFotos + 10 : larguraFotos + 18 + Math.max(ctx.measureText(titulo).width, larguraSub, 62);
      const x = sx - w / 2, y = sy - h - 9;
      // haste e sombra
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(214,168,64,.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx, y + h); ctx.lineTo(sx, sy); ctx.stroke();
      // placa
      retArred(ctx, x, y, w, h, 10);
      ctx.fillStyle = 'rgba(14,14,18,.9)'; ctx.fill();
      ctx.strokeStyle = st.dono_id ? 'rgba(246,220,142,.95)' : 'rgba(214,168,64,.55)'; ctx.lineWidth = st.dono_id ? 1.6 : 1; ctx.stroke();
      const ix = x + 5, iy = y + 5;
      if (idsDonos.length) {
        // de trás para a frente, para a primeira foto ficar por cima
        for (let k = idsDonos.length - 1; k >= 0; k--) {
          const fx = ix + k * passo, fotoImg = imagem(fotos[idsDonos[k]]);
          ctx.save(); ctx.beginPath(); ctx.arc(fx + tam / 2, iy + tam / 2, tam / 2, 0, Math.PI * 2); ctx.clip();
          if (fotoImg) ctx.drawImage(fotoImg, fx, iy, tam, tam); else { ctx.fillStyle = '#444'; ctx.fillRect(fx, iy, tam, tam); }
          ctx.restore();
          ctx.strokeStyle = '#d6a840'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(fx + tam / 2, iy + tam / 2, tam / 2, 0, Math.PI * 2); ctx.stroke();
        }
        if (logoImg) ctx.drawImage(logoImg, ix + larguraFotos - 12, iy + tam - 12, 15, 15);
      } else if (logoImg) {
        ctx.drawImage(logoImg, ix, iy, tam, tam);
      }
      seta(ix + larguraFotos - 1, iy + 1, Number(st.pct || 0));
      const tx = ix + larguraFotos + 8;
      if (!compacto) {
        ctx.fillStyle = '#f3eee2'; ctx.fillText(titulo, tx, iy + 13);
        ctx.font = '600 11px Manrope, system-ui, sans-serif';
        ctx.fillStyle = st.dono_id ? '#f6dc8e' : '#a9a292'; ctx.fillText(sub, tx, iy + 27);
        if (pctTxt) {
          const w0 = ctx.measureText(sub).width;
          ctx.fillStyle = st.pct > 0 ? '#3ccf8e' : '#ff6b6b'; ctx.fillText(pctTxt, tx + w0, iy + 27);
        }
      } else {
        // de longe: só o valor, numa etiqueta em cima da placa
        ctx.font = '700 10px Manrope, system-ui, sans-serif';
        const wv = ctx.measureText(valorTxt).width + 10;
        retArred(ctx, sx - wv / 2, y - 15, wv, 13, 6);
        ctx.fillStyle = 'rgba(14,14,18,.88)'; ctx.fill();
        ctx.fillStyle = st.dono_id ? '#f6dc8e' : '#cfc8b8'; ctx.textAlign = 'center'; ctx.fillText(valorTxt, sx, y - 5); ctx.textAlign = 'left';
      }
      alvos.push({ id, x, y: compacto ? y - 15 : y, w, h: h + 9 + (compacto ? 15 : 0) });
    }
  }

  // ---------------------------------------------------------------- quadro
  let ultimo = 0;
  function quadro(ts) {
    raf = requestAnimationFrame(quadro);
    if (!pronta || !ativo) return;
    if (movel && ts - ultimo < 30) return;
    const dt = Math.min(0.06, (ts - (ultimo || ts)) / 1000);
    ultimo = ts;
    const t = ts / 1000;
    moverCarros(dt); moverFumaca(dt);
    const noite = fatorNoite();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = misturar('#5f9e4a', '#0d1712', noite);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const z = cam.z;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - cam.x * z), dpr * (H / 2 - cam.y * z));
    const vx0 = cam.x - W / 2 / z, vy0 = cam.y - H / 2 / z, vx1 = cam.x + W / 2 / z, vy1 = cam.y + H / 2 / z;

    // chão (só o pedaço visível)
    const sx0 = Math.max(0, vx0), sy0 = Math.max(0, vy0), sx1 = Math.min(LARG, vx1), sy1 = Math.min(ALT, vy1);
    if (sx1 > sx0 && sy1 > sy0) {
      ctx.drawImage(chao, sx0 * RES_CHAO, sy0 * RES_CHAO, (sx1 - sx0) * RES_CHAO, (sy1 - sy0) * RES_CHAO, sx0, sy0, sx1 - sx0, sy1 - sy0);
      ondas(t, noite, vx0, vx1);
      if (noite > 0) {
        ctx.fillStyle = `rgba(8,13,38,${(0.62 * noite).toFixed(3)})`;
        ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = noite;
        ctx.drawImage(brilho, sx0 / 2, sy0 / 2, (sx1 - sx0) / 2, (sy1 - sy0) / 2, sx0, sy0, sx1 - sx0, sy1 - sy0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }

    // peças fixas + veículos, na ordem de profundidade
    const dinamicos = carros.map((c) => { const [x, y] = posCarro(c); return { k: x + y + 0.001, c }; })
      .concat(barcos.map((b) => ({ k: b.x + b.y, barco: b })))
      .sort((a, b) => a.k - b.k);
    let j = 0;
    const visivel = (s) => s.x < vx1 && s.x + s.w > vx0 && s.y < vy1 && s.y + s.h > vy0;
    const desenharDin = (d) => {
      if (d.c) { const [x, y] = P(...posCarro(d.c)); if (x < vx0 - 30 || x > vx1 + 30 || y < vy0 - 30 || y > vy1 + 30) return; desenharCarro(d.c, noite); }
      else desenharBarco(d.barco, noite);
    };
    for (const o of objetos) {
      while (j < dinamicos.length && dinamicos[j].k <= o.k) desenharDin(dinamicos[j++]);
      const s = o.s;
      if (visivel(s)) {
        if (noite < 0.995) ctx.drawImage(s.dia, s.x, s.y, s.w, s.h);
        if (noite > 0.005) { ctx.globalAlpha = noite; ctx.drawImage(s.noite, s.x, s.y, s.w, s.h); ctx.globalAlpha = 1; }
        if (o.b && o.b.anim) desenharExtras(o.b, t, noite);
      }
    }
    while (j < dinamicos.length) desenharDin(dinamicos[j++]);

    // fumaça
    const corF = misturar('#d9d9d9', '#5c6270', noite);
    ctx.fillStyle = corF;
    for (const f of fumaca) {
      if (f.x < vx0 - 40 || f.x > vx1 + 40 || f.y < vy0 - 40 || f.y > vy1 + 40) continue;
      ctx.globalAlpha = 0.5 * (1 - f.vida / f.max);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const h of helis) desenharHeli(h, t, noite);
    desenharAviao(t);

    // tom de entardecer / amanhecer
    if (noite > 0.02 && noite < 0.98) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(255,128,60,${(0.13 * Math.sin(Math.PI * noite)).toFixed(3)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    desenharMarcadores();
  }

  function ondas(t, noite, vx0, vx1) {
    ctx.strokeStyle = noite > 0.5 ? 'rgba(160,200,255,.18)' : 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const y = RIO.y0 + 0.2 + ((i * 0.37) % 2.6);
      const x = ((i * 7.31 + t * (0.25 + (i % 3) * 0.08)) % (BAIA.x0 + 2)) - 2;
      const a = P(x, y), b = P(x + 0.35, y);
      if (b[0] < vx0 || a[0] > vx1) continue;
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    // baía e mar
    for (let i = 0; i < 110; i++) {
      const y = BAIA.y0 - 6 + ((i * 1.37) % 26);
      const x = BAIA.x0 + 0.3 + ((i * 5.71 + t * (0.18 + (i % 4) * 0.05)) % 22);
      if (x < N && (y < BAIA.y0 || y > BAIA.y1 + 0.7)) continue;
      const a = P(x, y), b = P(x + 0.35, y);
      if (b[0] < vx0 || a[0] > vx1) continue;
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
  }

  // ---------------------------------------------------------------- câmera e toque
  function limitar() {
    const zMin = Math.max(W / (LARG + 200), H / (ALT + 100), 0.3);
    cam.z = Math.min(2.4, Math.max(zMin, cam.z));
    const meioW = W / 2 / cam.z, meioH = H / 2 / cam.z;
    const xMin = -100 + meioW, xMax = LARG + 100 - meioW, yMin = TOPO - 260 + meioH, yMax = ALT + 60 - meioH;
    cam.x = xMin > xMax ? LARG / 2 : Math.min(xMax, Math.max(xMin, cam.x));
    cam.y = yMin > yMax ? (TOPO + N * TH / 2) : Math.min(yMax, Math.max(yMin, cam.y));
  }

  function ajustarTamanho() {
    const ret = raiz.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, movel ? 2 : 2);
    W = Math.max(1, ret.width); H = Math.max(1, ret.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    limitar();
  }
  const obs = new ResizeObserver(ajustarTamanho);
  obs.observe(raiz);

  const toques = new Map();
  let arrasto = null, pinca = null;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.size === 1) arrasto = { x: e.clientX, y: e.clientY, ini: performance.now(), moveu: 0 };
    if (toques.size === 2) { const [a, b] = [...toques.values()]; pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z }; arrasto = null; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!toques.has(e.pointerId)) return;
    const ant = toques.get(e.pointerId);
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinca && toques.size === 2) {
      const [a, b] = [...toques.values()];
      const ret = canvas.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - ret.left, my = (a.y + b.y) / 2 - ret.top;
      zoomEm(mx, my, pinca.z * Math.hypot(a.x - b.x, a.y - b.y) / pinca.d);
    } else if (arrasto) {
      const dx = e.clientX - ant.x, dy = e.clientY - ant.y;
      arrasto.moveu += Math.abs(dx) + Math.abs(dy);
      cam.x -= dx / cam.z; cam.y -= dy / cam.z; limitar();
      canvas.style.cursor = 'grabbing';
    }
  });
  const soltar = (e) => {
    toques.delete(e.pointerId);
    canvas.style.cursor = '';
    if (arrasto && arrasto.moveu < 8 && performance.now() - arrasto.ini < 500) {
      const ret = canvas.getBoundingClientRect();
      const px = e.clientX - ret.left, py = e.clientY - ret.top;
      const alvo = alvos.slice().reverse().find((a) => px >= a.x && px <= a.x + a.w && py >= a.y && py <= a.y + a.h);
      if (alvo) aoClicarEmpresa?.(alvo.id);
    }
    if (toques.size < 2) pinca = null;
    if (toques.size === 0) arrasto = null;
  };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const ret = canvas.getBoundingClientRect();
    zoomEm(e.clientX - ret.left, e.clientY - ret.top, cam.z * Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  canvas.addEventListener('mousemove', (e) => {
    if (arrasto) return;
    const ret = canvas.getBoundingClientRect();
    const px = e.clientX - ret.left, py = e.clientY - ret.top;
    canvas.style.cursor = alvos.some((a) => px >= a.x && px <= a.x + a.w && py >= a.y && py <= a.y + a.h) ? 'pointer' : '';
  });

  function zoomEm(px, py, novoZ) {
    const wx = cam.x + (px - W / 2) / cam.z, wy = cam.y + (py - H / 2) / cam.z;
    cam.z = novoZ; limitar();
    cam.x = wx - (px - W / 2) / cam.z; cam.y = wy - (py - H / 2) / cam.z;
    limitar();
  }

  // ---------------------------------------------------------------- iniciar
  setTimeout(() => {
    try { montar(); } catch (e) { aviso.textContent = 'Não foi possível desenhar a cidade.'; console.error(e); }
  }, 30);
  raf = requestAnimationFrame(quadro);

  return {
    raiz,
    atualizarEmpresas(lista, mapaFotos) {
      estadoEmpresas = Object.fromEntries((lista || []).map((e) => [e.id, e]));
      fotos = mapaFotos || {};
    },
    focar(id) {
      const s = sedes[id]; if (!s) return;
      cam.x = s.ancora[0]; cam.y = s.ancora[1] + 60; cam.z = Math.max(cam.z, 1); limitar();
    },
    pausar(sim) { ativo = !sim; },
    destruir() { cancelAnimationFrame(raf); obs.disconnect(); },
    get pronta() { return pronta; },
  };
}
