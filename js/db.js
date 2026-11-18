// Conversa com o Supabase. Todo o jogo passa por funções (rpc);
// o tempo real só avisa que algo mudou, e a tela busca de novo.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function rpc(fn, args = {}) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) {
    const msg = (error.message || '').trim();
    if (/fetch|network|Failed/i.test(msg) && !/[áéíóúãõç]/i.test(msg)) {
      throw new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.');
    }
    throw new Error(msg || 'Algo deu errado. Tente de novo.');
  }
  return data;
}

// Avisa (com um pequeno atraso para juntar vários avisos) quando a sala,
// os jogadores ou as empresas da partida mudam.
export function ouvirSala(salaId, aoMudar) {
  let espera = null;
  const avisar = () => { clearTimeout(espera); espera = setTimeout(aoMudar, 250); };
  const canal = sb.channel('sala-' + salaId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'salas', filter: `id=eq.${salaId}` }, avisar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jogadores', filter: `sala_id=eq.${salaId}` }, avisar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'empresas_sala', filter: `sala_id=eq.${salaId}` }, avisar)
    .subscribe();
  return () => { clearTimeout(espera); sb.removeChannel(canal); };
}
