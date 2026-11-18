// Pequenas ferramentas de tela usadas em todo o jogo.

export const $ = (sel, raiz = document) => raiz.querySelector(sel);

export function el(tag, attrs = {}, ...filhos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) {
    if (f === null || f === undefined || f === false) continue;
    n.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return n;
}

const fmtReal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtRealCurto = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const real = (v) => (v === null || v === undefined ? '••••••' : fmtReal.format(Number(v)));
const fmtCompacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
export const realCompacto = (v) => (v === null || v === undefined ? '••••' : fmtCompacto.format(Number(v)));
export const realCurto = (v) => (v === null || v === undefined ? '••••••' : fmtRealCurto.format(Number(v)));

export function toast(msg, tipo = 'info') {
  let caixa = $('#toasts');
  if (!caixa) { caixa = el('div', { id: 'toasts' }); document.body.append(caixa); }
  const t = el('div', { class: `toast toast-${tipo}`, role: 'status' }, msg);
  caixa.append(t);
  setTimeout(() => t.classList.add('saindo'), 3600);
  setTimeout(() => t.remove(), 4100);
}

// Janela por cima de tudo. Devolve { fechar, corpo }.
export function modal({ titulo, conteudo, botoes = [], classe = '', fecharFora = true }) {
  const fundo = el('div', { class: 'modal-fundo' });
  const caixa = el('div', { class: `modal ${classe}`, role: 'dialog', 'aria-modal': 'true' });
  const fechar = () => { fundo.classList.add('saindo'); setTimeout(() => fundo.remove(), 180); };
  if (titulo) caixa.append(el('h2', { class: 'modal-titulo' }, titulo));
  const corpo = el('div', { class: 'modal-corpo' });
  if (conteudo) corpo.append(conteudo);
  caixa.append(corpo);
  if (botoes.length) {
    caixa.append(el('div', { class: 'modal-botoes' }, botoes.map((b) =>
      el('button', { class: `btn ${b.classe || ''}`, onclick: () => b.acao ? b.acao(fechar) : fechar() }, b.texto))));
  }
  if (fecharFora) fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
  fundo.append(caixa);
  document.body.append(fundo);
  return { fechar, corpo };
}

export function confirmar(titulo, texto, textoSim = 'Confirmar') {
  return new Promise((ok) => {
    modal({
      titulo, conteudo: el('p', {}, texto), fecharFora: false,
      botoes: [
        { texto: 'Cancelar', classe: 'btn-fantasma', acao: (f) => { f(); ok(false); } },
        { texto: textoSim, classe: 'btn-ouro', acao: (f) => { f(); ok(true); } },
      ],
    });
  });
}

// Ícones simples (traço), no lugar de emojis
const ICONES = {
  olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6C3.7 9.4 2 12 2 12s3.6 6 10 6a9.6 9.6 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  grafico: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/><path d="M16 7h4v4"/>',
  ajuda: '<circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4"/><circle cx="12" cy="17.4" r=".6" fill="currentColor"/>',
  banco: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8"/><path d="M3 21h18"/>',
  mercado: '<path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/><path d="M3 21h18"/>',
  sair: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H4"/>',
  copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  upload: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  coroa: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Z"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
};
export function icone(nome, tam = 22) {
  const s = el('span', { class: 'icone', 'aria-hidden': 'true' });
  s.innerHTML = `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome] || ''}</svg>`;
  return s;
}

// Emblema do jogo (moeda dourada com o horizonte de Neópolis)
export function emblema(tam = 120) {
  const s = el('span', { class: 'emblema' });
  s.innerHTML = `<svg width="${tam}" height="${tam}" viewBox="0 0 200 200" role="img" aria-label="O Milionário">
  <defs>
    <linearGradient id="emb-ouro" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbeab0"/><stop offset=".45" stop-color="#d6a840"/><stop offset="1" stop-color="#7d5814"/>
    </linearGradient>
    <linearGradient id="emb-ouro2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6dc8e"/><stop offset="1" stop-color="#a5791f"/>
    </linearGradient>
    <radialGradient id="emb-brilho" cx=".5" cy=".38" r=".6">
      <stop offset="0" stop-color="#3a2e14" stop-opacity=".9"/><stop offset="1" stop-color="#0b0b0d" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="emb-dentro"><circle cx="100" cy="100" r="80"/></clipPath>
  </defs>
  <circle cx="100" cy="100" r="80" fill="url(#emb-brilho)"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="url(#emb-ouro)" stroke-width="5"/>
  <circle cx="100" cy="100" r="84" fill="none" stroke="url(#emb-ouro)" stroke-width="1.2" opacity=".55"/>
  <g clip-path="url(#emb-dentro)">
    <g fill="url(#emb-ouro2)">
      <rect x="34" y="104" width="18" height="50"/><rect x="54" y="78" width="22" height="76"/>
      <rect x="78" y="94" width="16" height="60"/><rect x="96" y="56" width="24" height="98"/>
      <path d="M108 44 L108 56 L104 56 Z" />
      <rect x="122" y="84" width="20" height="70"/><rect x="144" y="108" width="20" height="46"/>
    </g>
    <g fill="#0b0b0d" opacity=".55">
      ${[[59, 86], [67, 86], [59, 98], [67, 98], [59, 110], [67, 110], [101, 66], [111, 66], [101, 78], [111, 78], [101, 90], [111, 90], [101, 102], [111, 102], [127, 94], [135, 94], [127, 106], [135, 106], [39, 114], [45, 114], [82, 104], [82, 116], [149, 118], [157, 118]]
        .map(([x, y]) => `<rect x="${x}" y="${y}" width="4" height="6"/>`).join('')}
    </g>
    <rect x="20" y="154" width="160" height="40" fill="#0b0b0d" opacity=".75"/>
  </g>
  <polyline points="38,138 66,118 88,128 118,92 150,70" fill="none" stroke="#0b0b0d" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
  <polyline points="38,138 66,118 88,128 118,92 150,70" fill="none" stroke="#fff4cf" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M141 64 L160 60 L154 78 Z" fill="#fff4cf" stroke="#0b0b0d" stroke-width="2" stroke-linejoin="round"/>
  <path d="M100 160 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z" fill="url(#emb-ouro)"/>
  <path d="M152 34 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4Z" fill="#fff4cf"/>
</svg>`;
  return s;
}

export function marca(tamanho = 'grande') {
  return el('div', { class: `marca marca-${tamanho}` },
    emblema(tamanho === 'grande' ? 150 : 56),
    el('div', { class: 'marca-texto' },
      el('span', { class: 'marca-o' }, 'O'),
      el('span', { class: 'marca-nome' }, 'MILIONÁRIO'),
      tamanho === 'grande' ? el('span', { class: 'marca-linha' }, 'NEÓPOLIS · AÇÕES · LEILÕES') : null));
}

// Horizonte de Neópolis desenhado no fundo (a cidade completa vem na Etapa 2)
export function fundoCidade() {
  const w = 1600, h = 900;
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  let predios = '', janelas = '';
  for (const camada of [{ base: 760, alt: [180, 420], cor: '#15161d', luz: .18 }, { base: 900, alt: [120, 360], cor: '#0d0e13', luz: .3 }]) {
    let x = -20;
    while (x < w) {
      const larg = 50 + rnd() * 90, alt = camada.alt[0] + rnd() * (camada.alt[1] - camada.alt[0]);
      const topo = camada.base - alt;
      predios += `<rect x="${x.toFixed(0)}" y="${topo.toFixed(0)}" width="${larg.toFixed(0)}" height="${(alt + 200).toFixed(0)}" fill="${camada.cor}"/>`;
      if (rnd() > .7) predios += `<rect x="${(x + larg / 2 - 2).toFixed(0)}" y="${(topo - 40).toFixed(0)}" width="4" height="40" fill="${camada.cor}"/>`;
      for (let jy = topo + 14; jy < camada.base - 10; jy += 18) {
        for (let jx = x + 8; jx < x + larg - 10; jx += 14) {
          if (rnd() < camada.luz) janelas += `<rect x="${jx.toFixed(0)}" y="${jy.toFixed(0)}" width="6" height="8" fill="${rnd() > .2 ? '#f2c96b' : '#9fd4ff'}" opacity="${(.45 + rnd() * .5).toFixed(2)}"/>`;
        }
      }
      x += larg + 4 + rnd() * 10;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice">
  <defs><linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#07080d"/><stop offset=".55" stop-color="#141a2c"/><stop offset="1" stop-color="#3a2b1a"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#ceu)"/>${predios}${janelas}</svg>`;
  return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
}

// Reduz a foto escolhida para 256×256 (recorte central) em JPEG
export function prepararFoto(arquivo) {
  return new Promise((ok, falha) => {
    if (!arquivo || !arquivo.type.startsWith('image/')) return falha(new Error('Escolha um arquivo de imagem.'));
    const leitor = new FileReader();
    leitor.onerror = () => falha(new Error('Não foi possível ler a imagem.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => falha(new Error('Esse formato de imagem não abriu. Tente uma foto JPG ou PNG.'));
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const c = document.createElement('canvas'); c.width = c.height = 256;
        c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
        ok(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}
