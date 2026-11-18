// Banqueiro: limite, novo empréstimo e contratos do jogador.
import { rpc } from './db.js';
import { el, real, toast, modal, confirmar, icone } from './ui.js';
import { fmtPct } from './graficos.js';

export async function abrirBanqueiro({ token, aoMudar }) {
  let dados;
  try { dados = await rpc('banco_estado', { p_token: token() }); }
  catch (e) { toast(e.message, 'erro'); return; }
  if (!dados) return;

  let rodadas = 1;
  const corpo = el('div', { class: 'banco' });
  const janela = modal({ titulo: null, conteudo: corpo, classe: 'modal-banco', botoes: [{ texto: 'Fechar', classe: 'btn-fantasma' }] });

  async function acao(fn, args, msg) {
    try {
      dados = await rpc(fn, { p_token: token(), ...args });
      desenhar(); toast(msg, 'ok'); aoMudar?.();
    } catch (e) { toast(e.message, 'erro'); }
  }

  function desenhar() {
    const L = dados.limite;
    const juros = Number(dados.juros);
    const cab = el('header', { class: 'banco-topo' },
      el('div', { class: 'banco-titulo' }, icone('banco', 26), el('h2', { class: 'modal-titulo' }, 'Banqueiro')),
      el('div', { class: 'banco-juros' }, el('span', {}, 'Juros atual'), el('strong', {}, fmtPct(juros, 2))));

    // ---- seu limite
    const cartaoLimite = el('section', { class: 'banco-cartao' },
      el('h3', {}, 'Seu limite'),
      el('div', { class: 'banco-linha' }, el('span', {}, 'Limite'), el('strong', {}, real(L.limite))),
      el('div', { class: 'banco-linha' }, el('span', {}, 'Em uso'), el('strong', {}, real(L.usado))),
      el('div', { class: 'banco-linha destaque' }, el('span', {}, 'Disponível'), el('strong', {}, real(L.disponivel))),
      el('div', { class: 'barra' }, el('div', { class: 'barra-cheia', style: `width:${L.limite > 0 ? Math.min(100, (L.usado / L.limite) * 100) : 0}%` })),
      el('p', { class: 'texto-mini' }, L.congelado
        ? 'Limite congelado enquanto houver contrato aberto. Cada novo empréstimo precisa ser de pelo menos 30% do que sobrou.'
        : 'O limite é 20% acima do seu total (carteira + patrimônio). O empréstimo mínimo é 30% do limite.'));

    // ---- novo empréstimo
    let novo;
    const podePegar = dados.status === 'jogando' && !dados.eliminado && Number(L.disponivel) > 0;
    if (!podePegar) {
      novo = el('section', { class: 'banco-cartao' }, el('h3', {}, 'Novo empréstimo'),
        el('p', { class: 'texto-suave' }, dados.eliminado ? 'Você está fora da partida.' : 'Sem limite disponível agora. Pague um contrato para liberar limite.'));
    } else {
      const min = Number(L.minimo), max = Number(L.disponivel);
      const valor = el('input', { class: 'campo', type: 'number', min: String(min), max: String(max), step: '1000', value: String(Math.round(min)), inputmode: 'numeric', id: 'valor-emprestimo' });
      const deslizar = el('input', { type: 'range', class: 'banco-deslizar', min: String(min), max: String(max), step: String(Math.max(1, Math.round((max - min) / 200))), value: String(min), 'aria-label': 'Valor do empréstimo' });
      const opcoes = el('div', { class: 'banco-rodadas', role: 'radiogroup', 'aria-label': 'Quando pagar' });
      const resumo = el('div', { class: 'banco-resumo' });
      const atualizar = () => {
        const v = Math.min(max, Math.max(0, Number(valor.value) || 0));
        const taxa = Math.max(juros, 18) + 5 * (rodadas - 1);
        resumo.replaceChildren(
          el('span', {}, 'Você recebe agora'), el('strong', {}, real(v)),
          el('span', {}, `Juros (${fmtPct(taxa, 2)})`), el('strong', {}, real(v * taxa / 100)),
          el('span', {}, `Cobrança na ${dados.rodada + rodadas}ª rodada`), el('strong', { class: 'banco-pagar' }, real(v * (1 + taxa / 100))));
        opcoes.querySelectorAll('button').forEach((b) => b.classList.toggle('ativa', Number(b.dataset.n) === rodadas));
      };
      for (let n = 1; n <= 10; n++) {
        opcoes.append(el('button', {
          type: 'button', class: 'banco-rodada', 'data-n': String(n), role: 'radio',
          onclick: () => { rodadas = n; atualizar(); },
        }, el('b', {}, `${n}`), el('small', {}, fmtPct(Math.max(juros, 18) + 5 * (n - 1), 0))));
      }
      valor.addEventListener('input', () => { deslizar.value = valor.value; atualizar(); });
      deslizar.addEventListener('input', () => { valor.value = deslizar.value; atualizar(); });
      atualizar();
      novo = el('section', { class: 'banco-cartao' },
        el('h3', {}, 'Novo empréstimo'),
        el('label', { class: 'rotulo', for: 'valor-emprestimo' }, `Valor (de ${real(min)} a ${real(max)})`),
        valor, deslizar,
        el('p', { class: 'rotulo' }, 'Pagar em quantas rodadas'),
        opcoes,
        el('p', { class: 'texto-mini' }, 'Na rodada seguinte vale o juros atual; cada rodada a mais soma 5 pontos. O juros fica fixo no contrato.'),
        resumo,
        el('button', {
          class: 'btn btn-ouro btn-grande', onclick: async () => {
            const v = Number(valor.value) || 0;
            const taxa = Math.max(juros, 18) + 5 * (rodadas - 1);
            const ok = await confirmar('Assinar o contrato?',
              `Você recebe ${real(v)} agora e paga ${real(v * (1 + taxa / 100))} na ${dados.rodada + rodadas}ª rodada (o valor sai da carteira automaticamente, se você não pagar antes).`, 'Assinar');
            if (ok) acao('pegar_emprestimo', { p_valor: v, p_rodadas: rodadas }, 'Empréstimo feito. O dinheiro já está na sua carteira.');
          },
        }, 'Pegar empréstimo'));
    }

    // ---- contratos
    const contratos = dados.contratos.length
      ? dados.contratos.map((c) => el('article', { class: `contrato contrato-${c.status}` },
        el('div', { class: 'contrato-topo' },
          el('strong', {}, `Contrato nº ${c.numero}`),
          el('span', { class: 'chip ' + (c.status === 'aberto' ? 'chip-espera' : 'chip-ok') },
            c.status === 'aberto' ? 'Não pago' : c.status === 'pago' ? 'Pago' : 'Cobrado')),
        el('dl', {},
          el('dt', {}, 'Valor recebido'), el('dd', {}, real(c.valor)),
          el('dt', {}, 'Valor a pagar'), el('dd', {}, real(c.valor_pagar)),
          el('dt', {}, 'Juros'), el('dd', {}, fmtPct(Number(c.juros), 2)),
          el('dt', {}, 'Cobrança'), el('dd', {}, `${c.rodada_cobranca}ª rodada`)),
        c.status === 'aberto' ? el('button', {
          class: 'btn btn-mini btn-ouro', disabled: Number(dados.carteira) < Number(c.valor_pagar),
          title: Number(dados.carteira) < Number(c.valor_pagar) ? 'Sua carteira não cobre o valor' : null,
          onclick: async () => {
            if (await confirmar('Pagar agora?', `Sai ${real(c.valor_pagar)} da sua carteira e o contrato nº ${c.numero} fica quitado.`, 'Pagar')) {
              acao('pagar_contrato', { p_contrato: c.id }, 'Contrato quitado.');
            }
          },
        }, 'Pagar agora') : null))
      : [el('p', { class: 'texto-suave' }, 'Você ainda não tem contratos.')];

    corpo.replaceChildren(...[cab,
      Number(dados.carteira) < 0 ? el('p', { class: 'banco-alerta' }, `Sua carteira está negativa (${real(dados.carteira)}). Venda ações para cobrir: quando o mercado fechar, o sistema vende por você. Sem ações para vender, é falência.`) : null,
      el('div', { class: 'banco-grade' },
        el('div', { class: 'banco-esq' }, cartaoLimite, novo),
        el('section', { class: 'banco-contratos' }, el('h3', {}, 'Seus contratos'),
          el('div', { class: 'banco-resumo-dividas' }, el('span', {}, 'Dívida total'), el('strong', {}, real(dados.dividas))),
          ...contratos))].filter(Boolean));
  }
  desenhar();
  return janela;
}
