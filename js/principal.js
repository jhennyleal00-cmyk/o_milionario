// Tela principal da partida (Etapa 1: cartão do jogador, inflação, faixa de
// notícias, linha das rodadas, ranking, ajuda). A cidade animada, as notícias,
// o Mercado de Ações e o Banqueiro entram nas próximas etapas.
import { rpc } from './db.js';
import { el, real, realCurto, realCompacto, toast, modal, icone } from './ui.js';
import { fotoSrc } from './avatares.js';
import { SETORES, textoAjuda } from './regras.js';

export function criarPrincipal({ token }) {
  let est = null;
  let abaRanking = 'ricos';
  let ultimoRanking = 0, buscandoRanking = false, dadosRanking = null;

  // --- cartão do jogador ---
  const foto = el('img', { class: 'cartao-foto', alt: '' });
  const nome = el('strong', { class: 'cartao-nome' });
  const vCarteira = el('span', { class: 'valor', 'data-campo': 'carteira' });
  const vPatrimonio = el('span', { class: 'valor', 'data-campo': 'patrimonio' });
  const btnOlho = el('button', { class: 'btn-icone', 'aria-label': 'Ocultar meus valores no ranking', onclick: alternarOculto });
  const btnGrafico = el('button', { class: 'btn-icone', 'aria-label': 'Ver meu progresso até a meta', onclick: abrirProgresso }, icone('grafico'));
  const avisoOculto = el('span', { class: 'cartao-oculto' }, 'Oculto no ranking');

  const cartao = el('section', { class: 'painel cartao-jogador' },
    foto,
    el('div', { class: 'cartao-dados' },
      el('div', { class: 'cartao-topo' }, nome, el('div', { class: 'cartao-botoes' }, btnOlho, btnGrafico)),
      el('div', { class: 'linha-valor' }, el('span', {}, 'Carteira'), vCarteira),
      el('div', { class: 'linha-valor' }, el('span', {}, 'Patrimônio'), vPatrimonio),
      avisoOculto));

  const inflacao = el('section', { class: 'painel caixa-inflacao' },
    el('span', { class: 'rotulo-pequeno' }, 'Inflação'),
    el('strong', { class: 'inflacao-valor' }, '—'),
    el('span', { class: 'texto-mini' }, 'atualiza depois das notícias'));

  // --- faixa de notícias e linha das rodadas ---
  const textoFaixa = 'Neópolis abre os negócios  ·  As notícias de cada rodada passam por esta faixa  ·  Fique de olho nas manchetes antes de investir  ·  ';
  const faixa = el('div', { class: 'painel faixa-noticias', 'aria-label': 'Notícias da rodada' },
    el('span', { class: 'faixa-etiqueta' }, 'NOTÍCIAS'),
    el('div', { class: 'faixa-janela' }, el('div', { class: 'faixa-texto' }, el('span', {}, textoFaixa), el('span', {}, textoFaixa))));
  const linhaRodadas = el('ol', { class: 'linha-rodadas', 'aria-label': 'Rodadas' });
  const topo = el('div', { class: 'topo' }, faixa, linhaRodadas);

  // --- direita: banqueiro + ranking ---
  const btnBanqueiro = el('button', {
    class: 'btn-redondo btn-banqueiro', 'aria-label': 'Banqueiro',
    onclick: () => toast('O Banqueiro abre na Etapa 6.', 'info'),
  }, icone('banco', 30), el('span', {}, 'Banqueiro'));

  const corpoRanking = el('div', { class: 'ranking-corpo' });
  const abas = el('div', { class: 'abas', role: 'tablist' },
    ...[['ricos', 'Mais ricos'], ['empresas', 'Empresas']].map(([id, txt]) =>
      el('button', { class: 'aba', role: 'tab', 'data-aba': id, onclick: () => { abaRanking = id; desenharRanking(); } }, txt)));
  const ranking = el('section', { class: 'painel ranking' }, el('h2', { class: 'painel-titulo' }, 'Ranking'), abas, corpoRanking);

  // --- base: mercado e ajuda ---
  const btnMercado = el('button', {
    class: 'btn-redondo btn-mercado', 'aria-label': 'Mercado de Ações',
    onclick: () => toast('O Mercado de Ações abre na Etapa 4.', 'info'),
  }, icone('mercado', 38), el('span', {}, 'Mercado de Ações'));
  const btnAjuda = el('button', {
    class: 'btn-ajuda', 'aria-label': 'Ajuda',
    onclick: () => modal({ titulo: 'Como jogar', conteudo: textoAjuda(est.sala), classe: 'modal-largo', botoes: [{ texto: 'Fechar', classe: 'btn-ouro' }] }),
  }, icone('ajuda', 24), el('span', {}, 'Ajuda'));
  const linkAdmin = localStorage.getItem('milionario.admin')
    ? el('a', { class: 'link-admin-jogo', href: 'admin.html', target: '_blank' }, 'Painel do administrador') : null;

  const raiz = el('main', { class: 'jogo' },
    el('div', { class: 'cidade', 'aria-hidden': 'true' }),
    el('div', { class: 'coluna-esq' }, cartao, inflacao),
    topo,
    el('div', { class: 'coluna-dir' }, btnBanqueiro, ranking),
    btnMercado, btnAjuda, linkAdmin);

  // -------------------------------------------------------------------
  function atualizar(novo) {
    est = novo;
    const { eu, sala } = est;
    foto.src = fotoSrc(eu.foto);
    nome.textContent = eu.nome;
    vCarteira.textContent = real(eu.carteira);
    vCarteira.classList.toggle('negativo', Number(eu.carteira) < 0);
    vPatrimonio.textContent = real(eu.patrimonio);
    btnOlho.replaceChildren(icone(eu.oculto ? 'olhoFechado' : 'olho'));
    btnOlho.setAttribute('aria-label', eu.oculto ? 'Mostrar meus valores no ranking' : 'Ocultar meus valores no ranking');
    btnOlho.classList.toggle('ativo', eu.oculto);
    avisoOculto.hidden = !eu.oculto;

    if (linhaRodadas.dataset.rodada !== String(sala.rodada)) {
      linhaRodadas.dataset.rodada = sala.rodada;
      linhaRodadas.replaceChildren(...Array.from({ length: 30 }, (_, i) => {
        const n = sala.rodada + i;
        return el('li', { class: 'rodada' + (i === 0 ? ' atual' : '') }, i === 0 ? `Rodada ${n}` : String(n));
      }));
    }
    if (Date.now() - ultimoRanking > 3000) carregarRanking();
  }

  async function carregarRanking() {
    if (buscandoRanking || !est) return;
    buscandoRanking = true; ultimoRanking = Date.now();
    try { dadosRanking = await rpc('ranking', { p_sala: est.sala.id }); desenharRanking(); }
    catch { /* próxima atualização tenta de novo */ }
    finally { buscandoRanking = false; }
  }

  function desenharRanking() {
    abas.querySelectorAll('.aba').forEach((b) => {
      const sel = b.dataset.aba === abaRanking;
      b.classList.toggle('ativa', sel); b.setAttribute('aria-selected', sel);
    });
    if (!dadosRanking) return;
    if (abaRanking === 'ricos') {
      corpoRanking.replaceChildren(...dadosRanking.ricos.map((r) => el('div', { class: 'rank-linha' + (r.id === est.eu.id ? ' sou-eu' : '') },
        el('span', { class: 'rank-pos' }, `${r.posicao}º`),
        el('img', { class: 'rank-foto', src: fotoSrc(r.foto), alt: '' }),
        el('div', { class: 'rank-info' },
          el('strong', {}, r.nome),
          r.oculto
            ? el('span', { class: 'rank-sub oculto' }, 'Valores ocultos')
            : el('span', { class: 'rank-sub' }, [`Carteira ${realCompacto(r.carteira)}`, `Patrimônio ${realCompacto(r.patrimonio)}`].map((t) => t.replace(/ /g, '\u00a0')).join(' · '))),
        el('span', { class: 'rank-total' }, r.oculto ? '••••' : 'R$ ' + realCompacto(r.total)))));
    } else {
      corpoRanking.replaceChildren(...dadosRanking.empresas.map((e) => el('div', { class: 'rank-linha' },
        el('span', { class: 'rank-pos' }, `${e.posicao}º`),
        el('span', { class: 'rank-selo', style: `--cor:${SETORES[e.setor]?.cor || '#888'}` }, iniciais(e.nome)),
        el('div', { class: 'rank-info' },
          el('strong', {}, e.nome),
          el('span', { class: 'rank-sub' }, e.dono_nome ? `Dono: ${e.dono_nome} · ${e.acoes_dono} ações` : 'Disponível')),
        el('div', { class: 'rank-valores' },
          el('span', { class: 'rank-total' }, real(e.preco)),
          el('span', { class: 'rank-mini' }, 'por ação')))));
    }
  }

  async function alternarOculto() {
    btnOlho.disabled = true;
    try {
      const eu = await rpc('alternar_oculto', { p_token: token() });
      atualizar({ ...est, eu: { ...est.eu, ...eu, sala: est.sala } });
      ultimoRanking = 0; carregarRanking();
    } catch (e) { toast(e.message, 'erro'); }
    btnOlho.disabled = false;
  }

  function abrirProgresso() {
    const { eu, sala } = est;
    const total = Number(eu.carteira) + Number(eu.patrimonio) - Number(eu.dividas || 0);
    const falta = Math.max(0, Number(sala.meta) - total);
    const pct = Math.max(0, Math.min(100, (total / Number(sala.meta)) * 100));
    modal({
      titulo: 'Rumo ao milhão',
      conteudo: el('div', { class: 'progresso' },
        el('div', { class: 'progresso-linha' }, el('span', {}, 'Carteira + patrimônio'), el('strong', {}, real(Number(eu.carteira) + Number(eu.patrimonio)))),
        el('div', { class: 'progresso-linha' }, el('span', {}, 'Dívidas'), el('strong', {}, real(eu.dividas || 0))),
        el('div', { class: 'progresso-linha destaque' }, el('span', {}, 'Total'), el('strong', {}, real(total))),
        el('div', { class: 'progresso-linha' }, el('span', {}, 'Alvo'), el('strong', {}, real(sala.meta))),
        el('div', { class: 'barra' }, el('div', { class: 'barra-cheia', style: `width:${pct.toFixed(1)}%` })),
        el('p', { class: 'progresso-falta' }, falta > 0 ? `Faltam ${real(falta)} (${pct.toFixed(1).replace('.', ',')}% do caminho)` : 'Você chegou ao alvo!')),
      botoes: [{ texto: 'Fechar', classe: 'btn-ouro' }],
    });
  }

  return { raiz, atualizar, desmontar: () => {} };
}

function iniciais(nome) {
  const p = nome.replace(/&/g, ' ').split(/\s+/).filter((x) => x.length > 1);
  return (p.length > 1 ? p[0][0] + p[1][0] : nome.slice(0, 2)).toUpperCase();
}
