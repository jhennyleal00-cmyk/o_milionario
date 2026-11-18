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
  let desvio = 0, laco = null, relogio = null;   // desvio = relógio do servidor - relógio do aparelho
  const valores = {};                              // lance digitado em cada leilão
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
  function abrir() {
    aberto = true; raiz.hidden = false; document.body.classList.add('mercado-aberto'); carregar();
    clearInterval(laco); laco = setInterval(() => { if (dados?.sala.fase === 'leiloes') carregar(); }, 1000);
    clearInterval(relogio); relogio = setInterval(atualizarRelogios, 250);
  }
  function fechar() {
    aberto = false; raiz.hidden = true; document.body.classList.remove('mercado-aberto');
    clearInterval(laco); clearInterval(relogio);
  }

  function atualizarRelogios() {
    const agora = Date.now() + desvio;
    raiz.querySelectorAll('[data-prazo]').forEach((n) => {
      const total = Number(n.dataset.total) * 1000;
      const resta = Math.max(0, new Date(n.dataset.prazo).getTime() - agora);
      const seg = Math.ceil(resta / 1000);
      n.querySelector('.cron-num').textContent = `0:${String(seg).padStart(2, '0')}`;
      n.querySelector('.cron-barra i').style.width = `${Math.min(100, (resta / total) * 100)}%`;
      n.classList.toggle('urgente', seg <= 5);
    });
  }

  async function carregar() {
    if (!aberto) return;
    if (buscando) { pendente = true; return; }
    buscando = true;
    try {
      const antes = Date.now();
      dados = await rpc('mercado_estado', { p_token: token() });
      if (dados) {
        desvio = new Date(dados.agora).getTime() - (antes + Date.now()) / 2;
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
      if (fn === 'dar_lance') delete valores[args.p_disputa];
      desenhar();
      if (msgOk) toast(msgOk, 'ok');
      aoMudar?.();
    } catch (e) { toast(e.message, 'erro'); }
  }

  // ------------------------------------------------------------------
  function desenhar() {
    if (!dados) return;
    const foco = document.activeElement;
    const focoLance = foco && foco.dataset && foco.dataset.lance ? { id: foco.dataset.lance, pos: foco.selectionStart } : null;
    desenharTudo();
    if (focoLance) {
      const n = raiz.querySelector(`input[data-lance="${focoLance.id}"]`);
      if (n) { n.focus(); try { n.setSelectionRange(focoLance.pos, focoLance.pos); } catch { /* campo numérico */ } }
    }
    atualizarRelogios();
  }

  function desenharTudo() {
    const { sala, eu, empresas, disputas } = dados;
    const podeNegociar = sala.fase === 'mercado' && !eu.finalizou && !eu.eliminado;
    chip.textContent = sala.fase === 'mercado' ? (eu.finalizou ? 'Você finalizou' : 'Aberto') : 'Leilões ao vivo';
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
      const faltam = disputas.filter((d) => d.status === 'leilao').length;
      barra.replaceChildren(el('p', {}, el('strong', {}, 'O mercado fechou: leilões ao vivo.'),
        faltam ? ` ${faltam} ${faltam === 1 ? 'leilão em andamento' : 'leilões em andamento'}. Quando todos terminarem, começa a próxima rodada.` : ' Encerrando a rodada…'));
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
    const ativos = minhas.filter((x) => x.status !== 'encerrada');
    const ordemMinha = ativos.findIndex((x) => x.id === d.id);
    const meu = d.participantes.find((p) => p.jogador_id === eu.id);
    const aoVivo = d.status === 'leilao';
    const preco = Number(emp?.preco || 0);
    const baseDono = emp?.dono_id ? Number(emp.acoes_dono) : 0;

    // situação do leilão
    let situacao;
    if (d.status === 'aberta') situacao = el('p', { class: 'texto-mini disputa-status' }, 'Os lances começam quando o mercado fechar.');
    else if (d.status === 'encerrada') situacao = el('p', { class: 'disputa-resultado' }, icone('coroa', 16), d.resultado || 'Leilão encerrado.');
    else if (d.estado === 'espera') {
      const ocupados = d.participantes.filter((p) => p.ocupado_em);
      situacao = el('p', { class: 'disputa-status espera' }, ocupados.length
        ? `Aguardando ${ocupados.map((p) => `${p.nome} (no leilão da ${p.ocupado_em})`).join(', ')}.`
        : 'Começando…');
    } else if (d.estado === 'abertura') {
      const abridor = d.participantes.find((p) => p.jogador_id === d.abridor_id);
      situacao = el('div', { class: 'disputa-status' },
        el('p', {}, 'Lance de abertura: ', el('strong', {}, abridor?.nome || '—'),
          baseDono ? ` (mínimo ${baseDono + 1} ações, o dono tem ${baseDono})` : ' (mínimo 1 ação)'),
        cronometro(d.prazo, 30));
    } else {
      situacao = el('div', { class: 'disputa-status' },
        el('p', { class: 'lance-atual' }, el('span', {}, 'Lance atual'),
          el('strong', {}, `${d.lance} ${d.lance === 1 ? 'ação' : 'ações'}`),
          el('span', {}, `de ${d.lider_nome} · ${real(d.lance * preco)}`)),
        cronometro(d.prazo, 20));
    }

    // lance (só quem está no leilão e pode lançar agora)
    let controles = null;
    if (aoVivo && meu && ['abertura', 'lances'].includes(d.estado) && d.lider_id !== eu.id &&
        (d.estado === 'lances' || d.abridor_id === eu.id)) {
      const minimo = Math.max(Number(d.lance || 0), baseDono) + 1;
      const base = meu.papel === 'dono' ? baseDono : 0;
      const campo = el('input', { class: 'campo campo-lance', type: 'number', inputmode: 'numeric', min: String(minimo), max: String(dados.sala.total_acoes), 'data-lance': String(d.id) });
      campo.value = String(Math.max(minimo, Number(valores[d.id] || 0)));
      const custo = el('span', { class: 'texto-mini' });
      const mostrarCusto = () => {
        const q = Math.floor(Number(campo.value) || 0);
        valores[d.id] = q;
        custo.textContent = q - base > 0 ? `custa ${real((q - base) * preco)} · carteira ${real(eu.carteira)}` : '';
      };
      campo.addEventListener('input', mostrarCusto);
      mostrarCusto();
      const somar = (n) => { campo.value = String(Math.max(minimo, (Math.floor(Number(campo.value) || 0)) + n)); mostrarCusto(); };
      controles = el('div', { class: 'lance-controles' },
        meu.papel === 'dono' ? el('p', { class: 'texto-mini' }, `Você é o dono: suas ${baseDono} ações já são a sua oferta. Para defender, cubra o lance.`) : null,
        el('div', { class: 'lance-linha' },
          campo,
          el('button', { class: 'btn btn-mini btn-ouro', onclick: () => acao('dar_lance', { p_disputa: d.id, p_qtd: Math.floor(Number(campo.value) || 0) }) }, 'Dar lance')),
        el('div', { class: 'lance-rapido' },
          el('button', { class: 'btn btn-mini btn-fantasma', onclick: () => { campo.value = String(minimo); mostrarCusto(); } }, `Mín. ${minimo}`),
          el('button', { class: 'btn btn-mini btn-fantasma', onclick: () => somar(5) }, '+5'),
          el('button', { class: 'btn btn-mini btn-fantasma', onclick: () => somar(10) }, '+10'),
          el('button', { class: 'btn btn-mini btn-fantasma', onclick: () => somar(50) }, '+50')),
        custo);
    } else if (aoVivo && meu && d.lider_id === eu.id) {
      controles = el('p', { class: 'lance-meu' }, 'Seu lance é o maior. Se ninguém cobrir até o fim do tempo, a empresa é sua.');
    }

    const podeSair = meu && meu.papel !== 'dono' && !meu.deu_lance &&
      ((d.status === 'aberta' && podeNegociar) || (aoVivo && d.estado !== 'encerrado'));
    return el('article', { class: `disputa estado-${d.status === 'encerrada' ? 'encerrado' : d.status === 'aberta' ? 'aberta' : d.estado}` + (meu ? ' minha' : '') },
      el('header', {},
        el('img', { src: marca(d.empresa_id), alt: '' }),
        el('div', {}, el('strong', {}, emp?.nome || d.empresa_id),
          el('span', { class: 'texto-mini' }, emp?.dono_id ? `Dono: ${emp.dono_nome} · ${emp.acoes_dono} ações` : 'Disponível')),
        ordemMinha >= 0 && d.status !== 'encerrada' ? el('span', { class: 'chip chip-espera', title: 'Ordem dos seus leilões' }, `Seu ${ordemMinha + 1}º`) : null),
      situacao,
      el('ol', { class: 'participantes' }, d.participantes.map((p) => el('li', { class: p.jogador_id === d.lider_id ? 'lider' : '' },
        el('img', { src: fotoDe(p.jogador_id), alt: '' }),
        el('span', {}, p.nome),
        p.papel === 'dono' ? el('span', { class: 'chip chip-ok' }, 'dono')
          : p.jogador_id === d.lider_id ? el('span', { class: 'chip chip-espera' }, 'na frente')
          : p.deu_lance ? el('span', { class: 'texto-mini' }, 'deu lance')
          : (p.jogador_id === d.criador_id && d.status === 'aberta' ? el('span', { class: 'texto-mini' }, 'primeiro lance') : null)))),
      controles,
      podeSair ? el('button', {
        class: 'btn btn-mini btn-fantasma',
        onclick: () => acao(aoVivo ? 'sair_leilao' : 'sair_disputa', { p_disputa: d.id }),
      }, aoVivo ? 'Sair do leilão' : 'Sair da disputa') : null);
  }

  function cronometro(prazo, total) {
    if (!prazo) return null;
    return el('div', { class: 'cronometro', 'data-prazo': prazo, 'data-total': String(total) },
      el('span', { class: 'cron-num' }, ''), el('span', { class: 'cron-barra' }, el('i', {})));
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

  return {
    raiz, abrir, fechar,
    abrirLeiloes: () => { abaLeiloes = 'minhas'; if (!aberto) abrir(); else carregar(); },
    alternar: () => (aberto ? fechar() : abrir()),
    atualizar: () => aberto && carregar(),
    get aberto() { return aberto; },
  };
}
