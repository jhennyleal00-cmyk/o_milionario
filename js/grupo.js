// Modo grupo: janela "Enviar dinheiro" para um colega do grupo.
// Fica disponível o tempo todo, inclusive durante os leilões, para ajudar quem está sem dinheiro num lance.
import { rpc } from './db.js';
import { el, real, toast, modal, icone } from './ui.js';
import { foto as fotoDe } from './fotos.js';

// grupo: { id, nome, lider_id, membros: [{ id, nome, foto, bot, eliminado, carteira, patrimonio }] }
export function abrirEnviarDinheiro({ token, grupo, euId, paraId = null, aoEnviar }) {
  if (!grupo) return;
  const eu = grupo.membros.find((m) => m.id === euId);
  const colegas = grupo.membros.filter((m) => m.id !== euId && !m.eliminado);
  if (!eu || !colegas.length) { toast('Não há colegas no seu grupo para receber dinheiro.', 'aviso'); return; }
  const carteira = Math.max(0, Number(eu.carteira) || 0);
  let para = colegas.find((c) => c.id === paraId)?.id || colegas[0].id;

  const lista = el('div', { class: 'enviar-colegas', role: 'radiogroup', 'aria-label': 'Para quem enviar' });
  const campo = el('input', { class: 'campo campo-valor', type: 'number', min: '1', step: '100', inputmode: 'decimal', placeholder: '0', 'aria-label': 'Valor' });
  const resumo = el('p', { class: 'enviar-resumo' });
  const aviso = el('p', { class: 'enviar-aviso', hidden: true });

  const desenharColegas = () => lista.replaceChildren(...colegas.map((c) => el('button', {
    class: 'enviar-colega' + (c.id === para ? ' ativo' : ''), role: 'radio', 'aria-checked': String(c.id === para),
    onclick: () => { para = c.id; desenharColegas(); atualizar(); },
  },
  el('img', { src: fotoDe(c.id, c.foto), alt: '' }),
  el('span', {}, el('strong', {}, c.nome, grupo.lider_id === c.id ? el('em', { class: 'enviar-lider' }, ' · líder') : null),
    el('small', {}, `Carteira ${real(c.carteira)}`)))));

  const valor = () => Math.round((Number(campo.value) || 0) * 100) / 100;
  const atualizar = () => {
    const v = valor();
    const depois = carteira - v;
    resumo.replaceChildren(el('span', {}, 'Sua carteira depois'), el('strong', { class: depois < 0 ? 'negativo' : '' }, real(depois)));
    const semAcoes = !(Number(eu.patrimonio) > 0);
    aviso.hidden = !(v > 0 && depois <= 0 && semAcoes);
    aviso.textContent = 'Se você ficar sem dinheiro e sem ações, o seu grupo inteiro sai do jogo.';
  };
  const somar = (x) => { campo.value = String(Math.min(carteira, valor() + x)); atualizar(); };
  campo.addEventListener('input', atualizar);
  desenharColegas(); atualizar();

  modal({
    titulo: 'Enviar dinheiro', classe: 'modal-enviar',
    conteudo: el('div', { class: 'enviar' },
      el('p', { class: 'texto-suave' }, `Grupo ${grupo.nome}. Você tem ${real(carteira)} na carteira. A transferência aparece no fórum.`),
      lista,
      el('label', { class: 'rotulo', for: 'enviar-valor' }, 'Valor'),
      Object.assign(campo, { id: 'enviar-valor' }),
      el('div', { class: 'enviar-atalhos' },
        ...[1000, 10000, 50000].map((x) => el('button', { class: 'btn btn-mini btn-fantasma', onclick: () => somar(x) }, `+${(x / 1000).toLocaleString('pt-BR')} mil`)),
        el('button', { class: 'btn btn-mini btn-fantasma', onclick: () => { campo.value = String(Math.floor(carteira / 2)); atualizar(); } }, 'Metade')),
      resumo, aviso),
    botoes: [
      { texto: 'Cancelar', classe: 'btn-fantasma' },
      {
        texto: 'Enviar', classe: 'btn-ouro',
        acao: async (fechar) => {
          const v = valor();
          if (!(v >= 1)) { toast('Escolha um valor.', 'aviso'); return; }
          try {
            const r = await rpc('enviar_dinheiro', { p_token: token(), p_para: para, p_valor: v });
            fechar();
            toast(`Você enviou ${real(v)} para ${colegas.find((c) => c.id === para)?.nome}.`, 'ok');
            aoEnviar?.(r);
          } catch (e) { toast(e.message, 'erro'); }
        },
      },
    ],
  });
  setTimeout(() => campo.focus(), 50);
}
