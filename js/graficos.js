// Gráficos de linha do preço das ações (uma série por gráfico, sem legenda:
// o título do cartão já diz de qual empresa é). Linha de 2px, ponto final
// marcado, grade discreta e dica ao passar o dedo/mouse.
import { el, real } from './ui.js';

const COR = '#d6a840';
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };

function escalas(serie, w, h, m) {
  const min = Math.min(...serie), max = Math.max(...serie);
  const folga = (max - min) * 0.12 || max * 0.05 || 1;
  const lo = min - folga, hi = max + folga;
  const x = (i) => m.l + (serie.length === 1 ? (w - m.l - m.r) / 2 : (i * (w - m.l - m.r)) / (serie.length - 1));
  const y = (v) => m.t + (h - m.t - m.b) * (1 - (v - lo) / (hi - lo));
  return { x, y, lo, hi };
}

// Mini gráfico para o relatório geral
export function miniGrafico(serie, w = 120, h = 36) {
  const s = svgEl('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, class: 'mini-grafico', role: 'img', 'aria-label': 'Evolução do preço' });
  if (!serie || serie.length < 2) return s;
  const { x, y } = escalas(serie, w, h, { l: 2, r: 5, t: 4, b: 4 });
  const pts = serie.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  s.append(svgEl('polygon', { points: `${x(0)},${h - 2} ${pts.join(' ')} ${x(serie.length - 1)},${h - 2}`, fill: COR, opacity: '.12' }));
  s.append(svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: COR, 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  const ult = serie.length - 1;
  s.append(svgEl('circle', { cx: x(ult), cy: y(serie[ult]), r: 3, fill: COR, stroke: '#131318', 'stroke-width': '1.5' }));
  return s;
}

// Gráfico maior, com eixos, grade e dica (rodada + preço)
export function graficoPreco(serie, { largura = 520, altura = 200 } = {}) {
  const caixa = el('div', { class: 'grafico' });
  if (!serie || !serie.length) return caixa;
  const w = largura, h = altura, m = { l: 62, r: 14, t: 12, b: 26 };
  const { x, y, lo, hi } = escalas(serie, w, h, m);
  const s = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, class: 'grafico-svg', role: 'img', 'aria-label': 'Preço de 1 ação por rodada' });

  // grade e eixo de valores (4 linhas)
  for (let i = 0; i <= 3; i++) {
    const v = lo + ((hi - lo) * i) / 3, yy = y(v);
    s.append(svgEl('line', { x1: m.l, x2: w - m.r, y1: yy, y2: yy, stroke: 'rgba(255,255,255,.08)', 'stroke-width': '1' }));
    const t = svgEl('text', { x: m.l - 8, y: yy + 4, 'text-anchor': 'end', class: 'grafico-eixo' });
    t.textContent = real(v).replace(',00', '');
    s.append(t);
  }
  // rodadas no eixo de baixo (no máximo ~8 rótulos)
  const passo = Math.max(1, Math.ceil(serie.length / 8));
  serie.forEach((_, i) => {
    if (i % passo && i !== serie.length - 1) return;
    const t = svgEl('text', { x: x(i), y: h - 6, 'text-anchor': 'middle', class: 'grafico-eixo' });
    t.textContent = i === 0 ? 'Início' : `R${i}`;
    s.append(t);
  });

  const pts = serie.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  if (serie.length > 1) {
    s.append(svgEl('polygon', { points: `${x(0)},${h - m.b} ${pts.join(' ')} ${x(serie.length - 1)},${h - m.b}`, fill: COR, opacity: '.1' }));
    s.append(svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: COR, 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  }
  const ult = serie.length - 1;
  s.append(svgEl('circle', { cx: x(ult), cy: y(serie[ult]), r: 4.5, fill: COR, stroke: '#131318', 'stroke-width': '2' }));

  // dica
  const guia = svgEl('line', { y1: m.t, y2: h - m.b, stroke: 'rgba(246,220,142,.5)', 'stroke-width': '1', visibility: 'hidden' });
  const ponto = svgEl('circle', { r: 5, fill: COR, stroke: '#131318', 'stroke-width': '2', visibility: 'hidden' });
  s.append(guia, ponto);
  const dica = el('div', { class: 'grafico-dica', hidden: true });
  const area = svgEl('rect', { x: m.l, y: 0, width: w - m.l - m.r, height: h, fill: 'transparent' });
  s.append(area);
  const mostrar = (ev) => {
    const ret = s.getBoundingClientRect();
    const px = ((ev.clientX - ret.left) / ret.width) * w;
    let i = serie.length === 1 ? 0 : Math.round(((px - m.l) / (w - m.l - m.r)) * (serie.length - 1));
    i = Math.max(0, Math.min(serie.length - 1, i));
    guia.setAttribute('x1', x(i)); guia.setAttribute('x2', x(i)); guia.setAttribute('visibility', 'visible');
    ponto.setAttribute('cx', x(i)); ponto.setAttribute('cy', y(serie[i])); ponto.setAttribute('visibility', 'visible');
    const ant = i > 0 ? serie[i - 1] : null;
    const pct = ant ? ((serie[i] / ant - 1) * 100) : null;
    dica.replaceChildren(
      el('span', { class: 'dica-rotulo' }, i === 0 ? 'Valor inicial' : `Rodada ${i}`),
      el('strong', {}, real(serie[i])),
      ...(pct === null ? [] : [el('span', { class: pct >= 0 ? 'sobe' : 'cai' }, `${pct >= 0 ? '▲' : '▼'} ${fmtPct(Math.abs(pct))}`)]));
    dica.hidden = false;
    const xp = (x(i) / w) * ret.width;
    dica.style.left = `${Math.min(ret.width - 120, Math.max(0, xp - 60))}px`;
  };
  const esconder = () => { dica.hidden = true; guia.setAttribute('visibility', 'hidden'); ponto.setAttribute('visibility', 'hidden'); };
  area.addEventListener('pointermove', mostrar);
  area.addEventListener('pointerdown', mostrar);
  area.addEventListener('pointerleave', esconder);
  caixa.append(s, dica);
  return caixa;
}

const fmt1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtPct = (v, casas = 1) => (casas === 2 ? fmt2 : fmt1).format(v) + '%';

// Seta + porcentagem (cor + seta + sinal: nunca só a cor)
export function variacao(pct) {
  const n = Number(pct || 0);
  const sobe = n > 0, igual = n === 0;
  return el('span', { class: 'variacao ' + (igual ? 'igual' : sobe ? 'sobe' : 'cai') },
    igual ? '■' : sobe ? '▲' : '▼', ' ', (sobe ? '+' : igual ? '' : '−') + fmtPct(Math.abs(n)));
}
