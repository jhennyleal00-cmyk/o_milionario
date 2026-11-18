// Mercado de Ações: leilões (disputas), finalizar negociações, empresas por
// setor (gráfico, dono, disputar, comprar/vender) e o fórum.
import { rpc } from './db.js';
import { el, real, toast, modal, confirmar, icone } from './ui.js';
import { marca } from './logos.js';
import { SETORES } from './regras.js';
import { miniGrafico, variacao } from './graficos.js';
import { garantirFotos, foto as fotoDe } from './fotos.js';

const ORDEM_SETORES = ['energia', 'tecnologia', 'varejo', 'financas', 'recursos', 'saude'];
const NOME_CURTO = { energia: 'Energia', tecnologia: 'Tecnologia', varejo: 'Varejo', financas: 'Finanças', recursos: 'Recursos', saude: 'Bem-estar' };

export function criarMercado({ token, abrirEmpresa, obterInfo, aoMudar }) {
  let aberto = false, dados = null, buscando = false, pendente = false, ultimoForum = 0;
  let abaLeiloes = 'minhas', setor = 'energia', abaMovel = 'empresas';

  const chip = el('span', { class: 'chip' });
  const vCarteira = el('strong', {});
  const abasMovel = el('div', { class: 'abas mercado-abas-movel', role: 'tablist' },
    ...[['empresas', 'Mercado'], ['forum', 'Fórum']].map(([id, txt]) =>
      el('button', { class: 'aba', 'data-movel': id, onclick: () => { abaMovel = id; desenhar(); } }, txt)));
  const cabecalho = el('header', { class: 'mercado-topo' },
    el('div', { class: 'mercado-titulo' }, icone('mercado', 22), el('h2', {}, 'Mercado de Ações'), chip),
    el('div', { class: 'mercado-carteira' }, el('span', {}, 'Carteira'), vCarteira),
    abasMovel,
    el('button', { class: 'btn-icone', 'aria-label': 'Fechar o mercado', onclick: () => fechar() }, icone('fechar', 18)));

  const listaLeiloes = el('div', { class: 'leiloes-lista' });
  const abasLeiloes = el('div', { class: 'abas abas-leiloes', role: 'tablist' });
  const barra = el('div', { class: 'mercado-barra' });
  const abasSetor = el('div', { class: 'abas abas-setor', role: 'tablist' });
  const grade = el('div', { class: 'empresas-grade' });
  const listaForum = el('ol', { class: 'forum-lista', 'aria-live': 'polite' });

  const principal = el('div', { class: 'mercado-principal' },
    el('section', { class: 'leiloes' }, el('h3', {}, 'Leilões'), abasLeiloes, listaLeiloes),
    barra,
    el('section', { class: 'empresas' }, el('h3', {}, 'Empresas'), abasSetor, grade));
  const forum = el('aside', { class: 'forum' }, el('h3', {}, 'Fórum das ações'), listaForum);
  const raiz = el('section', { class: 'mercado', hidden: true, 'aria-label': 'Mercado de Ações' },
    cabecalho, el('div', { class: 'mercado-corpo' }, principal, forum));

  // ------------------------------------------------------------------
  function abrir() { aberto = true; raiz.hidden = false; document.body.classList.add('mercado-aberto'); carregar(); }
  function fechar() { aberto = false; raiz.hidden = true; document.body.classList.remove('mercado-aberto'); }

  async function carregar() {
    if (!aberto) return;
    if (buscando) { pendente = true; return; }
    buscando = true;
    try {
      dados = await rpc('mercado_estado', { p_token: token() });
      if (dados) {
        const ids = new Set();
        dados.empresas.forEach((e) => e.dono_id && ids.add(e.dono_id));
        dados.disputas.forEach((d) => d.participantes.forEach((p) => ids.add(p.jogador_id)));
        await garantirFotos(dados.sala.id, [...ids]);
        desenhar();
      }
    } catch (e) { toast(e.message, 'erro'); }
    buscando = false;
    if (pendente) { pendente = false; carregar(); }
  }

  async function acao(fn, args, msgOk) {
    try {
      dados = await rpc(fn, { p_token: token(), ...args });
      desenhar();
      if (msgOk) toast(msgOk, 'ok');
      aoMudar?.();
    } catch (e) { toast(e.message, 'erro'); }
  }

  // ------------------------------------------------------------------
  function desenhar() {
    if (!dados) return;
    const { sala, eu, empresas, disputas } = dados;
    const podeNegociar = sala.fase === 'mercado' && !eu.finalizou && !eu.eliminado;
    chip.textContent = sala.fase === 'mercado' ? (eu.finalizou ? 'Você finalizou' : 'Aberto') : 'Fechado · leilões';
    chip.className = 'chip ' + (sala.fase === 'mercado' && !eu.finalizou ? 'chip-ok' : 'chip-espera');
    vCarteira.textContent = real(eu.carteira);
    vCarteira.classList.toggle('negativo', Number(eu.carteira) < 0);
    raiz.dataset.movel = abaMovel;
    abasMovel.querySelectorAll('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.movel === abaMovel));

    const porEmpresa = Object.fromEntries(empresas.map((e) => [e.id, e]));
    const disputaDe = Object.fromEntries(disputas.map((d) => [d.empresa_id, d]));
    const minhas = disputas.filter((d) => d.participantes.some((p) => p.jogador_id === eu.id));
    const outras = disputas.filter((d) => !d.participantes.some((p) => p.jogador_id === eu.id));

    // ---- leilões
    abasLeiloes.replaceChildren(
      ...[['minhas', `Meus leilões (${minhas.length})`], ['outras', `Outros leilões (${outras.length})`]].map(([id, txt]) =>
        el('button', { class: 'aba' + (abaLeiloes === id ? ' ativa' : ''), onclick: () => { abaLeiloes = id; desenhar(); } }, txt)));
    const lista = abaLeiloes === 'minhas' ? minhas : outras;
    listaLeiloes.replaceChildren(...(lista.length ? lista.map((d) => cartaoDisputa(d, porEmpresa[d.empresa_id], minhas, podeNegociar)).filter(Boolean)
      : [el('p', { class: 'texto-suave vazio' }, abaLeiloes === 'minhas'
        ? 'Você não está em nenhuma disputa. Aperte “Disputar” numa empresa para colocá-la em leilão.'
        : 'Nenhuma outra empresa está em disputa agora.')]));

    // ---- barra de finalizar
    const ativos = dados.jogadores, prontos = ativos.filter((j) => j.finalizou);
    if (sala.fase !== 'mercado') {
      barra.replaceChildren(el('p', {}, el('strong', {}, 'O mercado fechou.'), ' Os leilões desta rodada acontecem agora (os lances ao vivo chegam na Etapa 5).'));
    } else if (eu.finalizou) {
      const faltam = ativos.filter((j) => !j.finalizou).map((j) => j.nome);
      barra.replaceChildren(el('p', {}, el('strong', {}, 'Você finalizou as negociações.'), ` Aguardando: ${faltam.join(', ') || '—'}.`));
    } else {
      barra.replaceChildren(
        el('p', {}, `${prontos.length} de ${ativos.length} jogadores finalizaram.`),
        el('button', {
          class: 'btn btn-ouro', disabled: !podeNegociar,
          onclick: async () => {
            const ok = await confirmar('Finalizar negociações?',
              'Depois de finalizar você não pode mais disputar, comprar nem vender nesta rodada. O mercado fecha quando todos finalizarem.', 'Finalizar');
            if (ok) acao('finalizar_negociacoes', {}, 'Negociações finalizadas.');
          },
        }, 'Finalizar negociações'));
    }

    // ---- empresas por setor
    abasSetor.replaceChildren(...ORDEM_SETORES.map((s) => el('button', {
      class: 'aba' + (setor === s ? ' ativa' : ''), style: `--cor:${SETORES[s].cor}`, title: SETORES[s].nome,
      onclick: () => { setor = s; desenhar(); },
    }, el('span', { class: 'ponto-setor' }), NOME_CURTO[s])));
    const info = obterInfo();
    const series = Object.fromEntries((info?.empresas || []).map((e) => [e.id, (e.serie || []).map(Number)]));
    grade.replaceChildren(...empresas.filter((e) => e.setor === setor).map((e) => cartaoEmpresa(e, disputaDe[e.id], eu, podeNegociar, series[e.id])));

    // ---- fórum
    const novos = dados.forum.length ? dados.forum[dados.forum.length - 1].id : 0;
    const noFim = listaForum.scrollHeight - listaForum.scrollTop - listaForum.clientHeight < 40;
    listaForum.replaceChildren(...(dados.forum.length ? dados.forum.map((f) => el('li', { class: `forum-${f.tipo}` },
      el('span', { class: 'forum-hora' }, `${f.rodada}ª · ${new Date(f.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`),
      el('span', {}, f.texto))) : [el('li', { class: 'texto-suave' }, 'Nada por aqui ainda.')]));
    if (novos !== ultimoForum && (noFim || !ultimoForum)) listaForum.scrollTop = listaForum.scrollHeight;
    ultimoForum = novos;
  }

  function cartaoDisputa(d, emp, minhas, podeNegociar) {
    const eu = dados.eu;
    const ordemMinha = minhas.findIndex((x) => x.id === d.id);
    const meu = d.participantes.find((p) => p.jogador_id === eu.id);
    return el('article', { class: 'disputa' },
      el('header', {},
        el('img', { src: marca(d.empresa_id), alt: '' }),
        el('div', {}, el('strong', {}, emp?.nome || d.empresa_id),
          el('span', { class: 'texto-mini' }, emp?.dono_id ? `Dono: ${emp.dono_nome} · ${emp.acoes_dono} ações` : 'Disponível')),
        ordemMinha >= 0 ? el('span', { class: 'chip chip-espera', title: 'Ordem dos seus leilões' }, `Seu ${ordemMinha + 1}º`) : null),
      el('ol', { class: 'participantes' }, d.participantes.map((p, i) => el('li', {},
        el('img', { src: fotoDe(p.jogador_id), alt: '' }),
        el('span', {}, p.nome),
        p.papel === 'dono' ? el('span', { class: 'chip chip-ok' }, 'dono')
          : (p.jogador_id === d.criador_id ? el('span', { class: 'texto-mini' }, 'primeiro lance') : null)))),
      el('p', { class: 'texto-mini disputa-status' }, d.status === 'aberta'
        ? 'Os lances começam quando o mercado fechar.' : 'Leilão desta rodada.'),
      meu && meu.papel !== 'dono' && podeNegociar && d.status === 'aberta'
        ? el('button', { class: 'btn btn-mini btn-fantasma', onclick: () => acao('sair_disputa', { p_disputa: d.id }) }, 'Sair da disputa') : null);
  }

  function cartaoEmpresa(e, disputa, eu, podeNegociar, serie) {
    const souDono = e.dono_id === eu.id;
    const souParticipante = disputa?.participantes.some((p) => p.jogador_id === eu.id && p.papel !== 'dono');
    const pct = e.anterior ? (e.preco / e.anterior - 1) * 100 : 0;
    let botoes;
    if (souDono) {
      botoes = [
        el('button', { class: 'btn btn-mini btn-ouro', disabled: !podeNegociar, onclick: () => negociar('comprar', e) }, 'Comprar'),
        el('button', { class: 'btn btn-mini btn-fantasma', disabled: !podeNegociar, onclick: () => negociar('vender', e) }, 'Vender'),
      ];
    } else if (souParticipante) {
      botoes = [el('button', { class: 'btn btn-mini btn-fantasma', disabled: !podeNegociar, onclick: () => acao('sair_disputa', { p_disputa: disputa.id }) }, 'Sair da disputa')];
    } else {
      botoes = [el('button', {
        class: 'btn btn-mini btn-ouro', disabled: !podeNegociar,
        onclick: () => acao('disputar', { p_empresa: e.id }, disputa ? 'Você entrou na disputa.' : 'Empresa colocada em disputa.'),
      }, disputa ? 'Disputar também' : 'Disputar')];
    }
    return el('article', { class: 'emp-cartao' + (souDono ? ' meu' : '') },
      el('header', {},
        el('img', { src: marca(e.id), alt: '' }),
        el('strong', {}, e.nome),
        disputa ? el('span', { class: 'chip chip-espera' }, 'Em disputa') : null),
      el('button', { class: 'emp-grafico', 'aria-label': `Ver o gráfico da ${e.nome}`, onclick: () => abrirEmpresa(e.id) },
        serie && serie.length > 1 ? miniGrafico(serie, 200, 46) : el('span', { class: 'texto-mini' }, 'Ver detalhes')),
      el('div', { class: 'emp-preco' }, el('span', {}, el('small', {}, '1 ação'), el('b', {}, real(e.preco))), variacao(pct)),
      e.dono_id
        ? el('div', { class: 'emp-dono' }, el('img', { src: fotoDe(e.dono_id), alt: '' }),
          el('span', {}, souDono ? 'Você' : e.dono_nome, el('small', {}, `${e.acoes_dono} ${e.acoes_dono === 1 ? 'ação' : 'ações'}`)))
        : el('div', { class: 'emp-dono livre' }, el('span', { class: 'chip chip-ok' }, 'Disponível')),
      el('div', { class: 'emp-botoes' }, botoes));
  }

  // Comprar / vender (só o dono)
  function negociar(tipo, e) {
    const total = dados.sala.total_acoes, preco = Number(e.preco), carteira = Number(dados.eu.carteira);
    const max = tipo === 'comprar' ? Math.max(0, Math.min(total - e.acoes_dono, Math.floor(carteira / preco))) : e.acoes_dono;
    if (max < 1) { toast(tipo === 'comprar' ? 'Sem dinheiro ou sem ações disponíveis para comprar.' : 'Você não tem ações para vender.', 'aviso'); return; }
    const campo = el('input', { class: 'campo campo-qtd', type: 'number', min: '1', max: String(max), value: '1', inputmode: 'numeric' });
    const resumo = el('p', { class: 'qtd-resumo' });
    const ajustar = (v) => { campo.value = String(Math.max(1, Math.min(max, Math.floor(Number(v) || 1)))); atualizar(); };
    const atualizar = () => {
      const q = Math.max(1, Math.min(max, Math.floor(Number(campo.value) || 1)));
      const valor = q * preco;
      resumo.replaceChildren(
        el('span', {}, tipo === 'comprar' ? 'Custo' : 'Você recebe'), el('strong', {}, real(valor)),
        el('span', {}, 'Carteira depois'), el('strong', {}, real(tipo === 'comprar' ? carteira - valor : carteira + valor)),
        ...(tipo === 'vender' && q === e.acoes_dono ? [el('em', {}, 'Vendendo tudo, a empresa volta a ficar disponível.')] : []));
    };
    campo.addEventListener('input', atualizar);
    atualizar();
    modal({
      titulo: `${tipo === 'comprar' ? 'Comprar' : 'Vender'} ações da ${e.nome}`, classe: 'modal-qtd',
      conteudo: el('div', { class: 'qtd' },
        el('p', { class: 'texto-suave' }, `1 ação = ${real(preco)} · você tem ${e.acoes_dono} de ${total} ações`),
        el('div', { class: 'qtd-linha' },
          el('button', { class: 'btn btn-fantasma', 'aria-label': 'Menos', onclick: () => ajustar(Number(campo.value) - 1) }, '−'),
          campo,
          el('button', { class: 'btn btn-fantasma', 'aria-label': 'Mais', onclick: () => ajustar(Number(campo.value) + 1) }, '+'),
          el('button', { class: 'btn btn-fantasma', onclick: () => ajustar(max) }, `Máx. ${max}`)),
        resumo),
      botoes: [
        { texto: 'Cancelar', classe: 'btn-fantasma' },
        {
          texto: tipo === 'comprar' ? 'Comprar' : 'Vender', classe: 'btn-ouro',
          acao: (f) => { const q = Math.max(1, Math.min(max, Math.floor(Number(campo.value) || 1))); f(); acao(tipo === 'comprar' ? 'comprar_acoes' : 'vender_acoes', { p_empresa: e.id, p_qtd: q }, tipo === 'comprar' ? 'Compra feita.' : 'Venda feita.'); },
        },
      ],
    });
  }

  return { raiz, abrir, fechar, alternar: () => (aberto ? fechar() : abrir()), atualizar: () => aberto && carregar(), get aberto() { return aberto; } };
}
